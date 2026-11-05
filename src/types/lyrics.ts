export interface SyncedLine {
  time: number; // in seconds (e.g. 12.34)
  text: string;
  translation?: string;
  raw?: string;
}

export interface Song {
  id: string; // LRCLIB numeric string or UUID
  trackName: string;
  artistName: string;
  artistSortName?: string; // Dedicated sort metadata tag (e.g. "Beatles, The")
  trackSortName?: string; // Dedicated sort metadata tag for song title
  albumName?: string;
  duration?: number; // In seconds
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
  source: 'lrclib' | 'openlyrics' | 'custom' | 'file';
  addedAt: number;
  updatedAt: number;
  isFavorite: boolean;
  tags?: string[];
  audioFileName?: string;
  audioFileBlobKey?: string; // Key in IndexedDB audio storage
  offsetMs?: number; // Timing offset in milliseconds
  notes?: string;
}

export interface SearchResultItem {
  id: number | string;
  name?: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
  source?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
  color?: string;
  icon?: string;
}

export type DisplayMode = 'synced' | 'plain' | 'stage' | 'chords';
export type FontSizeOption = 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
export type ThemeAccent = 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'blue';

export interface AppSettings {
  fontSize: FontSizeOption;
  themeAccent: ThemeAccent;
  teleprompterSpeed: number; // Pixels per frame or second
  autoKeepAwake: boolean;
  defaultViewMode: DisplayMode;
  karaokeSmoothScroll: boolean;
  hapticFeedback: boolean;
  showLineNumbers: boolean;
  preferredLyricsProvider: 'lrclib' | 'openlyrics' | 'all';
}
