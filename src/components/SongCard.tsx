import React, { useState } from 'react';
import { BookOpen, Bookmark, BookmarkCheck, Star, MoreVertical, Download, FileText, Edit3, Trash2, ListPlus } from 'lucide-react';
import { Song, SearchResultItem } from '../types/lyrics';
import { downloadSongLyrics } from '../utils/exportImport';

interface SongCardProps {
  song: Song | SearchResultItem;
  isSaved: boolean;
  isFavorite?: boolean;
  onSelect: () => void;
  onSave?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onAddToPlaylist?: () => void;
  showSaveButton?: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isSaved,
  isFavorite = false,
  onSelect,
  onSave,
  onToggleFavorite,
  onDelete,
  onEdit,
  onAddToPlaylist,
  showSaveButton = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group bg-neutral-900/85 hover:bg-neutral-850 border border-neutral-800/90 hover:border-amber-500/40 border-l-4 border-l-amber-500/70 rounded-r-2xl rounded-l-md p-3.5 transition-all duration-200 shadow-sm active:bg-neutral-800">
      {/* Top Header Row: Notebook Badge on Left; Open, Save, Star, Dot-Dot-Dot on Right */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800/60">
        {/* Left: Notebook Sheet Icon & Status */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Lyric Sheet
          </span>

          {isSaved && showSaveButton && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-950/60 border border-emerald-900/40 text-emerald-400">
              IN NOTEBOOK
            </span>
          )}
        </div>

        {/* Right: Open, Bookmark, Star, and More (Dot Dot Dot) Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Open Lyric Sheet Button */}
          <button
            onClick={onSelect}
            aria-label="Open lyric sheet"
            className="px-2.5 h-8 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-amber-500/30"
            title="Open Lyric Sheet"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read</span>
          </button>

          {/* Save / Bookmark Button */}
          {showSaveButton && onSave && (
            <button
              onClick={onSave}
              aria-label={isSaved ? "Saved to Notebook" : "Save to Notebook"}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                isSaved
                  ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/50'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800'
              }`}
              title={isSaved ? "Saved to Notebook" : "Save to Notebook"}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}

          {/* Favorite Star */}
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              aria-label="Toggle Favorite"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                isFavorite
                  ? 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          {/* More Actions Menu (Dot Dot Dot) */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="More options"
              className="w-8 h-8 rounded-xl text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800 flex items-center justify-center transition-all active:scale-90"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-9 z-30 w-48 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl py-1 text-xs animate-fade-in">
                  {onAddToPlaylist && (
                    <button
                      onClick={() => { setShowMenu(false); onAddToPlaylist(); }}
                      className="w-full text-left px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 flex items-center gap-2.5"
                    >
                      <ListPlus className="w-4 h-4 text-amber-400" />
                      Add to Setlist
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      downloadSongLyrics(song as Song, 'txt');
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 flex items-center gap-2.5"
                  >
                    <Download className="w-4 h-4 text-neutral-400" />
                    Export Text (.TXT)
                  </button>

                  {onEdit && (
                    <button
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      className="w-full text-left px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 flex items-center gap-2.5"
                    >
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      Edit Lyrics
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={() => { setShowMenu(false); onDelete(); }}
                      className="w-full text-left px-3.5 py-2.5 text-red-400 hover:bg-red-950/40 flex items-center gap-2.5 border-t border-neutral-800"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove from Notebook
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Bottom Area (Full Width for Song Title, Artist, and Album) */}
      <div 
        onClick={onSelect} 
        className="pt-2.5 cursor-pointer select-none group/title"
      >
        <h3 className="text-sm sm:text-base font-bold text-neutral-100 break-words leading-snug group-hover/title:text-amber-400 transition-colors">
          {song.trackName || (song as any).name || 'Unknown Track'}
        </h3>
        <p className="text-xs text-neutral-400 break-words leading-relaxed mt-1">
          <span className="font-semibold text-neutral-300">{song.artistName}</span>
          {song.albumName ? <span className="text-neutral-500"> • {song.albumName}</span> : ''}
        </p>
      </div>
    </div>
  );
};
