#!/usr/bin/env python3
"""
Advanced Song Generator with Versioning Support
Supports multiple audio formats (MP3, WAV, FLAC) and versioning system
"""

import json
import operator
import os
import re
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class SongVersion:
    """Represents a version of a song"""
    def __init__(self, format: str, quality: str, path: str, size: int = 0):
        self.format = format.upper()
        self.quality = quality
        self.path = path
        self.size = size
    
    def to_dict(self) -> Dict:
        return {
            "format": self.format,
            "quality": self.quality,
            "path": self.path,
            "size": self.size
        }


class Song:
    """Represents a song with multiple versions"""
    def __init__(self, title: str, artist: str, cover: str, description: str = ""):
        self.title = title
        self.artist = artist
        self.cover = cover
        self.description = description
        self.versions: List[SongVersion] = []
        self.id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate unique ID for the song"""
        content = f"{self.artist} - {self.title}"
        return sha256(content.encode()).hexdigest()[:16]
    
    def add_version(self, version: SongVersion):
        """Add a version to the song"""
        self.versions.append(version)
    
    def get_default_version(self) -> Optional[SongVersion]:
        """Get the default version (prefer original > demo > any)"""
        if not self.versions:
            return None
        
        # Sort by preference: original > demo > others
        quality_order = {"original": 0, "demo": 1, "remaster": 2, "live": 3}
        
        def sort_key(version):
            return (quality_order.get(version.quality, 999), version.format)
        
        return sorted(self.versions, key=sort_key)[0]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        default_version = self.get_default_version()
        return {
            "id": self.id,
            "title": self.title,
            "author": self.artist,
            "cover": self.cover,
            "description": self.description,
            "song": default_version.path if default_version else "",
            "versions": [v.to_dict() for v in self.versions],
            "defaultFormat": default_version.format if default_version else "",
            "defaultQuality": default_version.quality if default_version else ""
        }


class Artist:
    """Represents an artist with metadata"""
    def __init__(self, name: str, bio: str = "", social: Dict = None):
        self.name = name
        self.bio = bio
        self.social = social or {}
        self.songs: List[Song] = []
    
    def add_song(self, song: Song):
        """Add a song to the artist"""
        self.songs.append(song)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "name": self.name,
            "bio": self.bio,
            "social": self.social,
            "songCount": len(self.songs),
            "songs": [song.to_dict() for song in self.songs]
        }


class AdvancedSongGenerator:
    """Advanced song generator with versioning support"""
    
    SUPPORTED_FORMATS = {'.mp3', '.wav', '.flac'}
    QUALITY_PATTERNS = {
        'original': r'(original|orig)',
        'demo': r'(demo|preview)',
        'remaster': r'(remaster|remastered)',
        'live': r'(live|concert)',
        'acoustic': r'(acoustic|unplugged)',
        'instrumental': r'(instrumental|karaoke)'
    }
    
    def __init__(self, base_dir: str = "public"):
        self.base_dir = Path(base_dir)
        self.audio_dir = self.base_dir / "audio"
        self.covers_dir = self.base_dir / "covers"
        self.artists: Dict[str, Artist] = {}
    
    def _extract_quality(self, filename: str) -> str:
        """Extract quality from filename"""
        filename_lower = filename.lower()
        
        for quality, pattern in self.QUALITY_PATTERNS.items():
            if re.search(pattern, filename_lower):
                return quality
        
        return "original"  # Default quality
    
    def _get_file_size(self, file_path: Path) -> int:
        """Get file size in bytes"""
        try:
            return file_path.stat().st_size
        except OSError:
            return 0
    
    def _find_cover(self, artist: str, track_name: str) -> str:
        """Find cover image for a track"""
        # Try different cover naming patterns
        cover_patterns = [
            f"{track_name}.jpg",
            f"{track_name}.png",
            f"{track_name}.webp",
            "default.jpg",
            "default.png"
        ]
        
        artist_covers_dir = self.covers_dir / artist
        
        for pattern in cover_patterns:
            cover_path = artist_covers_dir / pattern
            if cover_path.exists():
                return f"/covers/{artist}/{pattern}"
        
        # Fallback to global default
        return "/covers/default.jpg"
    
    def _clean_track_name(self, filename: str) -> str:
        """Clean track name from filename"""
        # Remove file extension
        name = Path(filename).stem
        
        # Remove quality indicators
        for quality in self.QUALITY_PATTERNS.keys():
            pattern = rf'\b{quality}\b'
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # Clean up extra spaces and dashes
        name = re.sub(r'[-_]+', ' ', name)
        name = re.sub(r'\s+', ' ', name)
        name = name.strip()
        
        return name.title()
    
    def _parse_artist_info(self, artist_dir: Path) -> Tuple[str, Dict]:
        """Parse artist information from markdown file"""
        info_file = artist_dir / "info.md"
        bio = ""
        social = {}
        
        if info_file.exists():
            try:
                with open(info_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Simple markdown parsing for bio
                lines = content.split('\n')
                in_bio = False
                current_section = ""
                
                for line in lines:
                    line = line.strip()
                    if line.startswith('#'):
                        current_section = line[1:].strip().lower()
                        in_bio = current_section in ['bio', 'about', 'description']
                    elif in_bio and line:
                        bio += line + '\n'
                    elif line.startswith('-') and ':' in line:
                        # Parse social links
                        key, value = line[1:].split(':', 1)
                        social[key.strip()] = value.strip()
            
            except Exception as e:
                print(f"Warning: Could not parse {info_file}: {e}")
        
        return bio.strip(), social
    
    def scan_artists(self):
        """Scan all artists and their songs"""
        if not self.audio_dir.exists():
            print(f"Audio directory {self.audio_dir} does not exist!")
            return
        
        for artist_dir in self.audio_dir.iterdir():
            if not artist_dir.is_dir():
                continue
            
            artist_name = artist_dir.name
            print(f"Processing artist: {artist_name}")
            
            # Parse artist info
            bio, social = self._parse_artist_info(artist_dir)
            artist = Artist(artist_name, bio, social)
            
            # Group files by track name
            track_files: Dict[str, List[Path]] = {}
            
            for file_path in artist_dir.iterdir():
                if not file_path.is_file():
                    continue
                
                if file_path.suffix.lower() not in self.SUPPORTED_FORMATS:
                    continue
                
                # Extract track name (remove quality indicators)
                track_name = self._clean_track_name(file_path.name)
                
                if track_name not in track_files:
                    track_files[track_name] = []
                
                track_files[track_name].append(file_path)
            
            # Create songs with versions
            for track_name, files in track_files.items():
                song = Song(
                    title=track_name,
                    artist=artist_name,
                    cover=self._find_cover(artist_name, track_name),
                    description="wntn music <3"
                )
                
                # Add all versions of the song
                for file_path in files:
                    quality = self._extract_quality(file_path.name)
                    format_ext = file_path.suffix[1:].upper()
                    size = self._get_file_size(file_path)
                    
                    version = SongVersion(
                        format=format_ext,
                        quality=quality,
                        path=f"/audio/{artist_name}/{file_path.name}",
                        size=size
                    )
                    
                    song.add_version(version)
                
                artist.add_song(song)
            
            self.artists[artist_name] = artist
    
    def generate_songs_file(self):
        """Generate the songs.ts file"""
        all_songs = []
        for artist in self.artists.values():
            for song in artist.songs:
                all_songs.append(song.to_dict())
        
        # Sort songs by title
        all_songs.sort(key=operator.itemgetter("title"))
        
        # Generate TypeScript file
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        content = f"""/**
 * This file is generated at {timestamp} by generate-songs-advanced.py
 * PLEASE DO NOT EDIT MANUALLY
 */

