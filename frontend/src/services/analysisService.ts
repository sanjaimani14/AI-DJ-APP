/**
 * frontend/src/services/analysisService.ts
 * Communication layer between the React DJ console and the Python Audio Analysis Engine (FastAPI).
 */

import type { Track } from '../types/dj';

const API_BASE_URL = 'http://127.0.0.1:8001/api';

export interface AnalysisProgressEvent {
  stage: 'starting' | 'completed_track' | 'done';
  current?: number;
  total?: number;
  percent: number;
  filename?: string;
  track?: Track;
}

export function mapDbTrackToFrontend(row: any): Track {
  const ext = (row.file_path ? row.file_path.split('.').pop()?.toUpperCase() : '') || 'WAV';
  const fname = row.file_path ? row.file_path.split(/[/\\]/).pop() || row.title : row.title;
  
  // Audio playback url: if relative or local demo-music path, use Vite public / local server url
  let url = row.url;
  if (!url) {
    if (row.file_path && row.file_path.includes('demo-music')) {
      url = `/demo-music/${fname}`;
    } else {
      url = row.file_path;
    }
  }

  return {
    id: row.id || `trk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    filename: fname,
    title: row.title || fname.replace(/\.[^/.]+$/, ''),
    artist: row.artist || 'Unknown Artist',
    duration: typeof row.duration === 'number' ? row.duration : 0,
    format: ext,
    fileLocation: row.file_path || fname,
    url: url || '',
    bpm: typeof row.bpm === 'number' ? row.bpm : null,
    tempoConfidence: typeof row.tempo_confidence === 'number' ? row.tempo_confidence : null,
    key: row.key_camelot || '--',
    musicalKeyName: row.key_musical || 'Unavailable',
    keyConfidence: typeof row.key_confidence === 'number' ? row.key_confidence : null,
    energy: typeof row.energy === 'number' ? row.energy : null,
    genre: row.genre || 'Electronic',
    filePath: row.file_path || '',
    status: row.status || 'analyzed',
    errorMessage: row.error_message || null,
    introTime: typeof row.intro_end === 'number' ? row.intro_end : 0,
    outroTime: typeof row.outro_start === 'number' ? row.outro_start : (row.duration || 0),
    introStart: row.intro_start,
    introEnd: row.intro_end,
    outroStart: row.outro_start,
    outroEnd: row.outro_end,
    loudness: typeof row.loudness_lufs === 'number' ? row.loudness_lufs : null,
    beatPositions: Array.isArray(row.beatPositions) ? row.beatPositions : [],
    beatConfidence: typeof row.beat_confidence === 'number' ? row.beat_confidence : null,
    waveformPeaks: Array.isArray(row.waveformPeaks) && row.waveformPeaks.length > 0 ? row.waveformPeaks : (row.waveform?.overview || undefined),
    waveform: row.waveform || (row.waveformPeaks ? { overview: row.waveformPeaks } : undefined),
    beatGrid: row.beatGrid || undefined,
    cached: row.cached === true
  };
}

export const AnalysisService = {
  /**
   * Check if Python backend analysis engine is running and healthy.
   */
  async checkHealth(): Promise<{ isOnline: boolean; details?: any }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      if (!res.ok) return { isOnline: false };
      const data = await res.json();
      return { isOnline: true, details: data };
    } catch {
      return { isOnline: false };
    }
  },

  /**
   * Fetch all cached tracks from SQLite database.
   */
  async getCachedTracks(): Promise<Track[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/tracks`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return (data.tracks || []).map(mapDbTrackToFrontend);
    } catch (e) {
      console.warn('AnalysisService: Could not load tracks from SQLite service:', e);
      return [];
    }
  },

  /**
   * Analyze a local file path. Unchanged files are served from SQLite cache.
   */
  async analyzeFilePath(filePath: string, forceReanalyze: boolean = false): Promise<Track> {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, force_reanalyze: forceReanalyze })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || `Analysis failed: ${res.status}`);
    }

    const data = await res.json();
    return mapDbTrackToFrontend(data);
  },

  /**
   * Force reanalyze a track, bypassing the SQLite cache.
   */
  async reanalyzeTrack(track: Track): Promise<Track> {
    const res = await fetch(`${API_BASE_URL}/reanalyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: track.filePath || track.fileLocation,
        track_id: track.id,
        force_reanalyze: true
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Reanalyze failed' }));
      throw new Error(err.detail || `Reanalyze failed: ${res.status}`);
    }

    const data = await res.json();
    return mapDbTrackToFrontend(data);
  },

  /**
   * Upload an imported browser File to the Python engine for feature extraction.
   */
  async uploadAndAnalyze(file: File, forceReanalyze: boolean = false): Promise<Track> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('force_reanalyze', String(forceReanalyze));

    const res = await fetch(`${API_BASE_URL}/upload-and-analyze`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload and analysis failed' }));
      throw new Error(err.detail || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    const track = mapDbTrackToFrontend(data);
    // Keep local blob object URL for immediate browser audio playback
    track.url = URL.createObjectURL(file);
    track.file = file;
    return track;
  }
};
