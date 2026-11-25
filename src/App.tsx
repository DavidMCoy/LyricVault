import React, { useState, useEffect } from 'react';
import { NavTab, BottomNavigation, AppHeader } from './components/Navigation';
import { SearchLyrics } from './components/SearchLyrics';
import { LibraryView } from './components/LibraryView';
import { LyricsDisplay } from './components/LyricsDisplay';
import { PlaylistsView, AddToPlaylistModal } from './components/PlaylistModal';
import { LrcEditor } from './components/LrcEditor';
import { SettingsView } from './components/SettingsView';
import { Song } from './types/lyrics';
import { initDatabaseDefaults, getLocalSongs } from './services/db';

const OPEN_TABS_STORAGE_KEY = 'lyricvault_open_song_ids_v1';
const ACTIVE_TAB_STORAGE_KEY = 'lyricvault_active_song_id_v1';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('library');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [openSongs, setOpenSongs] = useState<Song[]>([]);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [songForPlaylist, setSongForPlaylist] = useState<Song | null>(null);

  // Initialize offline IndexedDB defaults and restore open binder tabs from localStorage
  useEffect(() => {
    initDatabaseDefaults().then(async () => {
      const songs = await getLocalSongs();
      if (songs.length > 0) {
        const songById = new Map(songs.map((s) => [s.id, s]));
        let restoredOpen: Song[] = [];
        try {
          const rawIds = localStorage.getItem(OPEN_TABS_STORAGE_KEY);
          if (rawIds) {
            const parsedIds: string[] = JSON.parse(rawIds);
            if (Array.isArray(parsedIds)) {
              restoredOpen = parsedIds
                .map((id) => songById.get(id))
                .filter((s): s is Song => Boolean(s));
            }
          }
        } catch (e) {}

        if (restoredOpen.length === 0) {
          restoredOpen = [songs[0]];
        }

        const savedActiveId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        const restoredActive =
          (savedActiveId && restoredOpen.find((s) => s.id === savedActiveId)) ||
          restoredOpen[0];

        setOpenSongs(restoredOpen);
        setActiveSong(restoredActive || null);
      }
      setIsHydrated(true);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist open binder tab IDs and active song ID across app restarts
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        OPEN_TABS_STORAGE_KEY,
        JSON.stringify(openSongs.map((s) => s.id))
      );
      if (activeSong) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeSong.id);
      } else {
        localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
      }
    } catch (e) {}
  }, [openSongs, activeSong, isHydrated]);

  const handleSelectSong = (song: Song) => {
    setOpenSongs((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      if (exists) {
        return prev.map((s) => (s.id === song.id ? song : s));
      }
      // Keep up to 15 open tabs
      return [...prev.slice(-14), song];
    });
    setActiveSong(song);
    setCurrentTab('player');
  };

  const handleOpenSetlistAsTabs = (songsToOpen: Song[]) => {
    if (!songsToOpen || songsToOpen.length === 0) return;
    const capped = songsToOpen.slice(0, 20);
    setOpenSongs(capped);
    setActiveSong(capped[0]);
    setCurrentTab('player');
  };

  const handleUpdateSongInMemory = (updated: Song) => {
    setActiveSong((prev) => (prev && prev.id === updated.id ? updated : prev));
    setOpenSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCloseOpenSong = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenSongs((prev) => {
      const remaining = prev.filter((s) => s.id !== songId);
      if (activeSong?.id === songId) {
        setActiveSong(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
      return remaining;
    });
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setIsEditorOpen(true);
  };

  const handleCreateNewSong = () => {
    setEditingSong(null);
    setIsEditorOpen(true);
  };

  const handleSaveEditorSuccess = (savedSong: Song) => {
    setIsEditorOpen(false);
    handleSelectSong(savedSong);
  };

  const getHeaderTitle = (): string => {
    if (isEditorOpen) return 'Lyric Sheet Editor';
    switch (currentTab) {
      case 'search': return 'Look Up Lyrics';
      case 'library': return 'LyricVault Notebook';
      case 'playlists': return 'Setlists';
      case 'player': return 'Lyric Notebook';
      case 'settings': return 'App Settings';
      default: return 'LyricVault';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* App Header (Hidden when viewing lyric sheet for maximum space) */}
      {currentTab !== 'player' && !isEditorOpen && (
        <AppHeader
          title={getHeaderTitle()}
          isOnline={isOnline}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {isEditorOpen ? (
          <LrcEditor
            initialSong={editingSong}
            onSaveSuccess={handleSaveEditorSuccess}
            onCancel={() => setIsEditorOpen(false)}
          />
        ) : (
          <>
            {currentTab === 'search' && (
              <SearchLyrics
                onSelectSong={handleSelectSong}
                isOnline={isOnline}
              />
            )}

            {currentTab === 'library' && (
              <LibraryView
                onSelectSong={handleSelectSong}
                onEditSong={handleEditSong}
                onCreateNew={handleCreateNewSong}
                onOpenPlaylists={() => setCurrentTab('playlists')}
                onAddToPlaylist={(song) => setSongForPlaylist(song)}
                openSongs={openSongs}
                activeSongId={activeSong?.id}
                onCloseOpenSong={handleCloseOpenSong}
              />
            )}

            {currentTab === 'playlists' && (
              <PlaylistsView
                onSelectSong={handleSelectSong}
                onOpenSetlistAsTabs={handleOpenSetlistAsTabs}
              />
            )}

            {currentTab === 'player' && (
              <LyricsDisplay
                song={activeSong}
                openSongs={openSongs}
                onSelectOpenSong={(song) => setActiveSong(song)}
                onCloseOpenSong={handleCloseOpenSong}
                onBack={() => setCurrentTab('library')}
                onEditSong={handleEditSong}
                onUpdateSong={handleUpdateSongInMemory}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView />
            )}
          </>
        )}
      </main>

      {/* Add To Playlist Modal */}
      {songForPlaylist && (
        <AddToPlaylistModal
          song={songForPlaylist}
          onClose={() => setSongForPlaylist(null)}
        />
      )}

      {/* Bottom Navigation */}
      {!isEditorOpen && (
        <BottomNavigation
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isOnline={isOnline}
          hasActiveSong={Boolean(activeSong)}
          activeSongTitle={activeSong?.trackName}
          openTabsCount={openSongs.length}
        />
      )}
    </div>
  );
}

export default App;
