import { Song, Playlist } from '../types/lyrics';
import { db } from '../services/db';
import { parseLRC, stripLrcTags } from './lrcParser';

export interface LibraryBackup {
  version: 1;
  exportedAt: number;
  songs: Song[];
  playlists: Playlist[];
}

/**
 * Exports single song as .lrc or .txt download or triggers Android Native Share
 */
export async function downloadSongLyrics(song: Song, format: 'lrc' | 'txt' = 'lrc') {
  const isLrc = format === 'lrc' && Boolean(song.syncedLyrics);
  const content = isLrc 
    ? (song.syncedLyrics || '') 
    : (song.plainLyrics || stripLrcTags(song.syncedLyrics || ''));
  
  const cleanTitle = `${song.artistName} - ${song.trackName}`.replace(/[/\\?%*:|"<>]/g, '-');
  const filename = `${cleanTitle}.${format}`;
  const mimeType = format === 'lrc' ? 'application/x-subrip' : 'text/plain';

  // Check for Web Share API on Android (with files)
  if (navigator.canShare && navigator.share) {
    try {
      const file = new File([content], filename, { type: 'text/plain' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: song.trackName,
          text: `Lyrics for ${song.trackName} by ${song.artistName}`,
        });
        return;
      }
    } catch (e) {
      console.log('Share canceled or fallback to download', e);
    }
  }

  // Fallback to browser download link
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports entire local library and playlists as JSON file
 */
export async function exportFullBackup(): Promise<void> {
  const songs = await db.songs.toArray();
  const playlists = await db.playlists.toArray();

  const backup: LibraryBackup = {
    version: 1,
    exportedAt: Date.now(),
    songs,
    playlists,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const filename = `lyricvault-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports entire local library from JSON backup
 */
export async function importFullBackup(file: File): Promise<{ songsAdded: number; playlistsAdded: number }> {
  const text = await file.text();
  const data: LibraryBackup = JSON.parse(text);

  if (!data.songs || !Array.isArray(data.songs)) {
    throw new Error('Invalid backup file format: missing songs array');
  }

  let songsAdded = 0;
  for (const song of data.songs) {
    await db.songs.put(song);
    songsAdded++;
  }

  let playlistsAdded = 0;
  if (data.playlists && Array.isArray(data.playlists)) {
    for (const pl of data.playlists) {
      await db.playlists.put(pl);
      playlistsAdded++;
    }
  }

  return { songsAdded, playlistsAdded };
}

/**
 * Imports an individual .lrc or .txt file directly from the phone storage
 */
export async function importLrcFile(file: File): Promise<Song> {
  const text = await file.text();
  const parsed = parseLRC(text);

  // Derive artist and title from tags or filename
  const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
  let artist = parsed.metadata.artist || parsed.metadata.ar || 'Unknown Artist';
  let title = parsed.metadata.title || parsed.metadata.ti || fileNameWithoutExt;

  // If filename is "Artist - Title" format
  if (artist === 'Unknown Artist' && fileNameWithoutExt.includes(' - ')) {
    const parts = fileNameWithoutExt.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  const song: Song = {
    id: `local-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    trackName: title,
    artistName: artist,
    albumName: parsed.metadata.album || parsed.metadata.al || '',
    duration: 0,
    instrumental: false,
    syncedLyrics: parsed.hasSync ? text : undefined,
    plainLyrics: parsed.plainText || stripLrcTags(text),
    source: 'file',
    addedAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    offsetMs: parsed.metadata.offset ? parseInt(parsed.metadata.offset, 10) : 0,
  };

  await db.songs.put(song);
  return song;
}
