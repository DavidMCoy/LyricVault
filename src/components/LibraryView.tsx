import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Star, Music, FileUp, FolderPlus, 
  Users, List, ChevronDown, ChevronRight, BookOpen, X
} from 'lucide-react';
import { Song } from '../types/lyrics';
import { searchLocalSongs, deleteSong, toggleFavorite } from '../services/db';
import { importLrcFile } from '../utils/exportImport';
import {
  getArtistFingerprint,
  canonicalizeArtistDisplayName,
  computeArtistSortName,
  computeTrackSortName,
  getSortBucketLetter,
} from '../utils/artistNormalizer';
import { SongCard } from './SongCard';

interface LibraryViewProps {
  onSelectSong: (song: Song) => void;
  onEditSong: (song: Song) => void;
  onCreateNew: () => void;
  onOpenPlaylists: () => void;
  onAddToPlaylist: (song: Song) => void;
  openSongs?: Song[];
  activeSongId?: string;
  onCloseOpenSong?: (songId: string, e: React.MouseEvent) => void;
}

type ViewMode = 'grouped' | 'flat';

const ALPHABET_TABS = [
  'ALL', '★', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'
];

const TAB_COLORS = [
  'border-amber-500/80 text-amber-300',
  'border-emerald-500/80 text-emerald-300',
  'border-sky-500/80 text-sky-300',
  'border-rose-500/80 text-rose-300',
  'border-violet-500/80 text-violet-300',
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectSong,
  onEditSong,
  onCreateNew,
  onOpenPlaylists,
  onAddToPlaylist,
  openSongs = [],
  activeSongId,
  onCloseOpenSong,
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSongs();
  }, [searchQuery]);

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      const list = await searchLocalSongs(searchQuery);
      setSongs(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get the effective sort tag for a song (either by Artist Sort Tag or Track Sort Tag)
  const getSongSortTag = (song: Song, mode: ViewMode): string => {
    if (mode === 'grouped') {
      return computeArtistSortName(song.artistName, song.artistSortName);
    }
    return computeTrackSortName(song.trackName, song.trackSortName);
  };

  // Determine which alphabet letters exist in current song list using dedicated sort metadata tags
  const availableLetters = useMemo(() => {
    const set = new Set<string>(['ALL']);
    if (songs.some(s => s.isFavorite)) set.add('★');
    for (const s of songs) {
      const sortTag = getSongSortTag(s, viewMode);
      set.add(getSortBucketLetter(sortTag));
    }
    return set;
  }, [songs, viewMode]);

  // Filter songs by selected notebook tab (ALL, ★, A-Z, #) using sort metadata tag
  const filteredSongs = useMemo(() => {
    if (activeLetter === 'ALL') return songs;
    if (activeLetter === '★') return songs.filter(s => s.isFavorite);
    return songs.filter(s => {
      const sortTag = getSongSortTag(s, viewMode);
      return getSortBucketLetter(sortTag) === activeLetter;
    });
  }, [songs, activeLetter, viewMode]);

  // Group songs by normalized Artist Fingerprint (so AC DC, Ac-Dc, AC/DC merge into 1 band)
  // and sort by dedicated `artistSortName` (so "The Beatles" sorts under "B" as "Beatles, The")
  const artistGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        fingerprint: string;
        displayName: string;
        sortName: string;
        songs: Song[];
      }
    >();

    for (const song of filteredSongs) {
      const fp = getArtistFingerprint(song.artistName);
      const canonicalDisplay = canonicalizeArtistDisplayName(song.artistName);
      const sortName = computeArtistSortName(canonicalDisplay, song.artistSortName);

      if (!map.has(fp)) {
        map.set(fp, {
          fingerprint: fp,
          displayName: canonicalDisplay,
          sortName,
          songs: [],
        });
      }
      map.get(fp)!.songs.push(song);
    }

    // Sort songs inside each artist by dedicated Track Sort Tag (A-Z)
    for (const group of map.values()) {
      group.songs.sort((a, b) => {
        const sortA = computeTrackSortName(a.trackName, a.trackSortName);
        const sortB = computeTrackSortName(b.trackName, b.trackSortName);
        return sortA.localeCompare(sortB, undefined, { sensitivity: 'base' });
      });
    }

    // Sort artist groups alphabetically by dedicated `sortName` (A-Z)
    const sortedGroups = Array.from(map.values()).sort((a, b) =>
      a.sortName.localeCompare(b.sortName, undefined, { sensitivity: 'base' })
    );

    return sortedGroups.map((g) => ({
      key: g.fingerprint,
      artist: g.displayName,
      sortName: g.sortName,
      songs: g.songs,
      count: g.songs.length,
    }));
  }, [filteredSongs]);

  // Flat list sorted by dedicated Track Sort Tag (`trackSortName`)
  const flatSortedSongs = useMemo(() => {
    return [...filteredSongs].sort((a, b) => {
      const sortA = computeTrackSortName(a.trackName, a.trackSortName);
      const sortB = computeTrackSortName(b.trackName, b.trackSortName);
      return sortA.localeCompare(sortB, undefined, { sensitivity: 'base' });
    });
  }, [filteredSongs]);

  const toggleArtistExpand = (artistKey: string) => {
    setExpandedArtists(prev => {
      const next = new Set(prev);
      if (next.has(artistKey)) {
        next.delete(artistKey);
      } else {
        next.add(artistKey);
      }
      return next;
    });
  };

  const isAnyVisibleExpanded = useMemo(
    () => artistGroups.some((g) => expandedArtists.has(g.key)),
    [artistGroups, expandedArtists]
  );

  const handleToggleExpandAll = () => {
    if (isAnyVisibleExpanded) {
      setExpandedArtists(new Set());
    } else {
      setExpandedArtists(new Set(artistGroups.map(g => g.key)));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this song from your offline notebook?')) {
      await deleteSong(id);
      loadSongs();
    }
  };

  const handleToggleFav = async (id: string) => {
    await toggleFavorite(id);
    loadSongs();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importLrcFile(file);
      await loadSongs();
      onSelectSong(imported);
    } catch (err: any) {
      alert('Failed to import file: ' + err.message);
    }
  };

  return (
    <div className="p-3 sm:p-4 max-w-3xl mx-auto space-y-3.5 pb-36 animate-fade-in">
      {/* Open Song Notebook Tabs Strip (Quick Jump to Open Lyric Sheets) */}
      {openSongs.length > 0 && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-amber-400" />
              Open Lyric Tabs ({openSongs.length})
            </span>
            <span className="text-neutral-500">Tap to open sheet</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {openSongs.map((s, idx) => {
              const isCurrent = s.id === activeSongId;
              const colorClass = TAB_COLORS[idx % TAB_COLORS.length];
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSong(s)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl rounded-b-md border-t-2 border-x border-b cursor-pointer shrink-0 max-w-[200px] transition-all ${
                    isCurrent
                      ? `bg-neutral-800 border-neutral-700 ${colorClass} font-bold shadow-sm`
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                  }`}
                >
                  <span className="text-xs truncate">{s.trackName}</span>
                  {onCloseOpenSong && (
                    <button
                      onClick={(e) => onCloseOpenSong(s.id, e)}
                      className="p-0.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-700/50"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 active:scale-95 transition-all">
            <FileUp className="w-3.5 h-3.5 text-amber-400" />
            Import Text / .LRC
            <input
              type="file"
              accept=".txt,.lrc"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={onCreateNew}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-amber-950/50"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Lyric Sheet
          </button>
        </div>

        <button
          onClick={onOpenPlaylists}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-amber-400 flex items-center gap-1.5"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          Setlists
        </button>
      </div>

      {/* Local Search Bar & View Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter notebook by song, artist, or lyrics..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-9 pr-8 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grouped by Artist vs By Song Title Toggle */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 shrink-0">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              viewMode === 'grouped' ? 'bg-amber-500 text-black font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Group by Artist"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Artists</span>
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              viewMode === 'flat' ? 'bg-amber-500 text-black font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Alphabetical Song List"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Songs</span>
          </button>
        </div>
      </div>

      {/* Notebook Binder Layout: Main Content + Right-Hand A-Z Index Tabs */}
      <div className="flex gap-2 items-start">
        {/* Left/Center Notebook Page Area */}
        <div className="flex-1 min-w-0 bg-neutral-925/60 border border-neutral-800/90 rounded-2xl p-3 shadow-inner">
          {/* Active Divider Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs shadow-sm">
                {activeLetter === 'ALL' ? 'ALL' : activeLetter === '★' ? '★ FAVORITES' : `TAB ${activeLetter}`}
              </span>
              <span className="text-xs text-neutral-400">
                {viewMode === 'grouped' ? (
                  <>
                    <strong className="text-neutral-200">{artistGroups.length}</strong> Artists •{' '}
                    <strong className="text-neutral-200">{filteredSongs.length}</strong> Songs
                  </>
                ) : (
                  <>
                    <strong className="text-neutral-200">{flatSortedSongs.length}</strong> Songs
                  </>
                )}
              </span>
            </div>

            {viewMode === 'grouped' && artistGroups.length > 0 && (
              <button
                onClick={handleToggleExpandAll}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold active:scale-95 transition-all"
              >
                {isAnyVisibleExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredSongs.length === 0 && !isLoading ? (
            <div className="py-10 text-center space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-neutral-800/80 flex items-center justify-center mx-auto text-neutral-400">
                <Music className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-neutral-200">
                {activeLetter !== 'ALL' ? `No entries under "${activeLetter}"` : 'No songs found'}
              </h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                {activeLetter !== 'ALL'
                  ? 'Select "ALL" or another letter tab on the right.'
                  : 'Use Look Up to download song lyrics or create a new lyric sheet.'}
              </p>
              {activeLetter !== 'ALL' && (
                <button
                  onClick={() => setActiveLetter('ALL')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-amber-400"
                >
                  Show All Songs
                </button>
              )}
            </div>
          ) : viewMode === 'grouped' ? (
            /* Grouped by Canonical Artist -> Sorted by Dedicated Sort Metadata Tag */
            <div className="space-y-2.5">
              {artistGroups.map((group) => {
                const isExpanded = expandedArtists.has(group.key);
                const initialLetter = getSortBucketLetter(group.sortName);
                const hasCustomSortLabel =
                  group.sortName.toLowerCase() !== group.artist.toLowerCase();

                return (
                  <div
                    key={group.key}
                    className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl overflow-hidden shadow-sm"
                  >
                    {/* Artist Divider Tab Header */}
                    <div
                      onClick={() => toggleArtistExpand(group.key)}
                      className={`p-3 bg-neutral-900 hover:bg-neutral-850 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isExpanded ? 'border-b border-neutral-800/60 bg-neutral-850' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {initialLetter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-neutral-100 break-words leading-tight">
                              {group.sortName}
                            </h3>
                            {hasCustomSortLabel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 font-medium">
                                {group.artist}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {group.count} {group.count === 1 ? 'lyric sheet' : 'lyric sheets'}
                          </p>
                        </div>
                      </div>

                      <div className="p-1 text-neutral-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                    </div>

                    {/* Songs for this artist sorted by Track Sort Tag */}
                    {isExpanded && (
                      <div className="p-2.5 space-y-2 bg-neutral-950/50 animate-fade-in">
                        {group.songs.map((song) => (
                          <SongCard
                            key={song.id}
                            song={song}
                            isSaved={true}
                            isFavorite={song.isFavorite}
                            onSelect={() => onSelectSong(song)}
                            onToggleFavorite={() => handleToggleFav(song.id)}
                            onDelete={() => handleDelete(song.id)}
                            onEdit={() => onEditSong(song)}
                            onAddToPlaylist={() => onAddToPlaylist(song)}
                            showSaveButton={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat Alphabetical List by Song Sort Tag */
            <div className="space-y-2.5">
              {flatSortedSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isSaved={true}
                  isFavorite={song.isFavorite}
                  onSelect={() => onSelectSong(song)}
                  onToggleFavorite={() => handleToggleFav(song.id)}
                  onDelete={() => handleDelete(song.id)}
                  onEdit={() => onEditSong(song)}
                  onAddToPlaylist={() => onAddToPlaylist(song)}
                  showSaveButton={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right-Side Physical Address Book / Binder A–Z Index Tabs */}
        <div className="flex flex-col gap-0.5 sticky top-24 z-20 select-none">
          {ALPHABET_TABS.map((tab) => {
            const isSelected = activeLetter === tab;
            const hasItems = availableLetters.has(tab);
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveLetter(tab);
                  setExpandedArtists(new Set());
                }}
                disabled={!hasItems && tab !== 'ALL' && tab !== '★'}
                className={`w-7 sm:w-8 h-6 rounded-r-lg border-y border-r text-[10px] font-extrabold flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-400 -ml-1 pr-1 shadow-md scale-105 z-10'
                    : hasItems
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                    : 'bg-neutral-950/40 text-neutral-700 border-neutral-900 cursor-default'
                }`}
                title={tab === '★' ? 'Favorites' : `Section ${tab}`}
              >
                {tab === '★' ? <Star className="w-3 h-3 fill-current" /> : tab}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
