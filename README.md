# LyricVault - Standalone Offline Android Lyrics Manager & Synchronized Player

**LyricVault** is a standalone, offline-first Android application designed to search, store locally, and display synchronized (.LRC) and plain song lyrics powered by **LRCLIB** and open lyrics databases.

It can be installed directly into your phone's **App Drawer** as a **native Android APK** with zero reliance on local networks or computers, or run as an offline Progressive Web App.

---

## 🌟 Key Features

### 1. Standalone Native Android App (.APK)
- **100% Self-Contained**: All HTML/CSS/JS, icons, font assets, and IndexedDB database engine are bundled directly inside the APK.
- **Zero Local Network Dependency**: Runs completely offline anywhere (in airplane mode, off the grid, or on stage) without needing your computer running.
- **Direct App Drawer Installation**: Installed APK has its own app icon, splash screen, and full system integration.

### 2. Preloaded "Top 100 Greatest Songs of All Time"
- Pre-seeded with 100 iconic rock and classic tracks (Eagles, Queen, Michael Jackson, The Beatles, Led Zeppelin, Nirvana, Elvis Presley, etc.).
- Line-by-line synchronized LRC timestamps and plain lyrics ready for instant offline playback.
- Pre-built **Top 100 Setlist** ready to practice or perform.

### 3. LRCLIB & Open Lyrics Database Engine
- **Direct Public API Access**: Instant fuzzy & exact search across millions of synchronized and plain lyrics via `https://lrclib.net` without requiring an API key.
- **One-Tap Offline Saving**: Tap "Save All Offline" to grab entire discographies into local storage before leaving Wi-Fi.
- **Synced LRC Timestamps**: Line-by-line time codes (`[mm:ss.xx]`) with karaoke glowing highlights and auto-scrolling.

### 4. Smart Library & Playlists Grouped by Artist
- **Artist Sections (A–Z)**: Saved songs are organized under collapsible Artist headings.
- **Collapsed by Default**: Opens with a clean, compact artist list. Tapping any artist expands only their tracks.
- **Expand All / Collapse All Toggle**: Instantly expand or collapse your whole library with a single tap.
- **Multi-Line Song Cards**: Action buttons (`Sound`, `Play`, `Save`, `Star`, `⋮`) are positioned on top, giving song titles, featured artists, and albums full width with zero truncation.

### 5. Performance Display Modes & Hardware Controls
- 🎤 **Karaoke / Synced Mode**: Smooth auto-scrolling with glowing active-line highlight, interactive line jumping (tap any line to seek), and timing offset adjustments (`±0.5s`).
- 📜 **Teleprompter Mode**: Hands-free auto-scrolling with variable speeds (`1x` to `4x`), adjustable font sizes (`A-` to `A+`), and pause on touch.
- ⚡ **Screen Wake Lock**: Automatically prevents your phone screen from dimming or locking while reading lyrics.
- 🎵 **Offline Audio Linking**: Link MP3/M4A/FLAC audio files from your phone's storage to play alongside synchronized lyrics.
- ⏱️ **Tap-to-Sync LRC Studio**: Play any song and tap `Stamp Line` in real-time to create or edit your own custom `.lrc` timestamps.

### 6. Storage Space Breakdown Dashboard
- Real-time byte-level storage calculator in **Settings**:
  - Exact storage used by **Lyrics & LRC Metadata**, **Setlists & Playlists**, and **Linked Audio Files**.
  - Device storage quota and usage indicator.
  - Complete JSON Library Backup & Restore.

---

## 📲 How to Install on Your Android Phone

### Method 1: Direct Download from Phone (Easiest)
1. On your phone, connect to Wi-Fi and open:
   ```text
   http://192.168.1.20:3000/LyricVault.apk
   ```
   *(Or go to `http://192.168.1.20:3000` -> **Settings** -> tap **"Download Standalone APK"**)*.
2. Tap the downloaded `.apk` file in your notifications or Files app.
3. Tap **Install** *(allow "Install unknown apps" if prompted)*.
4. Launch **LyricVault** from your Android **App Drawer**!

### Method 2: Transfer via USB Cable
1. Connect your phone to your PC via USB.
2. Copy `LyricVault.apk` from `C:\Users\David Coy\.gemini\antigravity\scratch\LyricVault\LyricVault.apk` to your phone's **Download** folder.
3. On your phone, open **Files**, tap `LyricVault.apk`, and tap **Install**.

---

## 🛠️ Build & Development Commands

From `C:\Users\David Coy\.gemini\antigravity\scratch\LyricVault`:

### 1. Run Unit Tests
```bash
npm test
```

### 2. Build Web / PWA Assets
```bash
npm run build
```

### 3. Run Local Preview Server
```bash
npm run preview -- --host --port 3000
```

### 4. Build Standalone Android APK (Gradle)
```bash
$env:JAVA_HOME = "$env:LOCALAPPDATA\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

npx cap sync android
cd android
.\gradlew.bat assembleDebug
```
The compiled APK will be output to `android/app/build/outputs/apk/debug/app-debug.apk` and copied to `LyricVault.apk`.
