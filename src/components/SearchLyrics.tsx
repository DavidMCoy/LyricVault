import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Sparkles, Loader2, BookmarkPlus, AlertCircle, X,
  User, Music2, PlusCircle, ArrowUpDown
} from 'lucide-react';
import { SearchResultItem, Song } from '../types/lyrics';
import {
  searchLrclibDetailed,
  expandLrclibSearch,
  convertSearchResultToSong,
  SearchOptions,
} from '../services/lrclib';
import { saveSong, getLocalSongs, db } from '../services/db';
import { SongCard } from './SongCard';
import confetti from 'canvas-confetti';

interface SearchLyricsProps {
  onSelectSong: (song: Song) => void;
  isOnline: boolean;
}

export const SearchLyrics: React.FC<SearchLyricsProps> = ({ onSelectSong, isOnline }) => {
  const [query, setQuery] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [showStructuredFields, setShowStructuredFields] = useState(false);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expansionBatch, setExpansionBatch] = useState(0);
  const [hasMoreBatches, setHasMoreBatches] = useState(true);
  const [lastExpandedAdded, setLastExpandedAdded] = useState<number | null>(null);
  const [activeSearchOpts, setActiveSearchOpts] = useState<SearchOptions>({});

  const [sortByTitle, setSortByTitle] = useState(false);
  const [withinResultsFilter, setWithinResultsFilter] = useState('');

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

  const handleSearch = async (overrideOpts?: SearchOptions) => {
    const opts: SearchOptions = overrideOpts || {
      query: query.trim(),
      artistName: artistFilter.trim(),
      trackName: trackFilter.trim(),
    };

    const hasInput = Boolean(opts.query || opts.artistName || opts.trackName);
    if (!hasInput) return;

    if (!isOnline) {
      setError('You are currently offline. Please connect to the internet to search LRCLIB or check your saved Library.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExpansionBatch(0);
    setHasMoreBatches(true);
    setLastExpandedAdded(null);
    setWithinResultsFilter('');
    setActiveSearchOpts(opts);

    const historyLabel = [opts.artistName, opts.trackName, opts.query].filter(Boolean).join(' — ');

    try {
      if (historyLabel) {
        await db.searchHistory.add({ query: historyLabel, timestamp: Date.now() });
        loadSearchHistory();
      }

      const response = await searchLrclibDetailed(opts);
      setResults(response.results);
      setDuplicatesRemoved(response.duplicatesRemoved);

      if (response.results.length === 0) {
        setError(`No lyrics found for "${historyLabel}". Try adjusting the artist or song title.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lyrics from LRCLIB.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpandMore = async () => {
    if (isExpanding || !isOnline) return;
    setIsExpanding(true);
    setError(null);

    try {
      const { mergedResults, newlyAddedCount, hasMoreBatches: more } = await expandLrclibSearch(
        activeSearchOpts,
        results,
        expansionBatch
      );
      setResults(mergedResults);
      setLastExpandedAdded(newlyAddedCount);
      setExpansionBatch(prev => prev + 1);
      setHasMoreBatches(more);
    } catch (err: any) {
      setError(err.message || 'Failed to load additional songs from LRCLIB.');
    } finally {
      setIsExpanding(false);
    }
  };

  const displayedResults = useMemo(() => {
    let list = [...results];
    const filter = withinResultsFilter.trim().toLowerCase();
    if (filter) {
      list = list.filter(
        item =>
          item.trackName.toLowerCase().includes(filter) ||
          item.artistName.toLowerCase().includes(filter) ||
          (item.albumName || '').toLowerCase().includes(filter)
      );
    }
    if (sortByTitle) {
      list.sort((a, b) => a.trackName.localeCompare(b.trackName));
    }
    return list;
  }, [results, withinResultsFilter, sortByTitle]);

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
    for (const res of displayedResults) {
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

  const quickPicks = ['The Beatles', 'Eagles', 'Queen', 'Fleetwood Mac', 'Led Zeppelin'];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-36 animate-fade-in">
      {/* Search Input Box + Artist/Song Filter Fields */}
      <div className="space-y-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-2.5"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search song, artist, or lyrics..."
              className="w-full bg-neutral-900 border border-neutral-700/80 focus:border-emerald-500 rounded-2xl py-3.5 pl-11 pr-24 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-lg"
            />
            <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 pointer-events-none" />

            {(query || artistFilter || trackFilter) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setArtistFilter('');
                  setTrackFilter('');
                  setResults([]);
                  setLastExpandedAdded(null);
                }}
                className="absolute right-20 p-1.5 text-neutral-400 hover:text-neutral-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || (!query.trim() && !artistFilter.trim() && !trackFilter.trim())}
              className="absolute right-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-emerald-950"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Toggle for Dedicated Artist & Song Title Filter Fields */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowStructuredFields(!showStructuredFields)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              {showStructuredFields
                ? 'Hide Artist / Song Title Filters'
                : 'Search Specifically by Artist or Song Title'}
            </button>
          </div>

          {showStructuredFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3">
              <div className="relative">
                <User className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={artistFilter}
                  onChange={(e) => setArtistFilter(e.target.value)}
                  placeholder="Artist name (e.g. Eagles, Beatles)..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
                />
              </div>
              <div className="relative">
                <Music2 className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                  placeholder="Song title (optional)..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
                />
              </div>
            </div>
          )}
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
                      setArtistFilter('');
                      setTrackFilter('');
                      handleSearch({ query: item });
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
              <span>Popular Artist Catalogs</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPicks.map((pick, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setArtistFilter(pick);
                    setQuery('');
                    setTrackFilter('');
                    setShowStructuredFields(true);
                    handleSearch({ artistName: pick });
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
              <span>Expanded Artist Catalog Search</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Automatically removes duplicate album/remaster versions and pulls multiple batches from LRCLIB so you can browse 50–100+ unique songs per artist.
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

      {/* Results Header with Deduplication Stats, Sort Toggle & Batch Save */}
      {results.length > 0 && !isLoading && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs font-medium text-neutral-300">
                Showing <span className="text-emerald-400 font-bold">{displayedResults.length}</span> unique songs
                {duplicatesRemoved > 0 && (
                  <span className="text-neutral-500 text-[11px] ml-1.5">
                    ({duplicatesRemoved} duplicate remasters hidden)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSortByTitle(!sortByTitle)}
                className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  sortByTitle
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortByTitle ? 'Sorted A–Z' : 'Sort A–Z'}
              </button>

              <button
                onClick={handleSaveAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save All ({displayedResults.length})
              </button>
            </div>
          </div>

          {results.length > 10 && (
            <div className="relative">
              <input
                type="text"
                value={withinResultsFilter}
                onChange={(e) => setWithinResultsFilter(e.target.value)}
                placeholder={`Filter within these ${results.length} results by song title...`}
                className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl py-2 pl-3 pr-8 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              {withinResultsFilter && (
                <button
                  onClick={() => setWithinResultsFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-2.5">
        {displayedResults.map((item) => {
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

      {/* Load More / Expand Catalog Button */}
      {results.length > 0 && !isLoading && (
        <div className="pt-2 space-y-2 text-center">
          {lastExpandedAdded !== null && (
            <p className="text-xs text-emerald-400 font-semibold">
              {lastExpandedAdded > 0
                ? `+${lastExpandedAdded} additional unique songs added!`
                : 'No additional new songs found in this batch — try clicking again for the next letter range.'}
            </p>
          )}

          {hasMoreBatches ? (
            <button
              onClick={handleExpandMore}
              disabled={isExpanding}
              className="w-full py-3.5 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md"
            >
              {isExpanding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Searching LRCLIB for more songs...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>
                    Find More Songs on LRCLIB (Batch {expansionBatch + 1} of 4)
                  </span>
                </>
              )}
            </button>
          ) : (
            <p className="text-xs text-neutral-500 py-2">
              All A–Z catalog batches have been searched ({results.length} unique songs found).
            </p>
          )}
        </div>
      )}

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
