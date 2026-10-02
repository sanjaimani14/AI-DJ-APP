"""
analyzer/waveform.py - Real Audio Waveform & Beat Grid Generator
Extracts 800-point full overview peaks, 3-band frequency energy (Low/Bass, Mid, High),
and beat grid with downbeat detection from actual decoded audio.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import librosa


def generate_waveform_and_beatgrid(
    y: np.ndarray,
    sr: int,
    bpm: float,
    beat_frames: np.ndarray,
    duration: float,
    intro_end: float = 0.0,
    outro_start: float = 0.0
) -> Dict[str, Any]:
    """
    Generate professional waveform and beat grid data:
    1. Overview waveform: 800 normalized amplitude points for full-track scrub display.
    2. 3-band frequency energy:
       - Low (20 - 250 Hz): Basslines and kick drums
       - Mid (250 - 2500 Hz): Vocals, keys, synths, snares
       - High (2500 - 16000 Hz): Hi-hats, cymbals, crisp transients
    3. Beat grid with downbeat detection:
       - Measures low-frequency transient energy on every 4-beat phase to detect beat 1 (downbeat).
       - Generates structured beat markers with bar and beat numbering.
    """
    # 1. Generate 800-point full overview waveform
    target_overview_points = 800
    if len(y) > target_overview_points:
        # Calculate RMS in 800 segments across track
        chunk_size = int(len(y) / target_overview_points)
        reshaped = y[: chunk_size * target_overview_points].reshape(target_overview_points, chunk_size)
        raw_overview = np.sqrt(np.mean(reshaped ** 2, axis=1))
        max_overview = np.max(raw_overview) if np.max(raw_overview) > 0 else 1.0
        overview_peaks = [round(float(np.clip(v / max_overview, 0.04, 1.0)), 3) for v in raw_overview]
    else:
        overview_peaks = [0.1] * target_overview_points

    # 2. Generate 3-band frequency energy for smooth scrolling waveform
    # Choose hop length targeting ~35-40 frames per second of audio
    fps = 35
    hop_length = int(sr / fps)
    
    # Compute Short-Time Fourier Transform (STFT)
    n_fft = 1024
    stft_matrix = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

    # Frequency bin masks
    low_mask = freqs <= 250
    mid_mask = (freqs > 250) & (freqs <= 2500)
    high_mask = freqs > 2500

    low_raw = np.mean(stft_matrix[low_mask, :], axis=0) if np.any(low_mask) else np.zeros(stft_matrix.shape[1])
    mid_raw = np.mean(stft_matrix[mid_mask, :], axis=0) if np.any(mid_mask) else np.zeros(stft_matrix.shape[1])
    high_raw = np.mean(stft_matrix[high_mask, :], axis=0) if np.any(high_mask) else np.zeros(stft_matrix.shape[1])

    # Normalize each band with 95th percentile clipping for vibrant contrast
    def normalize_band(arr: np.ndarray) -> List[float]:
        p95 = np.percentile(arr, 95) if len(arr) > 0 else 1.0
        scale = p95 if p95 > 1e-6 else 1.0
        clipped = np.clip(arr / scale, 0.03, 1.0)
        return [round(float(v), 3) for v in clipped]

    low_band = normalize_band(low_raw)
    mid_band = normalize_band(mid_raw)
    high_band = normalize_band(high_raw)

    # 3. Detect Downbeats & Build Beat Grid
    # Downbeats are beat 1 of each 4-beat bar, characterized by kick drum transients and bass energy
    beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
    total_beats = len(beat_times)

    downbeat_phase = 0
    if total_beats >= 4 and len(low_raw) > 0:
        # Measure bass energy at beat positions for phases 0, 1, 2, 3
        phase_energies = []
        for phase in range(4):
            indices = []
            for b_idx in range(phase, total_beats, 4):
                frame_idx = int(beat_times[b_idx] * fps)
                if frame_idx < len(low_raw):
                    indices.append(low_raw[frame_idx])
            phase_energies.append(np.mean(indices) if indices else 0.0)

        downbeat_phase = int(np.argmax(phase_energies))

    # Construct structured beat markers
    beats_list = []
    beat_interval = 60.0 / bpm if bpm > 0 else 0.5

    for idx, b_time in enumerate(beat_times):
        # Determine bar and beat within bar
        offset_idx = idx - downbeat_phase
        is_downbeat = (offset_idx % 4 == 0)
        bar_number = (offset_idx // 4) + 1
        beat_in_bar = (offset_idx % 4) + 1

        beats_list.append({
            "time": round(float(b_time), 3),
            "isDownbeat": bool(is_downbeat),
            "bar": int(bar_number),
            "beat": int(beat_in_bar)
        })

    beat_grid_data = {
        "bpm": round(float(bpm), 2),
        "beatInterval": round(float(beat_interval), 4),
        "firstBeat": round(float(beat_times[0]), 3) if beat_times else 0.0,
        "downbeatPhase": downbeat_phase,
        "totalBeats": total_beats,
        "beats": beats_list
    }

    waveform_data = {
        "overview": overview_peaks,
        "low": low_band,
        "mid": mid_band,
        "high": high_band,
        "fps": fps,
        "duration": round(float(duration), 2)
    }

    return {
        "waveform": waveform_data,
        "beat_grid": beat_grid_data,
        "overview_peaks": overview_peaks
    }
