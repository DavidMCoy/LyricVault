import { SearchResultItem, Song } from '../types/lyrics';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';

export interface LrclibApiResponse {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

/**
 * Searches LRCLIB database using fuzzy query string
 */
export async function searchLrclib(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) return [];

  const url = `${LRCLIB_BASE_URL}/search?q=${encodeURIComponent(query.trim())}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LyricVault-Android/1.0.0 (https://github.com/lyricvault)'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`LRCLIB error: HTTP ${response.status}`);
    }

    const data: LrclibApiResponse[] = await response.json();

    return data.map(item => ({
      id: `lrclib-${item.id}`,
      name: item.name || item.trackName,
      trackName: item.trackName,
      artistName: item.artistName,
      albumName: item.albumName,
      duration: item.duration,
      instrumental: item.instrumental,
      plainLyrics: item.plainLyrics,
      syncedLyrics: item.syncedLyrics,
      source: 'LRCLIB (Open Database)'
    }));
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('LRCLIB request timed out. Please check your internet connection.');
    }
    console.error('LRCLIB search error:', error);
    throw error;
  }
}

/**
 * Gets exact match lyrics from LRCLIB using track & artist name
 */
export async function getExactLrclib(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<SearchResultItem | null> {
  const params = new URLSearchParams({
    track_name: trackName.trim(),
    artist_name: artistName.trim(),
  });

  if (albumName) params.append('album_name', albumName.trim());
  if (duration && duration > 0) params.append('duration', Math.round(duration).toString());

  const url = `${LRCLIB_BASE_URL}/get?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LyricVault-Android/1.0.0 (https://github.com/lyricvault)'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`LRCLIB get error: HTTP ${response.status}`);
    }

    const item: LrclibApiResponse = await response.json();

    return {
      id: `lrclib-${item.id}`,
      name: item.name || item.trackName,
      trackName: item.trackName,
      artistName: item.artistName,
      albumName: item.albumName,
      duration: item.duration,
      instrumental: item.instrumental,
      plainLyrics: item.plainLyrics,
      syncedLyrics: item.syncedLyrics,
      source: 'LRCLIB (Exact Match)'
    };
  } catch (error) {
    console.error('LRCLIB exact lookup error:', error);
    return null;
  }
}

/**
 * Converts a SearchResultItem into a persistent local Song object
 */
export function convertSearchResultToSong(result: SearchResultItem): Song {
  return {
    id: String(result.id),
    trackName: result.trackName,
    artistName: result.artistName,
    albumName: result.albumName || '',
    duration: result.duration || 0,
    instrumental: result.instrumental || false,
    plainLyrics: result.plainLyrics || '',
    syncedLyrics: result.syncedLyrics || '',
    source: 'lrclib',
    addedAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    offsetMs: 0
  };
}

/**
 * Fallback Plain Lyrics Search via Open Lyrics / Lyrics.ovh
 */
export async function searchOpenLyricsFallback(artist: string, title: string): Promise<SearchResultItem | null> {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.lyrics) return null;

    return {
      id: `openlyrics-${Date.now()}`,
      trackName: title,
      artistName: artist,
      instrumental: false,
      plainLyrics: data.lyrics,
      source: 'Open Lyrics Database'
    };
  } catch (e) {
    return null;
  }
}
