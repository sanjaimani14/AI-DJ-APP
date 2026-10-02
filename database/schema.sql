-- AI DJ Local SQLite Database Schema
-- Phase 3: Audio Analysis Engine Cache
-- Tracks are cached so unchanged files are analyzed strictly once.

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_hash TEXT,
    file_size INTEGER,
    file_mtime REAL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    genre TEXT,
    duration REAL,
    bpm REAL,
    tempo_confidence REAL,
    key_camelot TEXT,
    key_musical TEXT,
    key_confidence REAL,
    energy REAL,
    loudness_lufs REAL,
    beat_positions_json TEXT, -- JSON array of beat timestamps [t0, t1, ...]
    beat_confidence REAL,
    intro_start REAL DEFAULT 0,
    intro_end REAL DEFAULT 0,
    outro_start REAL DEFAULT 0,
    outro_end REAL DEFAULT 0,
    waveform_json TEXT, -- Serialized frequency peaks for instant display
    status TEXT NOT NULL DEFAULT 'analyzed', -- 'analyzed', 'failed', 'unavailable'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_file_hash ON tracks(file_hash);
CREATE INDEX IF NOT EXISTS idx_tracks_file_path ON tracks(file_path);

CREATE TABLE IF NOT EXISTS cue_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id TEXT NOT NULL,
    cue_index INTEGER NOT NULL, -- 0 to 7 (Hot Cues 1-8)
    time_seconds REAL NOT NULL,
    label TEXT,
    color TEXT,
    FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    from_track_id TEXT,
    to_track_id TEXT,
    transition_type TEXT NOT NULL,
    transition_duration_seconds REAL,
    energy_before REAL,
    energy_after REAL,
    success INTEGER DEFAULT 1
);
