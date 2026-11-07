import { SearchResultItem, Song } from '../types/lyrics';
import {
  getArtistFingerprint,
  getTrackFingerprint,
  canonicalizeArtistDisplayName,
} from '../utils/artistNormalizer';

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

export interface SearchOptions {
  query?: string;
  artistName?: string;
  trackName?: string;
}

export interface DeduplicatedSearchResponse {
  results: SearchResultItem[];
  rawCount: number;
  duplicatesRemoved: number;
}

// Letter batches used to fan out artist catalog queries past LRCLIB's 20-result-per-call cap
const EXPANSION_BATCHES: string[][] = [
  ['a', 'e', 'i', 'o', 's', 't'],
  ['b', 'c', 'd', 'f', 'l', 'm'],
  ['g', 'h', 'n', 'p', 'r', 'w'],
  ['j', 'k', 'u', 'v', 'y', 'z'],
];

function mapApiItem(item: LrclibApiResponse): SearchResultItem {
  const cleanArtist = canonicalizeArtistDisplayName(item.artistName);
  return {
    id: `lrclib-${item.id}`,
    name: item.name || item.trackName,
    trackName: (item.trackName || item.name || '').trim(),
    artistName: cleanArtist,
    albumName: item.albumName,
    duration: item.duration,
    instrumental: item.instrumental,
    plainLyrics: item.plainLyrics,
    syncedLyrics: item.syncedLyrics,
    source: 'LRCLIB (Open Database)',
  };
}

