import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, ArrowLeft, Zap, Star, Edit3, X, Plus, BookOpen
} from 'lucide-react';
import { Song, FontSizeOption } from '../types/lyrics';
import { parseLRC } from '../utils/lrcParser';
import { wakeLock } from '../utils/wakeLock';
import { toggleFavorite } from '../services/db';

interface LyricsDisplayProps {
  song: Song | null;
  openSongs?: Song[];
  onSelectOpenSong?: (song: Song) => void;
  onCloseOpenSong?: (songId: string, e: React.MouseEvent) => void;
  onBack: () => void;
  onEditSong?: (song: Song) => void;
}

const TAB_ACCENTS = [
  'border-t-amber-400',
  'border-t-emerald-400',
  'border-t-sky-400',
  'border-t-rose-400',
  'border-t-violet-400',
];

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  song,
  openSongs = [],
  onSelectOpenSong,
  onCloseOpenSong,
  onBack,
  onEditSong,
}) => {
  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 pt-safe-status pb-36 text-center text-neutral-400">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3 text-amber-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-neutral-200">No Lyric Sheet Open</p>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs">
          Select any song from your Notebook Index or Setlists to open its lyric sheet.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-bold shadow-md shadow-amber-950/50"
        >
          Open Notebook Index
        </button>
      </div>
    );
  }

  const [currentSong, setCurrentSong] = useState<Song>(song);
  const [fontSize, setFontSize] = useState<FontSizeOption>('lg');
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(true);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<number>(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollIntervalRef = useRef<any>(null);

  // Sync when song prop changes
  useEffect(() => {
    setCurrentSong(song);
    setIsAutoScrolling(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [song]);

  // Screen Wake Lock
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

  // Hands-free Auto-Scroll
  useEffect(() => {
    if (isAutoScrolling) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy({ top: teleprompterSpeed, behavior: 'auto' });
      }, 35);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isAutoScrolling, teleprompterSpeed]);

  const handleToggleFav = async () => {
    const newFav = await toggleFavorite(currentSong.id);
    setCurrentSong(prev => ({ ...prev, isFavorite: newFav }));
  };

  // Extract clean plain text lyrics (stripping any LRC timestamps if plainLyrics is empty)
  const cleanLyrics = React.useMemo(() => {
    if (currentSong.plainLyrics && currentSong.plainLyrics.trim().length > 0) {
      return currentSong.plainLyrics.trim();
    }
    if (currentSong.syncedLyrics && currentSong.syncedLyrics.trim().length > 0) {
      const parsed = parseLRC(currentSong.syncedLyrics);
      return parsed.plainText || currentSong.syncedLyrics;
    }
    return 'No lyrics available for this song.';
  }, [currentSong]);

  const fontSizes: Record<FontSizeOption, string> = {
    sm: 'text-sm leading-7',
    base: 'text-base leading-8',
    lg: 'text-lg leading-8',
    xl: 'text-xl leading-9',
    '2xl': 'text-2xl leading-10',
    '3xl': 'text-3xl leading-[3rem]',
  };

  return (
    <div className="flex flex-col min-h-[90vh] pb-40 animate-fade-in">
      {/* Top Sticky Notebook Bar: Open Song Tabs + Reader Controls */}
      <div className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 shadow-lg pt-safe-status">
        {/* Binder Tabs Bar for Open Songs */}
        <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto bg-neutral-950 border-b border-neutral-800/80">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-t-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border-t border-x border-neutral-800 shrink-0"
            title="Back to Notebook Index"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Index</span>
          </button>

          {openSongs.map((tabSong, idx) => {
            const isActive = tabSong.id === currentSong.id;
            const accent = TAB_ACCENTS[idx % TAB_ACCENTS.length];
            return (
              <div
                key={tabSong.id}
                onClick={() => onSelectOpenSong && onSelectOpenSong(tabSong)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl border-t-2 border-x cursor-pointer shrink-0 max-w-[180px] transition-all ${accent} ${
                  isActive
                    ? 'bg-neutral-900 border-x-neutral-700 text-amber-300 font-bold shadow-sm -mb-px pb-2'
                    : 'bg-neutral-950/60 border-x-neutral-800/70 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                }`}
              >
                <span className="text-xs truncate">{tabSong.trackName}</span>
                {onCloseOpenSong && (
                  <button
                    onClick={(e) => onCloseOpenSong(tabSong.id, e)}
                    className="p-0.5 rounded hover:bg-neutral-700/60 text-neutral-500 hover:text-red-400"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 shrink-0 ml-0.5"
            title="Open another song from Index"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Notebook Sheet Toolbar: Font Size, Auto-Scroll, Favorite, Edit */}
        <div className="px-3 py-2 bg-neutral-900/95 flex items-center justify-between gap-2 flex-wrap">
          {/* Font Size Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const sizes: FontSizeOption[] = ['sm', 'base', 'lg', 'xl', '2xl', '3xl'];
                const currIdx = sizes.indexOf(fontSize);
                if (currIdx > 0) setFontSize(sizes[currIdx - 1]);
              }}
              className="px-2.5 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center active:scale-95"
              title="Decrease Font Size"
            >
              A-
            </button>
            <button
              onClick={() => {
                const sizes: FontSizeOption[] = ['sm', 'base', 'lg', 'xl', '2xl', '3xl'];
                const currIdx = sizes.indexOf(fontSize);
                if (currIdx < sizes.length - 1) setFontSize(sizes[currIdx + 1]);
              }}
              className="px-2.5 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center active:scale-95"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Hands-Free Auto-Scroll Controls */}
          <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-neutral-800 rounded-xl px-2 py-1">
            <button
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                isAutoScrolling
                  ? 'bg-amber-500 text-black'
                  : 'bg-neutral-800 text-neutral-300 hover:text-neutral-100'
              }`}
            >
              {isAutoScrolling ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>Scroll</span>
            </button>

            {[1, 2, 3, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setTeleprompterSpeed(spd)}
                className={`w-6 h-6 rounded-md text-[11px] font-bold transition-colors ${
                  teleprompterSpeed === spd
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Right Action Icons: Favorite, Edit, Screen Awake */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleFav}
              className={`p-1.5 rounded-lg transition-all ${
                currentSong.isFavorite ? 'text-amber-400 bg-amber-950/40' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Favorite"
            >
              <Star className={`w-4 h-4 ${currentSong.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            {onEditSong && (
              <button
                onClick={() => onEditSong(currentSong)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                title="Edit Lyrics"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsWakeLockActive(!isWakeLockActive)}
              title={isWakeLockActive ? 'Screen Awake ON' : 'Screen Awake OFF'}
              className={`p-1.5 rounded-lg transition-all ${
                isWakeLockActive ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-500'
              }`}
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notebook Page Body */}
      <div ref={containerRef} className="flex-1 px-3 sm:px-6 py-4 max-w-2xl w-full mx-auto">
        <div className="relative bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Left Red/Amber Notebook Margin Line */}
          <div className="absolute top-0 bottom-0 left-6 sm:left-8 w-px bg-amber-500/25 pointer-events-none" />

          {/* Notebook Binder Holes Visual Accent */}
          <div className="absolute top-6 bottom-6 left-2 sm:left-3 flex flex-col justify-between pointer-events-none opacity-40">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-neutral-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-neutral-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-neutral-700" />
          </div>

          {/* Song Title & Artist Header on the Notebook Sheet */}
          <div className="pl-10 sm:pl-12 pr-5 pt-5 pb-4 border-b border-neutral-800/90 bg-neutral-900">
            <h1 className="text-lg sm:text-xl font-extrabold text-neutral-100 break-words leading-snug">
              {currentSong.trackName}
            </h1>
            <p className="text-xs sm:text-sm text-amber-400/90 font-semibold break-words mt-1">
              {currentSong.artistName}
              {currentSong.albumName ? (
                <span className="text-neutral-400 font-normal"> • {currentSong.albumName}</span>
              ) : null}
            </p>
          </div>

          {/* Lyrics Content Area */}
          <div className="pl-10 sm:pl-12 pr-5 py-6">
            <div className={`whitespace-pre-wrap break-words text-neutral-100 font-sans tracking-wide ${fontSizes[fontSize]}`}>
              {cleanLyrics}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
