# LyricVault (v1.6.0) — Standalone Offline Android Lyrics Notebook

**LyricVault** is a standalone, offline-first Android application designed as a physical **Tabbed Lyric Notebook**. It lets you search, store locally, organize, and read song lyrics offline, powered by **LRCLIB** and open lyrics databases.

- **Project Path**: `C:\projects\active\LyricVault`
- **GitHub Repository**: `https://github.com/DavidMCoy/LyricVault`

---

## 🌟 Key Features (v1.6.0)

### 1. Tabbed Lyric Notebook & Address-Book A–Z Index
- **Physical Address-Book `A–Z` Index Tabs**: Vertical index tabs (`ALL`, `★`, `A`–`Z`, `#`) along the right edge of the Index screen let you jump directly to any letter or favorites.
- **Large Open Song Binder Tabs**: Keep multiple songs open at once in the Notebook view and switch between them or close them easily with 50% larger touch-friendly binder tabs.
- **Simplified Notebook Sheet**: Clean, distraction-free lyric sheet with font size controls (`A-` / `A+`), hands-free auto-scroll (`.5x`, `.75x`, `1x`, `2x`), favorite star, screen wake lock, and plain-text lyric editing.
- **Android Safe-Area Padding**: Built-in status bar (`pt-safe-status`) and navigation bar (`pb-safe-nav`) spacing so UI controls never crowd system bars.

### 2. Smart Band Deduplication, Sort Metadata Tags & Expanded LRCLIB Search
- **Canonical Artist Unification**: Automatically unifies artist spelling variations (e.g., `AC DC`, `Ac-Dc`, `AC-DC`, `AC/DC` → `AC/DC`; `Beatles` / `The Beatles` → `The Beatles`).
- **Dedicated Sort Tags (`artistSortName` & `trackSortName`)**: Bands starting with `"The "` are filed under their core name (`"The Beatles"` → `"Beatles, The"` under tab **`B`**; `"The Rolling Stones"` → `"Rolling Stones, The"` under tab **`R`**).
- **Expanded LRCLIB Artist Search**: Automatically deduplicates remaster/album versions in search results, provides dedicated Artist & Song Title filter fields, and includes a **"Find More Songs on LRCLIB"** button to pull 50–100+ unique songs per artist.
- **One-Tap Library Cleanup**: Run **"Deduplicate & Normalize Library"** in Settings anytime to merge duplicate artists and songs.

### 3. True 100% Offline Local Storage
- **IndexedDB (`LyricVaultDB`)**: Stores all lyrics, setlists, and linked audio files directly on your phone.
- **Safe In-Place APK Updates**: Installing a new `LyricVault.apk` updates the app in place without erasing your saved songs or setlists.
- **Preloaded "Top 100 Greatest Songs of All Time"**: Pre-seeded with 100 classic tracks and a ready-to-use setlist.

### 4. GitHub Cloud App Updater (Settings)
- **Live Version Check**: Checks `https://raw.githubusercontent.com/DavidMCoy/LyricVault/main/package.json` against the installed version (`v1.6.0`).
- **Direct APK Updates**: Download the latest `LyricVault.apk` directly from `https://github.com/DavidMCoy/LyricVault/raw/main/LyricVault.apk`.

---

## 🛠️ Build & Push Workflow (`build-and-push.ps1`)

To build the web assets, sync Capacitor, compile `LyricVault.apk` with Gradle, and push to GitHub in one step, run in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\projects\active\LyricVault\build-and-push.ps1"
```

### Local Wi-Fi APK Preview Server
To serve the project and `LyricVault.apk` over your local home Wi-Fi (`http://192.168.1.8:3000/LyricVault.apk`):

```powershell
cd "C:\projects\active\LyricVault"
npx.cmd vite preview --host --port 3000
```
