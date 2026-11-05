import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ListMusic, Trash2, X, Check, Play, Users, Sparkles } from 'lucide-react';
import { Playlist, Song } from '../types/lyrics';
import { db, importSpotifyTop100Data } from '../services/db';
import {
  getArtistFingerprint,
  canonicalizeArtistDisplayName,
  computeArtistSortName,
  computeTrackSortName,
} from '../utils/artistNormalizer';
import confetti from 'canvas-confetti';

interface PlaylistsViewProps {
  onSelectSong: (song: Song) => void;
  onClose?: () => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ onSelectSong }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSyncingSpotify, setIsSyncingSpotify] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    const list = await db.playlists.orderBy('updatedAt').reverse().toArray();
    setPlaylists(list);
  };

  const handleImportSpotify = async () => {
    setIsSyncingSpotify(true);
    try {
      const count = await importSpotifyTop100Data();
      await loadPlaylists();
      const spotifyPl = await db.playlists.get('pl-spotify-top100');
      if (spotifyPl) {
        await handleSelectPlaylist(spotifyPl);
      }
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#38bdf8', '#fbbf24']
        });
      } catch (e) {}
      alert(`Imported ${count} songs from Spotify Top 100 Playlist!`);
    } catch (err: any) {
      alert('Failed to import: ' + err.message);
    } finally {
      setIsSyncingSpotify(false);
    }
  };

  const handleSelectPlaylist = async (pl: Playlist) => {
    setActivePlaylist(pl);
    const songs = await db.songs.where('id').anyOf(pl.songIds).toArray();
    // Maintain order in songIds
    const ordered = pl.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[];
    setPlaylistSongs(ordered);
  };

  // Group playlist songs by canonical Artist Fingerprint and sort by dedicated Sort Metadata Tags
  const groupedPlaylistSongs = useMemo(() => {
    const map = new Map<string, { sortName: string; displayName: string; songs: Song[] }>();
    for (const song of playlistSongs) {
      const fp = getArtistFingerprint(song.artistName);
      const displayName = canonicalizeArtistDisplayName(song.artistName);
      const sortName = computeArtistSortName(displayName, song.artistSortName);
      if (!map.has(fp)) {
        map.set(fp, { sortName, displayName, songs: [] });
      }
      map.get(fp)!.songs.push(song);
    }

    // Sort songs inside artist by Track Sort Tag (A-Z)
    for (const group of map.values()) {
      group.songs.sort((a, b) => {
        const sortA = computeTrackSortName(a.trackName, a.trackSortName);
        const sortB = computeTrackSortName(b.trackName, b.trackSortName);
        return sortA.localeCompare(sortB, undefined, { sensitivity: 'base' });
      });
    }

    // Sort artists alphabetically by Artist Sort Tag (A-Z)
    return Array.from(map.values())
      .sort((a, b) => a.sortName.localeCompare(b.sortName, undefined, { sensitivity: 'base' }))
      .map((g) => [g.sortName, g.songs] as [string, Song[]]);
  }, [playlistSongs]);

  const handleCreatePlaylist = async () => {
    if (!newName.trim()) return;

    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      songIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: '#10b981',
    };

    await db.playlists.add(newPl);
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
    await loadPlaylists();
  };

  const handleDeletePlaylist = async (id: string) => {
    if (window.confirm('Delete this playlist? (Songs will remain in your library)')) {
      await db.playlists.delete(id);
      if (activePlaylist?.id === id) {
        setActivePlaylist(null);
      }
      await loadPlaylists();
    }
  };

  const handleRemoveSongFromPlaylist = async (songId: string) => {
    if (!activePlaylist) return;
    const updatedIds = activePlaylist.songIds.filter(id => id !== songId);
    await db.playlists.update(activePlaylist.id, {
      songIds: updatedIds,
      updatedAt: Date.now(),
    });
    const updated = { ...activePlaylist, songIds: updatedIds };
    setActivePlaylist(updated);
    setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
    loadPlaylists();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-emerald-400" />
          Setlists & Playlists
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportSpotify}
            disabled={isSyncingSpotify}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-colors"
            title="Import Spotify Top 100 Playlist"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            {isSyncingSpotify ? 'Syncing...' : 'Sync Spotify Top 100'}
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1 active:scale-95 shadow-md shadow-emerald-950"
          >
            <Plus className="w-3.5 h-3.5" />
            New Setlist
          </button>
        </div>
      </div>

      {/* Create Playlist Form */}
      {isCreating && (
        <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
          <h3 className="text-xs font-bold text-neutral-200">Create New Setlist / Playlist</h3>
          <input
            type="text"
            placeholder="Playlist name (e.g. Acoustic Gig Set)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlaylist}
              disabled={!newName.trim()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 disabled:opacity-50 text-black font-semibold text-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      {/* Playlists Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => handleSelectPlaylist(pl)}
            className={`cursor-pointer rounded-2xl p-4 border transition-all active:scale-98 ${
              activePlaylist?.id === pl.id
                ? 'bg-neutral-850 border-emerald-500 shadow-md shadow-emerald-950/20'
                : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <h4 className="font-bold text-sm text-neutral-100 break-words leading-snug">{pl.name}</h4>
                {pl.description && (
                  <p className="text-xs text-neutral-400 mt-1 break-words leading-relaxed">{pl.description}</p>
                )}
                <span className="inline-block text-[11px] font-medium text-emerald-400 mt-2">
                  {pl.songIds.length} {pl.songIds.length === 1 ? 'song' : 'songs'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlaylist(pl.id);
                }}
                className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Playlist Songs (Grouped by Artist -> Song Title) */}
      {activePlaylist && (
        <div className="mt-6 space-y-4 animate-fade-in border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h3 className="text-sm font-bold text-neutral-100 break-words flex items-center gap-2">
                <span>{activePlaylist.name}</span>
                <span className="text-xs text-neutral-400 font-normal">({playlistSongs.length} songs)</span>
              </h3>
            </div>
            {playlistSongs.length > 0 && (
              <button
                onClick={() => onSelectSong(playlistSongs[0])}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-950 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-black" /> Play Setlist
              </button>
            )}
          </div>

          {playlistSongs.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">
              No songs in this setlist yet. Go to your Library to add songs!
            </p>
          ) : (
            <div className="space-y-3">
              {groupedPlaylistSongs.map(([artist, songs]) => (
                <div key={artist} className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-neutral-200 break-words">{artist}</span>
                    <span className="text-[10px] text-neutral-500">({songs.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {songs.map((song) => (
                      <div
                        key={song.id}
                        className="bg-neutral-950/70 hover:bg-neutral-850 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div
                          onClick={() => onSelectSong(song)}
                          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-neutral-100 break-words leading-snug">
                              {song.trackName}
                            </p>
                            {song.albumName && (
                              <p className="text-[10px] text-neutral-500 break-words mt-0.5">
                                {song.albumName}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSongFromPlaylist(song.id)}
                          className="p-1 text-neutral-500 hover:text-red-400 shrink-0"
                          title="Remove from playlist"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface AddToPlaylistModalProps {
  song: Song | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, onClose }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    db.playlists.toArray().then(setPlaylists);
  }, []);

  if (!song) return null;

  const handleToggleSongInPlaylist = async (pl: Playlist) => {
    const exists = pl.songIds.includes(song.id);
    const newIds = exists ? pl.songIds.filter(id => id !== song.id) : [...pl.songIds, song.id];
    await db.playlists.update(pl.id, { songIds: newIds, updatedAt: Date.now() });
    setPlaylists(await db.playlists.toArray());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-neutral-100 text-sm">Add to Setlist</h3>
            <p className="text-xs text-neutral-400 break-words mt-0.5 leading-snug">
              {song.trackName} <span className="text-neutral-500">• {song.artistName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-200 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {playlists.map((pl) => {
            const isAdded = pl.songIds.includes(song.id);
            return (
              <button
                key={pl.id}
                onClick={() => handleToggleSongInPlaylist(pl)}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  isAdded
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span className="break-words font-medium mr-2">{pl.name}</span>
                {isAdded && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-500 text-black font-bold rounded-xl text-xs active:scale-98"
        >
          Done
        </button>
      </div>
    </div>
  );
};