export const Songs = {json.dumps(all_songs, indent=2)};

export const Artists = {json.dumps({name: artist.to_dict() for name, artist in self.artists.items()}, indent=2)};

export type SongVersion = {{
  format: string;
  quality: string;
  path: string;
  size: number;
}};

export type Song = {{
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  song: string;
  versions: SongVersion[];
  defaultFormat: string;
  defaultQuality: string;
}};

export type Artist = {{
  name: string;
  bio: string;
  social: Record<string, string>;
  songCount: number;
  songs: Song[];
}};
"""
        
        output_file = Path("src/assets/songs.ts")
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Generated {output_file} with {len(all_songs)} songs from {len(self.artists)} artists")
    
    def generate_track_list(self):
        """Generate public track-list.json"""
        all_songs = []
        for artist in self.artists.values():
            for song in artist.songs:
                all_songs.append(song.to_dict())
        
        all_songs.sort(key=operator.itemgetter("title"))
        
        output_file = self.base_dir / "track-list.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_songs, f, indent=4)
        
        print(f"Generated {output_file}")
    
    def generate_artists_list(self):
        """Generate public artists.json"""
        artists_data = {name: artist.to_dict() for name, artist in self.artists.items()}
        
        output_file = self.base_dir / "artists.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(artists_data, f, indent=4)
        
        print(f"Generated {output_file}")
    
    def run(self):
        """Run the complete generation process"""
        print("🎵 Advanced Song Generator Starting...")
        print(f"Scanning directory: {self.audio_dir}")
        
        self.scan_artists()
        self.generate_songs_file()
        self.generate_track_list()
        self.generate_artists_list()
        
        print("✅ Generation complete!")
        print(f"📊 Statistics:")
        print(f"   - Artists: {len(self.artists)}")
        total_songs = sum(len(artist.songs) for artist in self.artists.values())
        print(f"   - Songs: {total_songs}")
        total_versions = sum(
            len(song.versions) 
            for artist in self.artists.values() 
            for song in artist.songs
        )
        print(f"   - Total versions: {total_versions}")


def main():
    generator = AdvancedSongGenerator()
    generator.run()


if __name__ == "__main__":
    main()


