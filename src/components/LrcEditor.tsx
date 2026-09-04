import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Play, Pause, Clock, ArrowLeft, 
  Sparkles, FileText
} from 'lucide-react';
import { Song, SyncedLine } from '../types/lyrics';
import { parseLRC, exportToLRC, formatLrcTimestamp, formatTimeDisplay } from '../utils/lrcParser';
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
  const [trackName, setTrackName] = useState(initialSong?.trackName || '');
  const [artistName, setArtistName] = useState(initialSong?.artistName || '');
  const [albumName, setAlbumName] = useState(initialSong?.albumName || '');
  const [rawLrcText, setRawLrcText] = useState(
    initialSong?.syncedLyrics || initialSong?.plainLyrics || ''
  );
  const [editorTab, setEditorTab] = useState<'visual' | 'raw'>('visual');

  // Interactive Tagger / Stamping State
  const [lines, setLines] = useState<SyncedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Initialize lines
  useEffect(() => {
    const parsed = parseLRC(rawLrcText);
    if (parsed.lines.length > 0) {
      setLines(parsed.lines);
    } else {
      // Split plain text lines
      const plainLines = rawLrcText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(text => ({ time: 0, text }));
      setLines(plainLines);
    }
  }, []);

  // Timer simulation
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 0.1);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Stamp current time on active line and advance
  const handleStampCurrentLine = () => {
    if (currentLineIndex >= lines.length) return;

    const updated = [...lines];
    updated[currentLineIndex] = {
      ...updated[currentLineIndex],
      time: Math.round(currentTime * 100) / 100,
    };
    setLines(updated);

    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1);
    }
  };

  const handleNudgeTime = (index: number, delta: number) => {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      time: Math.max(0, Math.round((updated[index].time + delta) * 100) / 100),
    };
    setLines(updated);
  };

  const handleSave = async () => {
    if (!trackName.trim() || !artistName.trim()) {
      alert('Please provide both Song Title and Artist Name.');
      return;
    }

    let finalSynced: string;
    let finalPlain: string;

    if (editorTab === 'visual') {
      finalSynced = exportToLRC(lines, { title: trackName, artist: artistName, album: albumName });
      finalPlain = lines.map(l => l.text).join('\n');
    } else {
      const parsed = parseLRC(rawLrcText);
      finalSynced = parsed.hasSync ? rawLrcText : '';
      finalPlain = parsed.plainText || rawLrcText;
    }

    const songToSave: Song = {
      id: initialSong?.id || `custom-${Date.now()}`,
      trackName: trackName.trim(),
      artistName: artistName.trim(),
      albumName: albumName.trim(),
      syncedLyrics: finalSynced,
      plainLyrics: finalPlain,
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
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-100 bg-neutral-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-neutral-100">
            {initialSong ? 'Edit Lyrics & Timing' : 'Create Custom Lyrics'}
          </h2>
        </div>

        <button
          onClick={handleSave}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 active:scale-95 transition-all"
        >
          <Save className="w-3.5 h-3.5" /> Save Lyric
        </button>
      </div>

      {/* Metadata Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-neutral-900/80 border border-neutral-800 p-3 rounded-2xl">
        <div>
          <label className="text-[10px] text-neutral-400 font-semibold uppercase">Song Title *</label>
          <input
            type="text"
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            placeholder="e.g. Wonderwall"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-400 font-semibold uppercase">Artist Name *</label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="e.g. Oasis"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-400 font-semibold uppercase">Album (Optional)</label>
          <input
            type="text"
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            placeholder="e.g. Morning Glory"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 mt-1"
          />
        </div>
      </div>

      {/* Tab Selector: Visual Sync Tagger vs Raw LRC Editor */}
      <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
        <button
          onClick={() => setEditorTab('visual')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            editorTab === 'visual'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Tap-to-Sync Tagger
        </button>
        <button
          onClick={() => setEditorTab('raw')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            editorTab === 'raw'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Raw .LRC / Text
        </button>
      </div>

      {/* Visual Tap-to-Sync Mode */}
      {editorTab === 'visual' && (
        <div className="space-y-3">
          {/* Sync Controller Bar */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 sticky top-16 z-10 shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>
              <div>
                <p className="text-base font-mono font-bold text-emerald-400">{formatTimeDisplay(currentTime)}</p>
                <p className="text-[10px] text-neutral-400">Current Timer</p>
              </div>
            </div>

            <button
              onClick={handleStampCurrentLine}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Stamp Line #{currentLineIndex + 1}
            </button>
          </div>

          {/* Line by line list */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {lines.map((line, idx) => {
              const isSelected = idx === currentLineIndex;
              return (
                <div
                  key={idx}
                  onClick={() => setCurrentLineIndex(idx)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-neutral-100 shadow-md'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-emerald-400 w-16 shrink-0">
                      {formatLrcTimestamp(line.time)}
                    </span>
                    <input
                      type="text"
                      value={line.text}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].text = e.target.value;
                        setLines(updated);
                      }}
                      className="bg-transparent text-xs text-neutral-200 focus:outline-none flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNudgeTime(idx, -0.2);
                      }}
                      className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300"
                    >
                      -0.2s
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNudgeTime(idx, 0.2);
                      }}
                      className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300"
                    >
                      +0.2s
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw Code / Text Mode */}
      {editorTab === 'raw' && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-400">
            Paste or edit standard LRC tags (e.g. <code className="text-emerald-400">[01:23.45] lyric line</code>) or plain text:
          </p>
          <textarea
            value={rawLrcText}
            onChange={(e) => setRawLrcText(e.target.value)}
            rows={14}
            placeholder="[00:12.34] First line of song&#10;[00:18.50] Second line of song..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 font-mono text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 leading-relaxed shadow-inner"
          />
        </div>
      )}
    </div>
  );
};
