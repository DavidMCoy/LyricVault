import React, { useState } from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { Song } from '../types/lyrics';
import { parseLRC } from '../utils/lrcParser';
import { saveSong } from '../services/db';

interface LrcEditorProps {
  initialSong?: Song | null;
  onSaveSuccess: (song: Song) => void;
  onCancel: () => void;
}

export const LrcEditor: React.FC<LrcEditorProps> = ({
  initialSong,
  onSaveSuccess,
  onCancel,
}) => {
  const getInitialPlainLyrics = () => {
    if (!initialSong) return '';
    if (initialSong.plainLyrics && initialSong.plainLyrics.trim().length > 0) {
      return initialSong.plainLyrics.trim();
    }
    if (initialSong.syncedLyrics && initialSong.syncedLyrics.trim().length > 0) {
      const parsed = parseLRC(initialSong.syncedLyrics);
      return parsed.plainText || initialSong.syncedLyrics;
    }
    return '';
  };

  const [trackName, setTrackName] = useState(initialSong?.trackName || '');
  const [artistName, setArtistName] = useState(initialSong?.artistName || '');
  const [albumName, setAlbumName] = useState(initialSong?.albumName || '');
  const [plainLyricsText, setPlainLyricsText] = useState(getInitialPlainLyrics);

  const handleSave = async () => {
    if (!trackName.trim() || !artistName.trim()) {
      alert('Please provide both Song Title and Artist Name.');
      return;
    }

    // If user pasted text that happens to contain [mm:ss.xx] tags, strip them cleanly
    const parsed = parseLRC(plainLyricsText);
    const cleanedPlain = parsed.hasSync && parsed.plainText ? parsed.plainText : plainLyricsText.trim();

    const songToSave: Song = {
      id: initialSong?.id || `custom-${Date.now()}`,
      trackName: trackName.trim(),
      artistName: artistName.trim(),
      albumName: albumName.trim(),
      syncedLyrics: '',
      plainLyrics: cleanedPlain,
      instrumental: false,
      source: 'custom',
      addedAt: initialSong?.addedAt || Date.now(),
      updatedAt: Date.now(),
      isFavorite: initialSong?.isFavorite || false,
    };

    await saveSong(songToSave);
    onSaveSuccess(songToSave);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-100 bg-neutral-900 border border-neutral-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-neutral-100">
            {initialSong ? 'Edit Lyric Sheet' : 'New Lyric Sheet'}
          </h2>
        </div>

        <button
          onClick={handleSave}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/50 active:scale-95 transition-all"
        >
          <Save className="w-3.5 h-3.5" /> Save to Notebook
        </button>
      </div>

      {/* Metadata Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl">
        <div>
          <label className="text-[10px] text-neutral-400 font-semibold uppercase">Song Title *</label>
          <input
            type="text"
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            placeholder="e.g. Hotel California"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-400 font-semibold uppercase">Artist Name *</label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="e.g. Eagles"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-400 font-semibold uppercase">Album (Optional)</label>
          <input
            type="text"
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            placeholder="e.g. Hotel California"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 mt-1"
          />
        </div>
      </div>

      {/* Plain Lyrics Editor */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-300 block">
          Song Lyrics
        </label>
        <textarea
          value={plainLyricsText}
          onChange={(e) => setPlainLyricsText(e.target.value)}
          rows={18}
          placeholder="Type or paste the song lyrics here..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-neutral-100 focus:outline-none focus:border-amber-500 leading-relaxed shadow-inner"
        />
      </div>
    </div>
  );
};
