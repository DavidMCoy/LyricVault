import json
import urllib.request
import urllib.parse
import re
import time
import os

with open("spotify_tracks.json", "r", encoding="utf-8") as f:
    spotify_tracks = json.load(f)

def clean_title(title):
    t = re.sub(r' - (?:Remastered|Live|Mono|Stereo|From|Single Version).*', '', title, flags=re.IGNORECASE)
    t = re.sub(r' \((?:Remastered|Live|Mono|Stereo|From|Single Version).*?\)', '', t, flags=re.IGNORECASE)
    return t.strip()

songs = []
song_ids = []

headers = {"User-Agent": "LyricVault-Importer/1.0 (https://github.com/lyricvault)"}

print(f"Starting LRCLIB fetch for {len(spotify_tracks)} tracks...")

for idx, item in enumerate(spotify_tracks):
    orig_title = item.get("title", "")
    artist = item.get("subtitle", "")
    title = clean_title(orig_title)
    
    song_id = f"spotify-top100-{idx+1:03d}"
    
    synced_lyrics = ""
    plain_lyrics = ""
    duration = item.get("duration", 0) / 1000.0 if item.get("duration") else 0
    album = ""
    
    # Try exact lookup first
    params = {"track_name": title, "artist_name": artist}
    url = f"https://lrclib.net/api/get?{urllib.parse.urlencode(params)}"
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                synced_lyrics = data.get("syncedLyrics") or ""
                plain_lyrics = data.get("plainLyrics") or ""
                if not duration and data.get("duration"):
                    duration = data.get("duration")
                album = data.get("albumName") or ""
    except Exception:
        pass

    # If no synced lyrics, fallback to search query
    if not synced_lyrics:
        try:
            q_url = f"https://lrclib.net/api/search?q={urllib.parse.quote(f'{artist} {title}')}"
            req = urllib.request.Request(q_url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    results = json.loads(resp.read().decode('utf-8'))
                    if results and len(results) > 0:
                        first = results[0]
                        synced_lyrics = first.get("syncedLyrics") or ""
                        plain_lyrics = first.get("plainLyrics") or ""
                        if not duration and first.get("duration"):
                            duration = first.get("duration")
                        album = first.get("albumName") or ""
        except Exception:
            pass
            
    song_obj = {
        "id": song_id,
        "trackName": orig_title,
        "artistName": artist,
        "albumName": album,
        "duration": round(duration),
        "instrumental": False,
        "syncedLyrics": synced_lyrics if synced_lyrics else None,
        "plainLyrics": plain_lyrics if plain_lyrics else (f"Lyrics for {orig_title} by {artist}"),
        "source": "lrclib",
        "addedAt": int(time.time() * 1000) - (len(spotify_tracks) - idx) * 1000,
        "updatedAt": int(time.time() * 1000),
        "isFavorite": idx < 10,
        "tags": ["Top 100", "Classics"],
        "offsetMs": 0
    }
    
    songs.append(song_obj)
    song_ids.append(song_id)
    
    has_lrc = "[SYNCED]" if synced_lyrics else ("[PLAIN]" if plain_lyrics else "[MISSING]")
    print(f"[{idx+1}/{len(spotify_tracks)}] {artist} - {title} -> {has_lrc}")
    
    time.sleep(0.06)

playlist_obj = {
    "id": "pl-spotify-top100",
    "name": "Top 100 Greatest Songs of All Time",
    "description": "100 iconic songs imported from Spotify",
    "songIds": song_ids,
    "createdAt": int(time.time() * 1000),
    "updatedAt": int(time.time() * 1000),
    "color": "#10b981",
    "icon": "trophy"
}

backup = {
    "version": 1,
    "exportedAt": int(time.time() * 1000),
    "songs": songs,
    "playlists": [playlist_obj]
}

with open("public/spotify_top100_backup.json", "w", encoding="utf-8") as f:
    json.dump(backup, f, indent=2)

with open("src/data/spotifyTop100.json", "w", encoding="utf-8") as f:
    json.dump(backup, f, indent=2)

print(f"\nDone! Successfully imported {len(songs)} songs.")
