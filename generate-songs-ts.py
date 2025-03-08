import json
import operator
import os
from datetime import datetime
from hashlib import sha256


def main():
    BASE_DIR = os.path.join("public", "audio")
    result = []
    for artist in os.listdir(BASE_DIR):
        artist_dir = os.path.join(BASE_DIR, artist)
        if not os.path.isdir(artist_dir):
            continue
        for track in os.listdir(artist_dir):
            track_path = os.path.join(artist_dir, track)
            if not os.path.isfile(track_path) or not track.endswith(".mp3"):
                continue
            cover = os.path.join("covers", "default.jpg")
            if os.path.exists(
                os.path.join("public", "covers", artist, track[0:-4] + ".jpg")
            ):
                cover = os.path.join("covers", artist, track[0:-4] + ".jpg")
            elif os.path.exists(
                os.path.join("public", "covers", artist, "default.jpg")
            ):
                cover = os.path.join("covers", artist, "default.jpg")
            result.append(
                {
                    "id": sha256(bytes(f"{artist} - {track}".encode())).hexdigest(),
                    "title": track[0:-4].replace("-", ""),
                    "author": artist,
                    "cover": "/" + cover.replace("\\", "/"),
                    "decription": "wntn music <3",
                    "song": f"/audio/{artist}/{track}",
                }
            )
        result.sort(key=operator.itemgetter("title"))
    with open("src/assets/songs.ts", "w") as f:
        f.write(
            f"/** This file is generated at {datetime.now()} by generate-songs-ts.py. PLEASE DO NOT EDIT */\nexport const Songs = {json.dumps(result, indent=2)};"
        )
    with open("public/track-list.json", "w") as f:
        f.write(json.dumps(result, indent=4))


if __name__ == "__main__":
    main()
