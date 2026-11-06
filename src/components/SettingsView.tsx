import React, { useState, useEffect } from 'react';
import { 
  Settings, HardDrive, Download, Upload, Trash2, Smartphone, 
  Database, Check, RefreshCw, Music, ListMusic, FileText, PieChart, Sparkles
} from 'lucide-react';
import { getStorageStats, db, importSpotifyTop100Data, deduplicateAndNormalizeDatabase } from '../services/db';
import { exportFullBackup, importFullBackup } from '../utils/exportImport';

export const SettingsView: React.FC = () => {
  const [stats, setStats] = useState<{
    songsCount: number;
    playlistsCount: number;
    audioCount: number;
    songsFormatted: string;
    playlistsFormatted: string;
    audioFormatted: string;
    totalFormatted: string;
    systemQuotaFormatted?: string;
    systemUsageFormatted?: string;
    percentUsed?: string;
  }>({
    songsCount: 0,
    playlistsCount: 0,
    audioCount: 0,
    songsFormatted: '0 B',
    playlistsFormatted: '0 B',
    audioFormatted: '0 B',
    totalFormatted: '0 B'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const INSTALLED_VERSION = '1.5.0';
  const GITHUB_APK_URL = 'https://github.com/DavidMCoy/LyricVault/raw/main/LyricVault.apk';
  const GITHUB_PKG_URL = 'https://raw.githubusercontent.com/DavidMCoy/LyricVault/main/package.json';
  const [latestGithubVersion, setLatestGithubVersion] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    if (navigator.onLine) {
      checkGithubUpdate();
    }
  }, []);

  const checkGithubUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckError(null);
    try {
      const res = await fetch(`${GITHUB_PKG_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pkg = await res.json();
      if (pkg && pkg.version) {
        setLatestGithubVersion(String(pkg.version));
      }
    } catch (e: any) {
      setUpdateCheckError('Could not reach GitHub (check internet connection).');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const s = await getStorageStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to load storage stats', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const handleExportBackup = async () => {
    await exportFullBackup();
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Restoring...');
      const res = await importFullBackup(file);
      setImportStatus(`Restored ${res.songsAdded} songs & ${res.playlistsAdded} playlists!`);
      await loadStats();
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      alert('Failed to import backup: ' + err.message);
      setImportStatus(null);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all offline songs and local cache? This cannot be undone.')) {
      await db.songs.clear();
      await db.playlists.clear();
      await db.audioCache.clear();
      await db.searchHistory.clear();
      await loadStats();
      alert('Local database wiped clean.');
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-36 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Settings & Phone Storage
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
          Monitor exact local storage consumption, backup library data, and manage offline phone settings.
        </p>

        {/* Storage Capacity Guide */}
        <div className="mt-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2 text-xs text-neutral-300 shadow-sm">
          <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
            <span>How Many Songs Can Your Phone Store?</span>
          </h4>
          <p className="text-neutral-300 leading-relaxed">
            Text and synchronized timestamps take up very little storage — an average .lrc song file is only 2 to 4 Kilobytes (KB).
          </p>
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-2.5 space-y-1 text-[11px]">
            <p className="text-neutral-300">
              • Storing <strong className="text-neutral-100 font-semibold">1,000 full songs</strong> takes only about <strong className="text-emerald-400">~3 MB</strong> of phone storage.
            </p>
            <p className="text-neutral-300">
              • Storing <strong className="text-neutral-100 font-semibold">10,000 full songs</strong> takes only about <strong className="text-emerald-400">~30 MB</strong>.
            </p>
          </div>
          <p className="text-neutral-400 leading-relaxed text-[11px]">
            On Android, IndexedDB allows your phone to store hundreds of thousands of songs locally without running out of space.
          </p>
        </div>
      </div>

      {/* Storage Space Consumption Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-200 flex items-center gap-2 uppercase tracking-wider">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            Local Database Storage Breakdown
          </h3>
          <button
            onClick={loadStats}
            disabled={isRefreshing}
            className="text-neutral-400 hover:text-emerald-400 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Recalculate storage"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Total Storage Banner */}
        <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-neutral-400 font-medium">Total Database Size on Phone</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">{stats.totalFormatted}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center">
            <PieChart className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Detailed Table of Storage Items */}
        <div className="space-y-2 text-xs">
          {/* Lyrics Table */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-200">Lyrics & LRC Metadata</p>
                <p className="text-[10px] text-neutral-400">{stats.songsCount} songs saved offline</p>
              </div>
            </div>
            <span className="font-mono text-neutral-200 font-bold text-xs">{stats.songsFormatted}</span>
          </div>

          {/* Setlists Table */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-950/80 text-teal-400 flex items-center justify-center shrink-0">
                <ListMusic className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-200">Setlists & Playlists</p>
                <p className="text-[10px] text-neutral-400">{stats.playlistsCount} playlists</p>
              </div>
            </div>
            <span className="font-mono text-neutral-200 font-bold text-xs">{stats.playlistsFormatted}</span>
          </div>

          {/* Audio Blobs Table */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center shrink-0">
                <Music className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-200">Linked Audio Files</p>
                <p className="text-[10px] text-neutral-400">{stats.audioCount} audio files cached</p>
              </div>
            </div>
            <span className="font-mono text-neutral-200 font-bold text-xs">{stats.audioFormatted}</span>
          </div>
        </div>

        {/* System Device Storage Quota */}
        {stats.systemQuotaFormatted && (
          <div className="bg-neutral-950/40 border border-neutral-800/60 rounded-xl p-3 space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex items-center justify-between">
              <span>Device Storage Allotted:</span>
              <span className="font-mono text-neutral-300 font-semibold">{stats.systemQuotaFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>App Storage In Use:</span>
              <span className="font-mono text-emerald-400 font-semibold">{stats.systemUsageFormatted}</span>
            </div>
          </div>
        )}
      </div>

      {/* Backup & Restore Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3.5 shadow-lg">
        <h3 className="text-xs font-bold text-neutral-200 flex items-center gap-2 uppercase tracking-wider">
          <Database className="w-4 h-4 text-emerald-400" />
          Data Backup & Transfer
        </h3>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Export your entire offline library and setlists into a single JSON file to backup or move to another phone.
        </p>

        <button
          onClick={async () => {
            setImportStatus('Importing Spotify Top 100...');
            const count = await importSpotifyTop100Data();
            await loadStats();
            setImportStatus(`Successfully synced ${count} songs from Spotify Top 100!`);
            setTimeout(() => setImportStatus(null), 4000);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 transition-colors active:scale-98 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Sync Spotify Top 100 Playlist (100 Songs)
        </button>

        <button
          onClick={async () => {
            setImportStatus('Normalizing artist names & sort tags...');
            const res = await deduplicateAndNormalizeDatabase();
            await loadStats();
            setImportStatus(
              `Cleaned library: ${res.normalizedCount} sort tags updated, ${res.duplicatesMerged} duplicate songs merged!`
            );
            setTimeout(() => setImportStatus(null), 5000);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-colors active:scale-98 shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-amber-400" />
          Deduplicate Bands & Update Sort Tags ("The" Filing)
        </button>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={handleExportBackup}
            className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export Full Backup (.JSON)
          </button>

          <label className="cursor-pointer flex-1 py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-2 transition-colors active:scale-98">
            <Upload className="w-4 h-4 text-blue-400" />
            Restore Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
            <Check className="w-3.5 h-3.5" />
            {importStatus}
          </p>
        )}
      </div>

      {/* Android Standalone App Update & Installation Card (GitHub Cloud) */}
      <div className="bg-gradient-to-br from-neutral-900 to-emerald-950/20 border border-emerald-900/40 rounded-3xl p-5 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>App Updates (GitHub Cloud)</span>
          </div>
          <button
            onClick={checkGithubUpdate}
            disabled={isCheckingUpdate}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-semibold text-neutral-200 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>

        {/* Version Comparison Banner */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <p className="text-neutral-400">
              Installed Version: <strong className="text-neutral-100 font-mono">v{INSTALLED_VERSION}</strong>
            </p>
            <p className="text-neutral-400">
              Latest on GitHub:{' '}
              <strong className="text-emerald-400 font-mono">
                {latestGithubVersion ? `v${latestGithubVersion}` : isCheckingUpdate ? 'Checking...' : '—'}
              </strong>
            </p>
          </div>
          <div>
            {latestGithubVersion && latestGithubVersion !== INSTALLED_VERSION ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider">
                Update Available
              </span>
            ) : latestGithubVersion === INSTALLED_VERSION ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                <Check className="w-3 h-3" /> Up to Date
              </span>
            ) : null}
          </div>
        </div>

        {updateCheckError && (
          <p className="text-[11px] text-amber-400">{updateCheckError}</p>
        )}

        <p className="text-xs text-neutral-300 leading-relaxed">
          Download the latest standalone <strong className="text-neutral-100">LyricVault.apk</strong> directly from your GitHub repository from anywhere — no home network or PC server required:
        </p>

        <a
          href={GITHUB_APK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-950/40"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          Download Latest APK from GitHub
        </a>

        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 text-[11px] text-neutral-400 space-y-1.5">
          <p className="font-semibold text-neutral-200">How to Update in Place (Keeps Your Database):</p>
          <ol className="list-decimal list-inside space-y-1 text-neutral-300">
            <li>Tap <strong className="text-emerald-400">"Download Latest APK from GitHub"</strong> above.</li>
            <li>Tap the downloaded <strong className="text-neutral-100">LyricVault.apk</strong> in your notifications or Downloads.</li>
            <li>Tap <strong className="text-emerald-400">"Update"</strong> — Android updates the app while preserving all of your saved songs and setlists!</li>
          </ol>
        </div>
      </div>

      {/* Database Reset Danger Zone */}
      <div className="bg-neutral-900/50 border border-red-950/50 rounded-3xl p-5 space-y-2">
        <h3 className="text-xs font-bold text-red-400 flex items-center gap-2 uppercase tracking-wider">
          <Trash2 className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Delete all stored lyrics, playlists, and cached audio files from this phone's database.
        </p>
        <button
          onClick={handleClearAllData}
          className="mt-2 py-2 px-3.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All Local Database
        </button>
      </div>
    </div>
  );
};
