import { useState, useEffect } from 'react';
import { NavTab, BottomNavigation, AppHeader } from './components/Navigation';
import { SearchLyrics } from './components/SearchLyrics';
import { LibraryView } from './components/LibraryView';
import { LyricsDisplay } from './components/LyricsDisplay';
import { PlaylistsView, AddToPlaylistModal } from './components/PlaylistModal';
import { LrcEditor } from './components/LrcEditor';
import { SettingsView } from './components/SettingsView';
import { Song } from './types/lyrics';
import { initDatabaseDefaults, getLocalSongs } from './services/db';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('library');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [songForPlaylist, setSongForPlaylist] = useState<Song | null>(null);

  // Initialize offline IndexedDB defaults
  useEffect(() => {
    initDatabaseDefaults().then(async () => {
      const songs = await getLocalSongs();
      if (songs.length > 0 && !activeSong) {
        setActiveSong(songs[0]);
      }
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

  const handleSelectSong = (song: Song) => {
    setActiveSong(song);
    setCurrentTab('player');
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
    setActiveSong(savedSong);
    setCurrentTab('player');
  };

  const getHeaderTitle = (): string => {
    if (isEditorOpen) return 'Lyric Studio';
    switch (currentTab) {
      case 'search': return 'LRCLIB Search';
      case 'library': return 'Offline Vault';
      case 'playlists': return 'Setlists';
      case 'player': return 'Now Playing';
      case 'settings': return 'App Settings';
      default: return 'LyricVault';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* App Header (Hidden when viewing lyrics player for immersion) */}
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
              />
            )}

            {currentTab === 'playlists' && (
              <PlaylistsView
                onSelectSong={handleSelectSong}
              />
            )}

            {currentTab === 'player' && (
              <LyricsDisplay
                song={activeSong}
                onBack={() => setCurrentTab('library')}
                onEditSong={handleEditSong}
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
        />
      )}
    </div>
  );
}

export default App;
