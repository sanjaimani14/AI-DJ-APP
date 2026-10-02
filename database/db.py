"""
database/db.py - SQLite Database Access Layer for AI DJ
Provides persistent caching for audio analysis results so files are analyzed strictly once.
"""

import os
import sqlite3
import hashlib
import json
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("ai_dj.db")

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(DB_DIR, "dj_library.db")
SCHEMA_PATH = os.path.join(DB_DIR, "schema.sql")


def calculate_file_hash(file_path: str, chunk_size: int = 65536) -> str:
    """Calculate SHA-256 hash of a file efficiently."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


class DatabaseManager:
    """Manages SQLite persistent cache for track metadata and analysis."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn

    def execute_query(self, query: str, params: tuple = ()):
        conn = self.get_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                return cursor.fetchall()
        finally:
            conn.close()

    def _init_db(self) -> None:
        """Initialize database tables from schema.sql and apply migrations if needed."""
        conn = self.get_connection()
        try:
            with conn:
                cursor = conn.cursor()
                if os.path.exists(SCHEMA_PATH):
                    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                        cursor.executescript(f.read())
                
                # Migration check: Ensure newly added columns exist in older tables
                cursor.execute("PRAGMA table_info(tracks)")
                columns = {row["name"] for row in cursor.fetchall()}

                new_columns = {
                    "file_size": "INTEGER",
                    "file_mtime": "REAL",
                    "tempo_confidence": "REAL",
                    "key_confidence": "REAL",
                    "beat_positions_json": "TEXT",
                    "beat_confidence": "REAL",
                    "status": "TEXT DEFAULT 'analyzed'",
                    "error_message": "TEXT"
                }

                for col, col_type in new_columns.items():
                    if col not in columns:
                        try:
                            cursor.execute(f"ALTER TABLE tracks ADD COLUMN {col} {col_type}")
                        except Exception as e:
                            logger.warning(f"Failed to add column {col}: {e}")
        finally:
            conn.close()

    def get_track_by_hash(self, file_hash: str) -> Optional[Dict[str, Any]]:
        """Retrieve track by file SHA-256 hash."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tracks WHERE file_hash = ?", (file_hash,))
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
        finally:
            conn.close()
        return None

    def get_track_by_path(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Retrieve track by normalized absolute file path."""
        norm_path = os.path.normpath(file_path).replace("\\", "/")
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tracks WHERE file_path = ? OR file_path = ?", (norm_path, file_path))
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
        finally:
            conn.close()
        return None

    def is_cached_and_valid(self, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Check if track is cached and file is unchanged on disk (based on size and mtime).
        Avoids redundant hashing and re-analysis for fast lookups.
        """
        if not os.path.exists(file_path):
            return None

        stat = os.stat(file_path)
        current_size = stat.st_size
        current_mtime = stat.st_mtime

        cached = self.get_track_by_path(file_path)
        if cached:
            # If size and mtime match, file is unchanged
            cached_size = cached.get("file_size")
            cached_mtime = cached.get("file_mtime")
            if cached_size == current_size and cached_mtime is not None and abs(cached_mtime - current_mtime) < 0.01:
                return cached
            
            # If mtime differs, verify with hash
            file_hash = calculate_file_hash(file_path)
            if cached.get("file_hash") == file_hash:
                # Update mtime & size in cache so future checks are instant
                self.update_file_metadata(file_path, current_size, current_mtime)
                return cached

        return None

    def update_file_metadata(self, file_path: str, size: int, mtime: float) -> None:
        """Update fast check metadata for an existing track."""
        norm_path = os.path.normpath(file_path).replace("\\", "/")
        conn = self.get_connection()
        try:
            with conn:
                conn.execute(
                    "UPDATE tracks SET file_size = ?, file_mtime = ?, updated_at = CURRENT_TIMESTAMP WHERE file_path = ?",
                    (size, mtime, norm_path)
                )
        finally:
            conn.close()

    def save_track(self, track_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert or replace analysis record in SQLite."""
        norm_path = os.path.normpath(track_data["file_path"]).replace("\\", "/")
        
        # Prepare JSON fields
        waveform_json = track_data.get("waveform_json")
        if isinstance(waveform_json, (list, dict)):
            waveform_json = json.dumps(waveform_json)
            
        beat_positions_json = track_data.get("beat_positions_json")
        if isinstance(beat_positions_json, (list, dict)):
            beat_positions_json = json.dumps(beat_positions_json)

        conn = self.get_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO tracks (
                        id, file_path, file_hash, file_size, file_mtime,
                        title, artist, album, genre, duration, bpm,
                        tempo_confidence, key_camelot, key_musical, key_confidence,
                        energy, loudness_lufs, beat_positions_json, beat_confidence,
                        intro_start, intro_end, outro_start, outro_end,
                        waveform_json, status, error_message, updated_at
                    ) VALUES (
                        :id, :file_path, :file_hash, :file_size, :file_mtime,
                        :title, :artist, :album, :genre, :duration, :bpm,
                        :tempo_confidence, :key_camelot, :key_musical, :key_confidence,
                        :energy, :loudness_lufs, :beat_positions_json, :beat_confidence,
                        :intro_start, :intro_end, :outro_start, :outro_end,
                        :waveform_json, :status, :error_message, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT(file_path) DO UPDATE SET
                        id = excluded.id,
                        file_hash = excluded.file_hash,
                        file_size = excluded.file_size,
                        file_mtime = excluded.file_mtime,
                        title = excluded.title,
                        artist = excluded.artist,
                        album = excluded.album,
                        genre = excluded.genre,
                        duration = excluded.duration,
                        bpm = excluded.bpm,
                        tempo_confidence = excluded.tempo_confidence,
                        key_camelot = excluded.key_camelot,
                        key_musical = excluded.key_musical,
                        key_confidence = excluded.key_confidence,
                        energy = excluded.energy,
                        loudness_lufs = excluded.loudness_lufs,
                        beat_positions_json = excluded.beat_positions_json,
                        beat_confidence = excluded.beat_confidence,
                        intro_start = excluded.intro_start,
                        intro_end = excluded.intro_end,
                        outro_start = excluded.outro_start,
                        outro_end = excluded.outro_end,
                        waveform_json = excluded.waveform_json,
                        status = excluded.status,
                        error_message = excluded.error_message,
                        updated_at = CURRENT_TIMESTAMP
                """, {
                    "id": track_data.get("id"),
                    "file_path": norm_path,
                    "file_hash": track_data.get("file_hash"),
                    "file_size": track_data.get("file_size"),
                    "file_mtime": track_data.get("file_mtime"),
                    "title": track_data.get("title", "Unknown Title"),
                    "artist": track_data.get("artist", "Unknown Artist"),
                    "album": track_data.get("album"),
                    "genre": track_data.get("genre", "Unknown"),
                    "duration": track_data.get("duration"),
                    "bpm": track_data.get("bpm"),
                    "tempo_confidence": track_data.get("tempo_confidence"),
                    "key_camelot": track_data.get("key_camelot"),
                    "key_musical": track_data.get("key_musical"),
                    "key_confidence": track_data.get("key_confidence"),
                    "energy": track_data.get("energy"),
                    "loudness_lufs": track_data.get("loudness_lufs"),
                    "beat_positions_json": beat_positions_json,
                    "beat_confidence": track_data.get("beat_confidence"),
                    "intro_start": track_data.get("intro_start", 0.0),
                    "intro_end": track_data.get("intro_end", 0.0),
                    "outro_start": track_data.get("outro_start", 0.0),
                    "outro_end": track_data.get("outro_end", 0.0),
                    "waveform_json": waveform_json,
                    "status": track_data.get("status", "analyzed"),
                    "error_message": track_data.get("error_message")
                })
        finally:
            conn.close()

        return self.get_track_by_path(norm_path)

    def get_all_tracks(self) -> List[Dict[str, Any]]:
        """Retrieve all cached tracks."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tracks ORDER BY updated_at DESC")
            return [self._row_to_dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def delete_track(self, track_id: str) -> bool:
        """Delete track by ID."""
        conn = self.get_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
                return cursor.rowcount > 0
        finally:
            conn.close()

    def clear_all(self) -> None:
        """Clear all cached tracks."""
        conn = self.get_connection()
        try:
            with conn:
                conn.execute("DELETE FROM tracks")
        finally:
            conn.close()

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        if d.get("waveform_json"):
            try:
                parsed_wf = json.loads(d["waveform_json"])
                if isinstance(parsed_wf, dict):
                    d["waveform"] = parsed_wf
                    d["waveformPeaks"] = parsed_wf.get("overview", [])
                else:
                    d["waveformPeaks"] = parsed_wf
                    d["waveform"] = {"overview": parsed_wf}
            except Exception:
                d["waveformPeaks"] = []
                d["waveform"] = None
        else:
            d["waveformPeaks"] = []
            d["waveform"] = None

        if d.get("beat_positions_json"):
            try:
                parsed_beats = json.loads(d["beat_positions_json"])
                if isinstance(parsed_beats, dict):
                    d["beatGrid"] = parsed_beats
                    d["beatPositions"] = [b.get("time") for b in parsed_beats.get("beats", [])]
                elif isinstance(parsed_beats, list):
                    d["beatPositions"] = parsed_beats
                    d["beatGrid"] = {
                        "beats": [
                            {"time": t, "isDownbeat": idx % 4 == 0, "bar": idx // 4 + 1, "beat": idx % 4 + 1}
                            for idx, t in enumerate(parsed_beats)
                        ]
                    }
            except Exception:
                d["beatPositions"] = []
                d["beatGrid"] = None
        else:
            d["beatPositions"] = []
            d["beatGrid"] = None

        return d


# Global singleton instance
db_instance = DatabaseManager()
