import Dexie, { type Table } from 'dexie';
import { Song, Playlist } from '../types/lyrics';
import spotifyTop100Data from '../data/spotifyTop100.json';

export interface AudioBlobRecord {
  id: string; // matches audioFileBlobKey
  fileName: string;
  blob: Blob;
  mimeType: string;
  size: number;
  addedAt: number;
}

export interface SearchHistoryItem {
  id?: number;
  query: string;
  timestamp: number;
}

export class LyricVaultDatabase extends Dexie {
  songs!: Table<Song, string>;
  playlists!: Table<Playlist, string>;
  audioCache!: Table<AudioBlobRecord, string>;
  searchHistory!: Table<SearchHistoryItem, number>;

  constructor() {
    super('LyricVaultDB');

    this.version(1).stores({
      songs: 'id, trackName, artistName, albumName, isFavorite, source, addedAt, updatedAt',
      playlists: 'id, name, createdAt, updatedAt',
      audioCache: 'id, fileName, addedAt',
      searchHistory: '++id, query, timestamp',
    });
  }
}

export const db = new LyricVaultDatabase();

/**
 * Seed initial Spotify Top 100 songs and playlists if not present
 */
export async function initDatabaseDefaults() {
  const count = await db.songs.count();
  if (count === 0) {
    if (spotifyTop100Data.songs && spotifyTop100Data.songs.length > 0) {
      await db.songs.bulkAdd(spotifyTop100Data.songs as Song[]);
    }
    if (spotifyTop100Data.playlists && spotifyTop100Data.playlists.length > 0) {
      await db.playlists.bulkAdd(spotifyTop100Data.playlists as Playlist[]);
    }
  } else {
    // If database already exists, make sure Spotify Top 100 playlist is present
    const pl = await db.playlists.get('pl-spotify-top100');
    if (!pl && spotifyTop100Data.playlists) {
      for (const song of spotifyTop100Data.songs) {
        await db.songs.put(song as Song);
      }
      await db.playlists.bulkAdd(spotifyTop100Data.playlists as Playlist[]);
    }
  }
}

/**
 * Manually import or re-sync Spotify Top 100 into local database
 */
export async function importSpotifyTop100Data(): Promise<number> {
  for (const song of spotifyTop100Data.songs) {
    await db.songs.put(song as Song);
  }
  for (const pl of spotifyTop100Data.playlists) {
    await db.playlists.put(pl as Playlist);
  }
  return spotifyTop100Data.songs.length;
}

// Database helper functions
export async function getLocalSongs(): Promise<Song[]> {
  return await db.songs.orderBy('addedAt').reverse().toArray();
}

export async function getSongById(id: string): Promise<Song | undefined> {
  return await db.songs.get(id);
}

export async function saveSong(song: Song): Promise<string> {
  await db.songs.put({
    ...song,
    updatedAt: Date.now()
  });
  return song.id;
}

export async function deleteSong(id: string): Promise<void> {
  // Also clean up referenced audio file if present
  const song = await db.songs.get(id);
  if (song?.audioFileBlobKey) {
    await db.audioCache.delete(song.audioFileBlobKey);
  }
  // Remove from playlists
  const playlists = await db.playlists.toArray();
  for (const pl of playlists) {
    if (pl.songIds.includes(id)) {
      pl.songIds = pl.songIds.filter(sid => sid !== id);
      pl.updatedAt = Date.now();
      await db.playlists.put(pl);
    }
  }
  await db.songs.delete(id);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const song = await db.songs.get(id);
  if (!song) return false;
  const newFav = !song.isFavorite;
  await db.songs.update(id, { isFavorite: newFav, updatedAt: Date.now() });
  return newFav;
}

export async function searchLocalSongs(query: string, filterFavorite = false): Promise<Song[]> {
  let collection = db.songs.toCollection();
  let results = await collection.toArray();

  if (filterFavorite) {
    results = results.filter(s => s.isFavorite);
  }

  if (query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter(s =>
      s.trackName.toLowerCase().includes(q) ||
      s.artistName.toLowerCase().includes(q) ||
      (s.albumName && s.albumName.toLowerCase().includes(q)) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q))) ||
      (s.plainLyrics && s.plainLyrics.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => b.addedAt - a.addedAt);
}

// Audio Storage
export async function saveAudioFile(id: string, file: File): Promise<string> {
  const blobRecord: AudioBlobRecord = {
    id,
    fileName: file.name,
    blob: file,
    mimeType: file.type || 'audio/mpeg',
    size: file.size,
    addedAt: Date.now()
  };
  await db.audioCache.put(blobRecord);
  return id;
}

export async function getAudioFile(id: string): Promise<AudioBlobRecord | undefined> {
  return await db.audioCache.get(id);
}

export async function deleteAudioFile(id: string): Promise<void> {
  await db.audioCache.delete(id);
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Storage statistics
export async function getStorageStats() {
  const songs = await db.songs.toArray();
  const playlists = await db.playlists.toArray();
  const searchHistory = await db.searchHistory.toArray();
  const audioRecords = await db.audioCache.toArray();

  // Calculate actual text byte size for songs
  const encoder = new TextEncoder();
  let songsBytes = 0;
  for (const s of songs) {
    const jsonStr = JSON.stringify(s);
    songsBytes += encoder.encode(jsonStr).length;
  }

  let playlistsBytes = 0;
  for (const p of playlists) {
    playlistsBytes += encoder.encode(JSON.stringify(p)).length;
  }

  let searchHistoryBytes = 0;
  for (const h of searchHistory) {
    searchHistoryBytes += encoder.encode(JSON.stringify(h)).length;
  }

  const audioBytes = audioRecords.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const databaseTotalBytes = songsBytes + playlistsBytes + searchHistoryBytes + audioBytes;

  // Query browser/Android storage quota estimate if available
  let systemQuota: number | undefined;
  let systemUsage: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      systemQuota = estimate.quota;
      systemUsage = estimate.usage;
    } catch (e) {
      console.warn('Could not query storage estimate', e);
    }
  }

  return {
    songsCount: songs.length,
    playlistsCount: playlists.length,
    audioCount: audioRecords.length,
    songsBytes,
    playlistsBytes,
    audioBytes,
    databaseTotalBytes,
    songsFormatted: formatBytes(songsBytes),
    playlistsFormatted: formatBytes(playlistsBytes),
    audioFormatted: formatBytes(audioBytes),
    totalFormatted: formatBytes(databaseTotalBytes),
    systemQuotaFormatted: systemQuota ? formatBytes(systemQuota) : undefined,
    systemUsageFormatted: systemUsage ? formatBytes(systemUsage) : undefined,
    percentUsed: systemQuota && systemUsage ? Math.min(100, (systemUsage / systemQuota) * 100).toFixed(1) : undefined
  };
}
