import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Star, Radio, Music, FileUp, FolderPlus, 
  Users, List, ChevronDown, ChevronRight
} from 'lucide-react';
import { Song } from '../types/lyrics';
import { searchLocalSongs, deleteSong, toggleFavorite } from '../services/db';
import { importLrcFile } from '../utils/exportImport';
import { SongCard } from './SongCard';

interface LibraryViewProps {
  onSelectSong: (song: Song) => void;
  onEditSong: (song: Song) => void;
  onCreateNew: () => void;
  onOpenPlaylists: () => void;
  onAddToPlaylist: (song: Song) => void;
}

type FilterTab = 'all' | 'synced' | 'favorites' | 'audio';
type ViewMode = 'grouped' | 'flat';

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectSong,
  onEditSong,
  onCreateNew,
  onOpenPlaylists,
  onAddToPlaylist,
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSongs();
  }, [searchQuery, filterTab]);

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      let list = await searchLocalSongs(searchQuery);

      if (filterTab === 'synced') {
        list = list.filter(s => Boolean(s.syncedLyrics && s.syncedLyrics.trim().length > 0));
      } else if (filterTab === 'favorites') {
        list = list.filter(s => s.isFavorite);
      } else if (filterTab === 'audio') {
        list = list.filter(s => Boolean(s.audioFileBlobKey));
      }

      setSongs(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Group songs by Artist and sort songs within each artist alphabetically by Song Title
  const artistGroups = useMemo(() => {
    const map = new Map<string, Song[]>();

    for (const song of songs) {
      const artist = (song.artistName || 'Unknown Artist').trim();
      if (!map.has(artist)) {
        map.set(artist, []);
      }
      map.get(artist)!.push(song);
    }

    // Sort songs inside each artist by Song Title (A-Z)
    for (const [, artistSongList] of map.entries()) {
      artistSongList.sort((a, b) => a.trackName.localeCompare(b.trackName, undefined, { sensitivity: 'base' }));
    }

    // Sort artists alphabetically (A-Z)
    const sortedEntries = Array.from(map.entries()).sort((a, b) => 
      a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })
    );

    return sortedEntries.map(([artist, artistSongs]) => ({
      artist,
      songs: artistSongs,
      count: artistSongs.length,
      syncedCount: artistSongs.filter(s => Boolean(s.syncedLyrics)).length,
    }));
  }, [songs]);

  // Flat list sorted by Track Title
  const flatSortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => a.trackName.localeCompare(b.trackName, undefined, { sensitivity: 'base' }));
  }, [songs]);

  const toggleArtistExpand = (artist: string) => {
    setExpandedArtists(prev => {
      const next = new Set(prev);
      if (next.has(artist)) {
        next.delete(artist);
      } else {
        next.add(artist);
      }
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (expandedArtists.size > 0) {
      setExpandedArtists(new Set());
    } else {
      setExpandedArtists(new Set(artistGroups.map(g => g.artist)));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this song from offline storage?')) {
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
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-28 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 active:scale-95 transition-all">
            <FileUp className="w-3.5 h-3.5 text-blue-400" />
            Import .LRC
            <input
              type="file"
              accept=".lrc,.txt"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={onCreateNew}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-950"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Lyric
          </button>
        </div>

        <button
          onClick={onOpenPlaylists}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-emerald-400 flex items-center gap-1.5"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          Playlists
        </button>
      </div>

      {/* Local Search Bar & View Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by song, artist, album..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
        </div>

        {/* Grouped by Artist vs Flat Toggle */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('grouped')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grouped' ? 'bg-emerald-500 text-black font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Group by Artist"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'flat' ? 'bg-emerald-500 text-black font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Alphabetical Song List"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
            filterTab === 'all'
              ? 'bg-emerald-500 text-black font-bold'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          All ({songs.length})
        </button>

        <button
          onClick={() => setFilterTab('synced')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
            filterTab === 'synced'
              ? 'bg-emerald-500 text-black font-bold'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <Radio className="w-3 h-3" /> Synced LRC
        </button>

        <button
          onClick={() => setFilterTab('favorites')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
            filterTab === 'favorites'
              ? 'bg-emerald-500 text-black font-bold'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Favorites
        </button>

        <button
          onClick={() => setFilterTab('audio')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
            filterTab === 'audio'
              ? 'bg-emerald-500 text-black font-bold'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <Music className="w-3 h-3 text-blue-400" /> Audio Linked
        </button>
      </div>

      {/* Empty State */}
      {songs.length === 0 && !isLoading ? (
        <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Music className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-neutral-200">No songs found</h4>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Search LRCLIB to save lyrics offline or import a .lrc file.
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Artist -> Song Title */
        <div className="space-y-3">
          <div className="text-xs text-neutral-400 px-1 flex items-center justify-between">
            <span>
              <strong className="text-neutral-200">{artistGroups.length}</strong> Artists • <strong className="text-neutral-200">{songs.length}</strong> Songs
            </span>
            <button
              onClick={handleToggleExpandAll}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold active:scale-95 transition-all"
            >
              {expandedArtists.size > 0 ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          {artistGroups.map((group) => {
            const isExpanded = expandedArtists.has(group.artist);
            const initialLetter = group.artist.charAt(0).toUpperCase();

            return (
              <div key={group.artist} className="bg-neutral-925/80 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-sm">
                {/* Artist Header */}
                <div
                  onClick={() => toggleArtistExpand(group.artist)}
                  className={`p-3 bg-neutral-900 hover:bg-neutral-850 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isExpanded ? 'border-b border-neutral-800/60 bg-neutral-850' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-black font-bold text-xs flex items-center justify-center shrink-0 shadow">
                      {initialLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-neutral-100 break-words leading-tight">
                        {group.artist}
                      </h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {group.count} {group.count === 1 ? 'song' : 'songs'}
                        {group.syncedCount > 0 ? ` • ${group.syncedCount} synced` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 text-neutral-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Songs for this artist sorted by Song Title */}
                {isExpanded && (
                  <div className="p-2.5 space-y-2 bg-neutral-950/40 animate-fade-in">
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
        /* Flat Alphabetical List by Song Title */
        <div className="space-y-2.5">
          <div className="text-xs text-neutral-400 px-1">
            Showing <strong className="text-neutral-200">{flatSortedSongs.length}</strong> songs sorted by Title (A-Z)
          </div>
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
  );
};
