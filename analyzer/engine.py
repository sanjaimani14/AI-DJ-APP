"""
analyzer/engine.py - Audio Analysis Pipeline Coordinator
Coordinates audio feature extraction, ID3 metadata reading, SQLite persistent caching,
and re-analysis operations.
"""

import os
import uuid
import logging
from typing import Dict, Any, Optional, List, Callable

from database.db import db_instance, calculate_file_hash
from analyzer.audio_features import extract_audio_features

logger = logging.getLogger("ai_dj.engine")


def extract_metadata_tags(file_path: str) -> Dict[str, str]:
    """Extract ID3 / Vorbis tags or derive clean fallback artist/title from filename."""
    clean_name = os.path.splitext(os.path.basename(file_path))[0]
    title = clean_name
    artist = "Unknown Artist"
    album = "Live Set"
    genre = "Electronic"

    # Try extracting via mutagen
    try:
        import mutagen
        audio = mutagen.File(file_path)
        if audio and audio.tags:
            # Common tag keys across ID3 / FLAC / MP4
            for t_key in ["TIT2", "title", "\xa9nam", "TITLE"]:
                if t_key in audio.tags:
                    val = audio.tags[t_key]
                    title = str(val[0]) if isinstance(val, (list, tuple)) else str(val)
                    break

            for a_key in ["TPE1", "artist", "\xa9ART", "ARTIST"]:
                if a_key in audio.tags:
                    val = audio.tags[a_key]
                    artist = str(val[0]) if isinstance(val, (list, tuple)) else str(val)
                    break

            for g_key in ["TCON", "genre", "\xa9gen", "GENRE"]:
                if g_key in audio.tags:
                    val = audio.tags[g_key]
                    genre = str(val[0]) if isinstance(val, (list, tuple)) else str(val)
                    break

            for al_key in ["TALB", "album", "\xa9alb", "ALBUM"]:
                if al_key in audio.tags:
                    val = audio.tags[al_key]
                    album = str(val[0]) if isinstance(val, (list, tuple)) else str(val)
                    break
    except Exception as e:
        logger.debug(f"Mutagen tag extraction fallback for {file_path}: {e}")

    # Fallback to hyphen split if artist remained default
    if artist == "Unknown Artist" and "-" in clean_name:
        parts = clean_name.split("-", 1)
        artist = parts[0].strip()
        title = parts[1].strip()

    return {
        "title": title,
        "artist": artist,
        "album": album,
        "genre": genre
    }


class AudioAnalysisEngine:
    """Core Audio Analysis Pipeline."""

    def __init__(self, db=db_instance):
        self.db = db

    def analyze_file(
        self,
        file_path: str,
        force_reanalyze: bool = False,
        track_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a single audio file and cache results in SQLite.
        If file is already cached and unchanged, returns cached record instantly.
        """
        norm_path = os.path.normpath(file_path).replace("\\", "/")

        if not os.path.exists(norm_path):
            return {
                "id": track_id or f"trk-{uuid.uuid4().hex[:8]}",
                "file_path": norm_path,
                "status": "failed",
                "error_message": f"File not found on disk: {norm_path}",
                "cached": False
            }

        # 1. Fast Cache Check: Compare size & mtime without re-hashing
        if not force_reanalyze:
            cached_track = self.db.is_cached_and_valid(norm_path)
            if cached_track and cached_track.get("status") == "analyzed":
                cached_track["cached"] = True
                return cached_track

        # 2. File stats & SHA-256 hash
        stat = os.stat(norm_path)
        file_size = stat.st_size
        file_mtime = stat.st_mtime
        file_hash = calculate_file_hash(norm_path)

        # 3. Check if identical file exists under different name/path
        if not force_reanalyze:
            cached_by_hash = self.db.get_track_by_hash(file_hash)
            if cached_by_hash and cached_by_hash.get("status") == "analyzed":
                # Copy analysis to this file path
                cached_by_hash["file_path"] = norm_path
                cached_by_hash["file_size"] = file_size
                cached_by_hash["file_mtime"] = file_mtime
                saved = self.db.save_track(cached_by_hash)
                saved["cached"] = True
                return saved

        # 4. Extract ID3 metadata tags
        metadata = extract_metadata_tags(norm_path)

        # 5. Execute real audio feature extraction
        features = extract_audio_features(norm_path)

        # 6. Compose complete track record
        # Retain existing track ID if known
        existing = self.db.get_track_by_path(norm_path)
        final_id = track_id or (existing.get("id") if existing else f"trk-{uuid.uuid4().hex[:8]}")

        track_record = {
            "id": final_id,
            "file_path": norm_path,
            "file_hash": file_hash,
            "file_size": file_size,
            "file_mtime": file_mtime,
            "title": metadata["title"],
            "artist": metadata["artist"],
            "album": metadata["album"],
            "genre": metadata["genre"],
            "duration": features.get("duration"),
            "bpm": features.get("bpm"),
            "tempo_confidence": features.get("tempo_confidence"),
            "key_camelot": features.get("key_camelot"),
            "key_musical": features.get("key_musical"),
            "key_confidence": features.get("key_confidence"),
            "energy": features.get("energy"),
            "loudness_lufs": features.get("loudness_lufs"),
            "beat_positions_json": features.get("beat_positions_json", []),
            "beat_confidence": features.get("beat_confidence"),
            "intro_start": features.get("intro_start", 0.0),
            "intro_end": features.get("intro_end", 0.0),
            "outro_start": features.get("outro_start", 0.0),
            "outro_end": features.get("outro_end", 0.0),
            "waveform_json": features.get("waveform_json", []),
            "status": features.get("status", "analyzed"),
            "error_message": features.get("error_message")
        }

        # 7. Persist to SQLite cache
        saved_record = self.db.save_track(track_record)
        saved_record["cached"] = False
        return saved_record

    def reanalyze_track(self, file_path_or_id: str) -> Dict[str, Any]:
        """Force reanalysis of an audio track, bypassing the cache."""
        track = self.db.get_track_by_path(file_path_or_id)
        if not track:
            # Maybe it's a track ID
            tracks = self.db.get_all_tracks()
            for t in tracks:
                if t.get("id") == file_path_or_id:
                    track = t
                    break

        if not track:
            # Treat as file path directly
            return self.analyze_file(file_path_or_id, force_reanalyze=True)

        return self.analyze_file(track["file_path"], force_reanalyze=True, track_id=track.get("id"))

    def batch_analyze(
        self,
        file_paths: List[str],
        force_reanalyze: bool = False,
        progress_callback: Optional[Callable[[int, int, str, Dict[str, Any]], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze a list of audio files with progress tracking callback.
        progress_callback signature: (completed_count, total_count, current_file, result)
        """
        results = []
        total = len(file_paths)
        for idx, path in enumerate(file_paths):
            res = self.analyze_file(path, force_reanalyze=force_reanalyze)
            results.append(res)
            if progress_callback:
                progress_callback(idx + 1, total, path, res)
        return results

    def get_all_cached_tracks(self) -> List[Dict[str, Any]]:
        """Return all tracks currently stored in the SQLite library cache."""
        return self.db.get_all_tracks()


# Global singleton instance
engine_instance = AudioAnalysisEngine()
