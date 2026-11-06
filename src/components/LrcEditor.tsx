import React, { useState } from 'react';
import { Save, ArrowLeft, Tag, Wand2 } from 'lucide-react';
import { Song } from '../types/lyrics';
import { parseLRC } from '../utils/lrcParser';
import {
  canonicalizeArtistDisplayName,
  computeArtistSortName,
  computeTrackSortName,
} from '../utils/artistNormalizer';
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
  const [artistSortName, setArtistSortName] = useState(
    initialSong?.artistSortName ||
      (initialSong?.artistName ? computeArtistSortName(initialSong.artistName) : '')
  );
  const [trackSortName, setTrackSortName] = useState(
    initialSong?.trackSortName ||
      (initialSong?.trackName ? computeTrackSortName(initialSong.trackName) : '')
  );
  const [isArtistSortCustom, setIsArtistSortCustom] = useState(Boolean(initialSong?.artistSortName));
  const [isTrackSortCustom, setIsTrackSortCustom] = useState(Boolean(initialSong?.trackSortName));
  const [albumName, setAlbumName] = useState(initialSong?.albumName || '');
  const [plainLyricsText, setPlainLyricsText] = useState(getInitialPlainLyrics);

  const handleArtistChange = (val: string) => {
    setArtistName(val);
    if (!isArtistSortCustom) {
      setArtistSortName(computeArtistSortName(val));
    }
  };

  const handleTrackChange = (val: string) => {
    setTrackName(val);
    if (!isTrackSortCustom) {
      setTrackSortName(computeTrackSortName(val));
    }
  };

  const handleAutoNormalize = () => {
    const cleanArtist = canonicalizeArtistDisplayName(artistName);
    setArtistName(cleanArtist);
    setArtistSortName(computeArtistSortName(cleanArtist));
    setTrackSortName(computeTrackSortName(trackName));
    setIsArtistSortCustom(false);
    setIsTrackSortCustom(false);
  };

  const handleSave = async () => {
    if (!trackName.trim() || !artistName.trim()) {
      alert('Please provide both Song Title and Artist Name.');
      return;
    }

    const parsed = parseLRC(plainLyricsText);
    const cleanedPlain = parsed.hasSync && parsed.plainText ? parsed.plainText : plainLyricsText.trim();
    const canonicalArtist = canonicalizeArtistDisplayName(artistName);

    const songToSave: Song = {
      id: initialSong?.id || `custom-${Date.now()}`,
      trackName: trackName.trim(),
      artistName: canonicalArtist,
      artistSortName: (artistSortName || computeArtistSortName(canonicalArtist)).trim(),
      trackSortName: (trackSortName || computeTrackSortName(trackName)).trim(),
      albumName: albumName.trim(),
      syncedLyrics: '',
      plainLyrics: cleanedPlain,
      instrumental: false,
      source: 'custom',
      addedAt: initialSong?.addedAt || Date.now(),
      updatedAt: Date.now(),
      isFavorite: initialSong?.isFavorite || false,
    };

    const savedId = await saveSong(songToSave);
    onSaveSuccess({ ...songToSave, id: savedId });
  };

  return (
    <div className="p-4 pt-safe-status max-w-2xl mx-auto space-y-4 pb-36 animate-fade-in">
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

      {/* Primary Metadata Inputs */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="text-[10px] text-neutral-400 font-semibold uppercase">Song Title *</label>
            <input
              type="text"
              value={trackName}
              onChange={(e) => handleTrackChange(e.target.value)}
              placeholder="e.g. Come Together"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-400 font-semibold uppercase">Artist Name *</label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => handleArtistChange(e.target.value)}
              placeholder="e.g. The Beatles or AC/DC"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-400 font-semibold uppercase">Album (Optional)</label>
            <input
              type="text"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              placeholder="e.g. Abbey Road"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>
        </div>

        {/* Dedicated Sort Metadata Tags Section */}
        <div className="pt-2.5 border-t border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              Dedicated Sort Metadata Tags (Alphabetical Filing)
            </span>
            <button
              type="button"
              onClick={handleAutoNormalize}
              className="text-[10px] text-neutral-300 hover:text-amber-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 transition-colors"
              title="Auto-generate sort tags and canonical band name"
            >
              <Wand2 className="w-3 h-3 text-amber-400" />
              Auto-Format Tags
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] text-neutral-400 font-medium">
                Artist Sort Tag <span className="text-neutral-500">(e.g. "Beatles, The" files under B)</span>
              </label>
              <input
                type="text"
                value={artistSortName}
                onChange={(e) => {
                  setIsArtistSortCustom(true);
                  setArtistSortName(e.target.value);
                }}
                placeholder="e.g. Beatles, The"
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-medium">
                Song Title Sort Tag <span className="text-neutral-500">(ignores leading "The")</span>
              </label>
              <input
                type="text"
                value={trackSortName}
                onChange={(e) => {
                  setIsTrackSortCustom(true);
                  setTrackSortName(e.target.value);
                }}
                placeholder="e.g. Sound of Silence, The"
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500 mt-1"
              />
            </div>
          </div>
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
