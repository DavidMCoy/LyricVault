import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Loader2, BookmarkPlus, AlertCircle, X } from 'lucide-react';
import { SearchResultItem, Song } from '../types/lyrics';
import { searchLrclib, convertSearchResultToSong } from '../services/lrclib';
import { saveSong, getLocalSongs, db } from '../services/db';
import { SongCard } from './SongCard';
import confetti from 'canvas-confetti';

interface SearchLyricsProps {
  onSelectSong: (song: Song) => void;
  isOnline: boolean;
}

export const SearchLyrics: React.FC<SearchLyricsProps> = ({ onSelectSong, isOnline }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSongIds, setSavedSongIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<SearchResultItem | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load saved song IDs from IndexedDB
  useEffect(() => {
    loadSavedSongIds();
    loadSearchHistory();
  }, []);

  const loadSavedSongIds = async () => {
    const songs = await getLocalSongs();
    setSavedSongIds(new Set(songs.map(s => s.id)));
  };

  const loadSearchHistory = async () => {
    try {
      const history = await db.searchHistory.orderBy('timestamp').reverse().limit(6).toArray();
      setSearchHistory(history.map(h => h.query));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    if (!isOnline) {
      setError('You are currently offline. Please connect to the internet to search LRCLIB or check your saved Library.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save query to history
      await db.searchHistory.add({ query: term, timestamp: Date.now() });
      loadSearchHistory();

      const searchResults = await searchLrclib(term);
      setResults(searchResults);
      if (searchResults.length === 0) {
        setError(`No lyrics found for "${term}". Try searching with "Artist Song Title".`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lyrics from LRCLIB.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSong = async (result: SearchResultItem) => {
    const song = convertSearchResultToSong(result);
    await saveSong(song);
    setSavedSongIds(prev => new Set([...prev, song.id]));

    // Trigger subtle celebratory confetti
    try {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { y: 0.85 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });
    } catch (e) {}
  };

  const handleSaveAll = async () => {
    for (const res of results) {
      const song = convertSearchResultToSong(res);
      await saveSong(song);
    }
    await loadSavedSongIds();
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#10b981', '#38bdf8', '#fbbf24']
      });
    } catch (e) {}
  };

  const quickPicks = ['Bohemian Rhapsody', 'Blinding Lights', 'Hotel California', 'Imagine Dragons', 'Taylor Swift'];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24 animate-fade-in">
      {/* Search Input Box */}
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search song, artist, or lyrics..."
            className="w-full bg-neutral-900 border border-neutral-700/80 focus:border-emerald-500 rounded-2xl py-3.5 pl-11 pr-24 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-lg"
          />
          <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 pointer-events-none" />

          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-12 p-1 text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-emerald-950"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Search History & Quick Picks */}
      {results.length === 0 && !isLoading && (
        <div className="space-y-4 pt-2">
          {searchHistory.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                <span>Recent Searches</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(item);
                      handleSearch(item);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Trending Examples</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPicks.map((pick, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(pick);
                    handleSearch(pick);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-emerald-950/40 border border-neutral-800 hover:border-emerald-700/50 text-xs text-neutral-300 hover:text-emerald-300 transition-all"
                >
                  {pick}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800/80 rounded-2xl p-4 mt-6">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Direct LRCLIB Open Access</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Search millions of synchronized (.LRC) and unsynced songs without an account. 
              Save any song locally to your Android phone to view lyrics completely offline anytime.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-3.5 text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-neutral-900/60 rounded-2xl animate-pulse border border-neutral-800" />
          ))}
        </div>
      )}

      {/* Results Header with Batch Save */}
      {results.length > 0 && !isLoading && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs font-medium text-neutral-400">
            Found <span className="text-emerald-400 font-bold">{results.length}</span> results on LRCLIB
          </p>
          <button
            onClick={handleSaveAll}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save All Offline
          </button>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-2.5">
        {results.map((item) => {
          const isSaved = savedSongIds.has(String(item.id));
          return (
            <div key={item.id} className="relative">
              <SongCard
                song={item}
                isSaved={isSaved}
                onSelect={() => {
                  const songObj = convertSearchResultToSong(item);
                  onSelectSong(songObj);
                }}
                onSave={() => handleSaveSong(item)}
              />
            </div>
          );
        })}
      </div>

      {/* Lyric Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-100 text-sm">{previewItem.trackName}</h3>
                <p className="text-xs text-neutral-400">{previewItem.artistName}</p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed flex-1">
              {previewItem.syncedLyrics || previewItem.plainLyrics || 'No lyrics available.'}
            </div>
            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  handleSaveSong(previewItem);
                  setPreviewItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs flex items-center gap-1.5"
              >
                <BookmarkPlus className="w-4 h-4" /> Save Locally
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