function scoreSearchResult(item: SearchResultItem): number {
  let score = 0;
  const hasPlain = Boolean(item.plainLyrics && item.plainLyrics.trim().length > 0);
  const hasSynced = Boolean(item.syncedLyrics && item.syncedLyrics.trim().length > 0);

  if (hasPlain || hasSynced) score += 100;
  if (hasPlain && hasSynced) score += 40;
  if (!item.instrumental) score += 20;

  // Prefer cleaner titles without "(Remastered ...)" or "- Live ..." noise
  if (!/\((remaster|live|mono|stereo|deluxe|version|edit)/i.test(item.trackName) &&
      !/-\s*(remaster|live|mono|stereo|version|edit)/i.test(item.trackName)) {
    score += 15;
  }

  score += Math.min(20, ((item.plainLyrics?.length || 0) / 250));
  return score;
}

/**
 * Deduplicates LRCLIB search results by normalized (artist + track) fingerprint,
 * keeping the highest-quality lyric version of each song.
 */
export function deduplicateSearchResults(items: SearchResultItem[]): DeduplicatedSearchResponse {
  const bestByKey = new Map<string, SearchResultItem>();
  let rawCount = 0;

  for (const item of items) {
    if (!item.trackName) continue;
    rawCount++;
    const key = `${getArtistFingerprint(item.artistName)}::${getTrackFingerprint(item.trackName)}`;
    const existing = bestByKey.get(key);
    if (!existing || scoreSearchResult(item) > scoreSearchResult(existing)) {
      bestByKey.set(key, item);
    }
  }

  const results = Array.from(bestByKey.values());
  return {
    results,
    rawCount,
    duplicatesRemoved: Math.max(0, rawCount - results.length),
  };
}

async function fetchLrclibEndpoint(params: URLSearchParams, timeoutMs = 10000): Promise<SearchResultItem[]> {
  const url = `${LRCLIB_BASE_URL}/search?${params.toString()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LyricVault-Android/1.6.0 (https://github.com/DavidMCoy/LyricVault)',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`LRCLIB error: HTTP ${response.status}`);
    }

    const data: LrclibApiResponse[] = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map(mapApiItem);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('LRCLIB request timed out. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Searches LRCLIB database using either a general query or structured artist/track fields,
 * and deduplicates remaster/album duplicates automatically.
 */
export async function searchLrclib(
  queryOrOptions: string | SearchOptions
): Promise<SearchResultItem[]> {
  const resp = await searchLrclibDetailed(queryOrOptions);
  return resp.results;
}

export async function searchLrclibDetailed(
  queryOrOptions: string | SearchOptions
): Promise<DeduplicatedSearchResponse> {
  const opts: SearchOptions =
    typeof queryOrOptions === 'string' ? { query: queryOrOptions } : queryOrOptions;

  const q = (opts.query || '').trim();
  const artist = (opts.artistName || '').trim();
  const track = (opts.trackName || '').trim();

  if (!q && !artist && !track) {
    return { results: [], rawCount: 0, duplicatesRemoved: 0 };
  }

  const requests: Promise<SearchResultItem[]>[] = [];

  if (artist || track) {
    // Structured search using artist_name and/or track_name
    const structuredParams = new URLSearchParams();
    if (artist) structuredParams.set('artist_name', artist);
    if (track) structuredParams.set('track_name', track || artist);
    requests.push(fetchLrclibEndpoint(structuredParams));

    // Also run a combined free-text query to catch tracks where artist_name alone isn't indexed without track_name
    const combinedQ = [artist, track].filter(Boolean).join(' ');
    if (combinedQ) {
      requests.push(fetchLrclibEndpoint(new URLSearchParams({ q: combinedQ })));
    }

    // If searching by artist only (no track specified), fan out a couple of vowel queries immediately
    // so the user gets 35-50+ unique songs right away instead of hitting the 20-row cap
    if (artist && !track) {
      for (const vowel of ['a', 'e', 'i', 'o']) {
        requests.push(
          fetchLrclibEndpoint(
            new URLSearchParams({ artist_name: artist, track_name: vowel })
          ).catch(() => [])
        );
      }
    }
  } else {
    // Free-text search: run both `q=` and `artist_name=` + vowel fanout if it looks like an artist search
    requests.push(fetchLrclibEndpoint(new URLSearchParams({ q })));
    requests.push(
      fetchLrclibEndpoint(new URLSearchParams({ artist_name: q, track_name: 'a' })).catch(() => []),
      fetchLrclibEndpoint(new URLSearchParams({ artist_name: q, track_name: 'e' })).catch(() => [])
    );
  }

  const settled = await Promise.allSettled(requests);
  const combined: SearchResultItem[] = [];
  let firstError: Error | null = null;

  for (const res of settled) {
    if (res.status === 'fulfilled') {
      combined.push(...res.value);
    } else if (!firstError) {
      firstError = res.reason;
    }
  }

  if (combined.length === 0 && firstError) {
    throw firstError;
  }

  // If the user explicitly filtered by artistName, keep results whose artist matches or contains the artist query
  const targetArtistFp = artist ? getArtistFingerprint(artist) : '';
  const filtered = targetArtistFp
    ? combined.filter((item) => {
        const itemFp = getArtistFingerprint(item.artistName);
        return itemFp.includes(targetArtistFp) || targetArtistFp.includes(itemFp);
      })
    : combined;

  return deduplicateSearchResults(filtered.length > 0 ? filtered : combined);
}

/**
 * Fetches additional batches of songs for an artist or query to bypass LRCLIB's 20-result cap.
 */
export async function expandLrclibSearch(
  options: SearchOptions,
  existingResults: SearchResultItem[],
  batchIndex: number
): Promise<{
  mergedResults: SearchResultItem[];
  newlyAddedCount: number;
  hasMoreBatches: boolean;
}> {
  const letters = EXPANSION_BATCHES[batchIndex % EXPANSION_BATCHES.length];
  const artist = (options.artistName || options.query || '').trim();
  const track = (options.trackName || '').trim();

  if (!artist && !track) {
    return { mergedResults: existingResults, newlyAddedCount: 0, hasMoreBatches: false };
  }

  const requests: Promise<SearchResultItem[]>[] = [];

  for (const letter of letters) {
    if (artist) {
      requests.push(
        fetchLrclibEndpoint(
          new URLSearchParams({
            artist_name: artist,
            track_name: track ? `${track} ${letter}` : letter,
          })
        ).catch(() => [])
      );
    }
    const baseQuery = [artist, track].filter(Boolean).join(' ');
    requests.push(
      fetchLrclibEndpoint(new URLSearchParams({ q: `${baseQuery} ${letter}`.trim() })).catch(() => [])
    );
  }

  const batches = await Promise.all(requests);
  const incoming = batches.flat();

  const targetArtistFp = getArtistFingerprint(artist);
  const matchingIncoming =
    artist && targetArtistFp
      ? incoming.filter((item) => {
          const itemFp = getArtistFingerprint(item.artistName);
          return itemFp.includes(targetArtistFp) || targetArtistFp.includes(itemFp);
        })
      : incoming;

  const deduped = deduplicateSearchResults([
    ...existingResults,
    ...(matchingIncoming.length > 0 ? matchingIncoming : incoming),
  ]);

  return {
    mergedResults: deduped.results,
    newlyAddedCount: Math.max(0, deduped.results.length - existingResults.length),
    hasMoreBatches: batchIndex + 1 < EXPANSION_BATCHES.length,
  };
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
