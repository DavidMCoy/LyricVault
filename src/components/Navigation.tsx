import React from 'react';
import { Search, BookMarked, ListMusic, BookOpen, Settings, Wifi, WifiOff } from 'lucide-react';

export type NavTab = 'search' | 'library' | 'playlists' | 'player' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOnline: boolean;
  hasActiveSong: boolean;
  activeSongTitle?: string;
  openTabsCount?: number;
}

export const BottomNavigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  openTabsCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'library', label: 'Index', icon: <BookMarked className="w-5 h-5" /> },
    { id: 'player', label: 'Notebook', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'playlists', label: 'Setlists', icon: <ListMusic className="w-5 h-5" /> },
    { id: 'search', label: 'Look Up', icon: <Search className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.id === 'player' && openTabsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-amber-500 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {openTabsCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="w-6 h-1 bg-amber-500 rounded-full mt-0.5 animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

interface HeaderProps {
  title: string;
  isOnline: boolean;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<HeaderProps> = ({ title, isOnline, rightAction }) => {
  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md shadow-amber-950">
          <BookOpen className="w-4 h-4 text-black stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-100 leading-none">{title}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <Wifi className="w-2.5 h-2.5" /> Online (Lyric Lookup Ready)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                <WifiOff className="w-2.5 h-2.5" /> Offline Lyric Notebook
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightAction}
      </div>
    </header>
  );
};
