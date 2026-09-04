import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, FastForward, Rewind, Upload, 
  Maximize2, Minimize2, ArrowLeft, Zap, Star
} from 'lucide-react';
import { Song, SyncedLine, DisplayMode, FontSizeOption } from '../types/lyrics';
import { parseLRC, getActiveLineIndex, formatTimeDisplay } from '../utils/lrcParser';
import { wakeLock } from '../utils/wakeLock';
import { saveSong, toggleFavorite, saveAudioFile, getAudioFile } from '../services/db';

interface LyricsDisplayProps {
  song: Song | null;
  onBack: () => void;
  onEditSong?: (song: Song) => void;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ song, onBack }) => {
  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-neutral-400">
        <p className="text-sm">No song selected.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-neutral-800 text-neutral-200 rounded-xl text-xs font-semibold"
        >
          Go to Library
        </button>
      </div>
    );
  }

  // View & Playback State
  const [currentSong, setCurrentSong] = useState<Song>(song);
  const [viewMode, setViewMode] = useState<DisplayMode>(
    song.syncedLyrics && song.syncedLyrics.trim().length > 0 ? 'synced' : 'plain'
  );
  const [fontSize, setFontSize] = useState<FontSizeOption>('xl');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(song.duration || 180);
  const [offsetMs, setOffsetMs] = useState<number>(song.offsetMs || 0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(true);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<number>(1);
  const [isTeleprompterRunning, setIsTeleprompterRunning] = useState<boolean>(false);

  // Audio integration
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(song.audioFileName || null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const teleprompterIntervalRef = useRef<any>(null);

  // Parse lyrics
  const parsed = parseLRC(currentSong.syncedLyrics || currentSong.plainLyrics || '');
  const lines: SyncedLine[] = parsed.lines.length > 0 
    ? parsed.lines 
    : (currentSong.plainLyrics || '').split('\n').filter(Boolean).map((text, idx) => ({
        time: idx * 4,
        text,
      }));

  const activeLineIndex = parsed.hasSync
    ? getActiveLineIndex(lines, currentTime, offsetMs)
    : -1;

  // Sync song changes
  useEffect(() => {
    setCurrentSong(song);
    setOffsetMs(song.offsetMs || 0);
    if (song.duration) setDuration(song.duration);

    // Try loading cached audio if present
    if (song.audioFileBlobKey) {
      loadCachedAudio(song.audioFileBlobKey);
    }
  }, [song]);

  const loadCachedAudio = async (blobKey: string) => {
    const record = await getAudioFile(blobKey);
    if (record) {
      const url = URL.createObjectURL(record.blob);
      setAudioUrl(url);
      setAudioFileName(record.fileName);
    }
  };

  // Screen Wake Lock initialization
  useEffect(() => {
    if (isWakeLockActive) {
      wakeLock.request();
    } else {
      wakeLock.release();
    }
    return () => {
      wakeLock.release();
    };
  }, [isWakeLockActive]);

  // Handle Play/Pause simulation timer or audio
  useEffect(() => {
    let interval: any = null;

    if (isPlaying) {
      if (audioRef.current && audioUrl) {
        audioRef.current.play().catch(() => {});
      } else {
        // Simulated timer if no audio file is loaded
        interval = setInterval(() => {
          setCurrentTime((prev) => {
            if (prev >= duration) {
              setIsPlaying(false);
              return 0;
            }
            return prev + 0.1;
          });
        }, 100);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, audioUrl, duration]);

  // Sync audio element time to currentTime state
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  // Smooth scroll active line into view in Synced Mode
  useEffect(() => {
    if (viewMode === 'synced' && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, viewMode]);

  // Teleprompter smooth auto-scroll for Plain Mode
  useEffect(() => {
    if (isTeleprompterRunning && viewMode === 'plain') {
      teleprompterIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += teleprompterSpeed;
        }
      }, 30);
    } else {
      if (teleprompterIntervalRef.current) {
        clearInterval(teleprompterIntervalRef.current);
      }
    }
    return () => {
      if (teleprompterIntervalRef.current) clearInterval(teleprompterIntervalRef.current);
    };
  }, [isTeleprompterRunning, teleprompterSpeed, viewMode]);

  // Audio file upload handler
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobKey = `audio-${currentSong.id}`;
    await saveAudioFile(blobKey, file);

    const updatedSong = {
      ...currentSong,
      audioFileName: file.name,
      audioFileBlobKey: blobKey,
    };
    await saveSong(updatedSong);
    setCurrentSong(updatedSong);

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioFileName(file.name);
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(newTime, duration));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const handleAdjustOffset = async (deltaMs: number) => {
    const newOffset = offsetMs + deltaMs;
    setOffsetMs(newOffset);
    const updated = { ...currentSong, offsetMs: newOffset };
    setCurrentSong(updated);
    await saveSong(updated);
  };

  const handleToggleFav = async () => {
    const newFav = await toggleFavorite(currentSong.id);
    setCurrentSong(prev => ({ ...prev, isFavorite: newFav }));
  };

  const fontSizes: Record<FontSizeOption, string> = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl md:text-2xl leading-relaxed',
    '2xl': 'text-2xl md:text-3xl leading-relaxed',
    '3xl': 'text-3xl md:text-4xl leading-loose font-bold',
  };

  return (
    <div className={`flex flex-col min-h-[90vh] pb-32 animate-fade-in ${isFullscreen ? 'fixed inset-0 z-50 bg-neutral-950 pb-20' : ''}`}>
      {/* Hidden HTML5 Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top Toolbar */}
      <div className="bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 p-3 px-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 pr-2">
            <h2 className="text-sm font-bold text-neutral-100 break-words leading-tight">{currentSong.trackName}</h2>
            <p className="text-xs text-neutral-400 break-words mt-0.5 leading-snug">
              {currentSong.artistName} {currentSong.albumName ? `• ${currentSong.albumName}` : ''}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleToggleFav}
            className={`p-1.5 rounded-xl transition-all ${
              currentSong.isFavorite ? 'text-amber-400 bg-amber-950/40' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Star className={`w-4 h-4 ${currentSong.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsWakeLockActive(!isWakeLockActive)}
            title={isWakeLockActive ? "Screen Awake ON" : "Screen Awake OFF"}
            className={`p-1.5 rounded-xl transition-all ${
              isWakeLockActive ? 'text-emerald-400 bg-emerald-950/50' : 'text-neutral-500'
            }`}
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Selectors & Controls */}
      <div className="px-4 py-2.5 bg-neutral-925 border-b border-neutral-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-neutral-900 rounded-xl p-1 border border-neutral-800 shrink-0">
          {parsed.hasSync && (
            <button
              onClick={() => setViewMode('synced')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'synced' ? 'bg-emerald-500 text-black font-bold shadow-sm' : 'text-neutral-400'
              }`}
            >
              Karaoke Sync
            </button>
          )}
          <button
            onClick={() => setViewMode('plain')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'plain' ? 'bg-emerald-500 text-black font-bold shadow-sm' : 'text-neutral-400'
            }`}
          >
            Plain / Prompter
          </button>
          <button
            onClick={() => setViewMode('stage')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'stage' ? 'bg-emerald-500 text-black font-bold shadow-sm' : 'text-neutral-400'
            }`}
          >
            Stage Mode
          </button>
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              const sizes: FontSizeOption[] = ['sm', 'base', 'lg', 'xl', '2xl', '3xl'];
              const currIdx = sizes.indexOf(fontSize);
              if (currIdx > 0) setFontSize(sizes[currIdx - 1]);
            }}
            className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center hover:bg-neutral-800"
          >
            A-
          </button>
          <button
            onClick={() => {
              const sizes: FontSizeOption[] = ['sm', 'base', 'lg', 'xl', '2xl', '3xl'];
              const currIdx = sizes.indexOf(fontSize);
              if (currIdx < sizes.length - 1) setFontSize(sizes[currIdx + 1]);
            }}
            className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-sm flex items-center justify-center hover:bg-neutral-800"
          >
            A+
          </button>
        </div>
      </div>

      {/* Main Lyrics View Container */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-6 py-8 transition-colors select-none ${
          viewMode === 'stage' ? 'bg-black text-amber-100 font-sans' : 'bg-neutral-950'
        }`}
      >
        {/* Synced Karaoke View */}
        {viewMode === 'synced' && (
          <div className="max-w-xl mx-auto space-y-6 text-center py-12">
            {lines.map((line, idx) => {
              const isActive = idx === activeLineIndex;
              const isPast = activeLineIndex > -1 && idx < activeLineIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 rounded-2xl p-2.5 ${fontSizes[fontSize]} ${
                    isActive
                      ? 'text-emerald-400 font-extrabold scale-105 drop-shadow-[0_0_20px_rgba(52,211,153,0.35)] bg-emerald-950/20'
                      : isPast
                      ? 'text-neutral-500 opacity-60'
                      : 'text-neutral-400 opacity-80 hover:text-neutral-200'
                  }`}
                >
                  <p className="break-words">{line.text || '♪'}</p>
                  {line.translation && (
                    <p className="text-xs font-normal text-emerald-300/70 mt-1 break-words">{line.translation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Plain Text & Teleprompter View */}
        {(viewMode === 'plain' || viewMode === 'stage') && (
          <div className={`max-w-xl mx-auto whitespace-pre-wrap ${fontSizes[fontSize]} ${
            viewMode === 'stage' ? 'font-mono text-center leading-loose font-bold' : 'leading-relaxed'
          }`}>
            {currentSong.plainLyrics || parsed.plainText || 'No plain lyrics found.'}
          </div>
        )}
      </div>

      {/* Teleprompter Floating Controls for Plain Mode */}
      {viewMode === 'plain' && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/90 border border-neutral-700 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xl">
          <button
            onClick={() => setIsTeleprompterRunning(!isTeleprompterRunning)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-black active:scale-95"
          >
            {isTeleprompterRunning ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black" />}
            Auto Scroll
          </button>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <span>Speed:</span>
            {[1, 2, 3, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setTeleprompterSpeed(spd)}
                className={`w-6 h-6 rounded-lg text-xs font-semibold ${
                  teleprompterSpeed === spd ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Karaoke / Audio Bottom Player Bar */}
      {viewMode === 'synced' && (
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 px-4 py-3 shadow-2xl">
          <div className="max-w-md mx-auto space-y-2">
            {/* Scrubber & Timestamps */}
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono text-neutral-400 shrink-0 w-10 text-right">
                {formatTimeDisplay(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || 180}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
              />

              <span className="text-[11px] font-mono text-neutral-400 shrink-0 w-10">
                {formatTimeDisplay(duration)}
              </span>
            </div>

            {/* Playback Controls & Audio Binding */}
            <div className="flex items-center justify-between">
              {/* Offset Adjuster */}
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => handleAdjustOffset(-500)}
                  className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  title="Offset -0.5s"
                >
                  -0.5s
                </button>
                <span className="font-mono text-emerald-400 min-w-8 text-center">
                  {offsetMs !== 0 ? `${offsetMs > 0 ? '+' : ''}${offsetMs / 1000}s` : 'Sync'}
                </span>
                <button
                  onClick={() => handleAdjustOffset(500)}
                  className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  title="Offset +0.5s"
                >
                  +0.5s
                </button>
              </div>

              {/* Main Play / Pause & Rewind Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSeek(currentTime - 5)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 active:scale-90"
                  title="Rewind 5s"
                >
                  <Rewind className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-950 active:scale-95 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-black ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handleSeek(currentTime + 5)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 active:scale-90"
                  title="Forward 5s"
                >
                  <FastForward className="w-5 h-5" />
                </button>
              </div>

              {/* Load Audio from Phone Storage */}
              <div>
                <label className="cursor-pointer flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[70px] truncate">{audioFileName || 'Link MP3'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
