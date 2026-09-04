import urllib.request
import json
import re
import time

url = "https://open.spotify.com/embed/playlist/6i2Qd6OpeRBAzxfscNXeWp"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        
    # Look for __NEXT_DATA__
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">([^<]+)</script>', html)
    if match:
        data = json.loads(match.group(1))
        # Navigate to entity
        entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
        tracklist = entity.get('trackList', [])
        print(f"Found {len(tracklist)} tracks in embed data!")
        for idx, t in enumerate(tracklist[:10]):
            print(f"{idx+1}. {t.get('title')} - {t.get('subtitle')}")
        
        # Save tracklist to json
        with open("spotify_tracks.json", "w", encoding="utf-8") as f:
            json.dump(tracklist, f, indent=2)
    else:
        print("NEXT_DATA not found, searching regex...")
except Exception as e:
    print("Error:", e)
