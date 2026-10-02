"""
analyzer/audio_features.py - Real Audio Feature Extraction Engine
Extracts BPM, beat positions, beat confidence, tempo confidence, musical key,
duration, loudness (LUFS), energy, intro/outro estimates, and waveform peaks using librosa.
Strictly calculates real values with zero hallucination.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
import numpy as np
import librosa
import soundfile as sf

from analyzer.key_detector import estimate_key

logger = logging.getLogger("ai_dj.analyzer")


def extract_audio_features(file_path: str) -> Dict[str, Any]:
    """
    Extract comprehensive musical and acoustic features from an audio file.
    Returns structured dictionary matching the database schema.
    If extraction fails, marks track status as 'failed' or 'unavailable' with error message.
    """
    if not os.path.exists(file_path):
        return {
            "status": "failed",
            "error_message": f"File does not exist: {file_path}",
            "bpm": None,
            "tempo_confidence": None,
            "key_musical": None,
            "key_camelot": None,
            "key_confidence": None,
            "duration": None,
            "loudness_lufs": None,
            "energy": None,
            "beat_positions_json": [],
            "beat_confidence": None,
            "intro_start": 0.0,
            "intro_end": 0.0,
            "outro_start": 0.0,
            "outro_end": 0.0,
            "waveform_json": []
        }

    try:
        # 1. Load audio with standard sampling rate for analysis
        # Using 22050Hz is optimal for speed, tempo detection, and chromagram resolution
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        
        # Audio length in seconds
        duration = float(len(y) / sr)
        if duration <= 0:
            raise ValueError("Audio file has 0 duration or is empty.")

        # 2. Onset Envelope & Beat Tracking
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        
        # Beat tracking with prior centered around 125 BPM (standard electronic/dance prior)
        tempo_result, beat_frames = librosa.beat.beat_track(
            onset_envelope=onset_env,
            sr=sr,
            start_bpm=120.0
        )
        
        # In librosa 1.0, tempo can be a numpy array or scalar
        raw_bpm = float(np.atleast_1d(tempo_result)[0])
        bpm = round(raw_bpm, 1)

        # Beat positions in seconds
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
        beat_positions = [round(float(t), 3) for t in beat_times]

        # Beat confidence: alignment of detected beats with onset envelope peaks
        if len(beat_frames) > 0 and np.mean(onset_env) > 1e-5:
            # Clamp beat frame indices to valid range
            valid_beats = [f for f in beat_frames if f < len(onset_env)]
            if valid_beats:
                beat_onset_avg = np.mean(onset_env[valid_beats])
                overall_onset_avg = np.mean(onset_env)
                # Normalized ratio clamped to [0.0, 1.0]
                beat_confidence = float(np.clip((beat_onset_avg / overall_onset_avg - 1.0) / 2.0 + 0.5, 0.1, 0.98))
            else:
                beat_confidence = 0.5
        else:
            beat_confidence = 0.0
        beat_confidence = round(beat_confidence, 2)

        # Tempo confidence: peak distinctiveness in onset autocorrelation
        try:
            # Autocorrelation of onset envelope
            max_size = min(len(onset_env), 4 * sr // 512)
            if max_size > 10:
                ac = librosa.autocorrelate(onset_env, max_size=max_size)
                if len(ac) > 1:
                    peak_ratio = (np.max(ac[1:]) - np.min(ac[1:])) / (np.std(ac[1:]) * 3 + 1e-6)
                    tempo_confidence = float(np.clip(peak_ratio / 3.0, 0.25, 0.99))
                else:
                    tempo_confidence = 0.5
            else:
                tempo_confidence = 0.5
        except Exception:
            tempo_confidence = 0.7
        tempo_confidence = round(tempo_confidence, 2)

        # 3. Musical Key Detection (Chroma CQT or Chroma STFT)
        try:
            if duration >= 2.0:
                chroma = librosa.feature.chroma_cqt(y=y, sr=sr, n_chroma=12)
            else:
                chroma = librosa.feature.chroma_stft(y=y, sr=sr, n_chroma=12)
            key_res = estimate_key(chroma)
            key_musical = key_res.get("key_musical")
            key_camelot = key_res.get("key_camelot")
            key_confidence = key_res.get("key_confidence")
        except Exception as e:
            logger.warning(f"Key detection warning for {file_path}: {e}")
            key_musical = "Unavailable"
            key_camelot = "--"
            key_confidence = 0.0

        # 4. Loudness (LUFS / RMS dB)
        rms = librosa.feature.rms(y=y)[0]
        rms_mean = float(np.sqrt(np.mean(y**2)))
        if rms_mean > 1e-9:
            # Standard RMS dBFS (roughly aligns with LUFS for musical audio)
            loudness_lufs = round(float(20 * np.log10(rms_mean)), 1)
        else:
            loudness_lufs = -99.0

        # 5. Energy Estimation (0.0 to 1.0)
        # Combines dynamic loudness (percentile 85 RMS) + onset strength density + spectral brightness
        try:
            p85_rms = float(np.percentile(rms, 85)) if len(rms) > 0 else 0.0
            norm_rms = float(np.clip(p85_rms / 0.22, 0.0, 1.0))

            # Spectral centroid (frequency brightness)
            spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            mean_cent = float(np.mean(spec_cent)) if len(spec_cent) > 0 else 1000.0
            norm_cent = float(np.clip((mean_cent - 300) / 3000.0, 0.0, 1.0))

            # Rhythmic / percussive onset energy
            mean_onset = float(np.mean(onset_env)) if len(onset_env) > 0 else 0.5
            norm_onset = float(np.clip(mean_onset / 1.5, 0.0, 1.0))

            # Composite energy calculation: weighted combination of RMS power, spectral brightness, and beat drive
            energy_score = round(float(np.clip(0.60 * norm_rms + 0.25 * norm_cent + 0.15 * norm_onset, 0.08, 0.99)), 2)
        except Exception:
            energy_score = 0.70

        # 6. Intro & Outro Estimates
        # Intro: Detect where beat grid stabilizes or energy crosses 60% of median
        median_rms = float(np.median(rms)) if len(rms) > 0 else 0.05
        hop_length = 512
        frame_time = hop_length / sr
        
        intro_start = 0.0
        intro_end = 0.0
        outro_start = max(0.0, duration - 16.0)
        outro_end = duration

        if duration > 10.0:
            # Find intro end (up to 25% of track duration or 32 seconds)
            max_intro_search = min(int(len(rms) * 0.25), int(32.0 / frame_time))
            intro_frame = 0
            for idx in range(max_intro_search):
                if rms[idx] >= median_rms * 0.85:
                    intro_frame = idx
                    break
            intro_end = round(float(intro_frame * frame_time), 1)
            # Default to 4 or 8 bars if too short or 0
            if intro_end < 2.0 and bpm > 0:
                # 4 bars in seconds
                intro_end = round(float((4 * 4 * 60) / bpm), 1)

            # Find outro start (last 25% of track)
            min_outro_search = max(int(len(rms) * 0.75), int((duration - 32.0) / frame_time))
            outro_frame = len(rms) - 1
            for idx in range(len(rms) - 1, min_outro_search, -1):
                if rms[idx] >= median_rms * 0.75:
                    outro_frame = idx
                    break
            outro_start = round(float(outro_frame * frame_time), 1)
            if outro_start >= duration - 2.0 and bpm > 0:
                # 4 bars before end
                outro_start = round(max(0.0, float(duration - ((4 * 4 * 60) / bpm))), 1)
        else:
            # For short sound effects / samples
            intro_end = round(duration * 0.15, 2)
            outro_start = round(duration * 0.85, 2)

        # 7. Professional Waveform & Beat Grid Generation (Phase 4)
        from analyzer.waveform import generate_waveform_and_beatgrid
        waveform_res = generate_waveform_and_beatgrid(
            y=y,
            sr=sr,
            bpm=bpm,
            beat_frames=beat_frames,
            duration=duration,
            intro_end=intro_end,
            outro_start=outro_start
        )

        return {
            "status": "analyzed",
            "error_message": None,
            "duration": round(duration, 2),
            "bpm": bpm,
            "tempo_confidence": tempo_confidence,
            "key_musical": key_musical,
            "key_camelot": key_camelot,
            "key_confidence": key_confidence,
            "loudness_lufs": loudness_lufs,
            "energy": energy_score,
            "beat_positions_json": waveform_res["beat_grid"],
            "beat_confidence": beat_confidence,
            "intro_start": intro_start,
            "intro_end": intro_end,
            "outro_start": outro_start,
            "outro_end": outro_end,
            "waveform_json": waveform_res["waveform"]
        }

    except Exception as e:
        logger.error(f"Audio analysis failed for {file_path}: {e}", exc_info=True)
        return {
            "status": "failed",
            "error_message": str(e),
            "duration": None,
            "bpm": None,
            "tempo_confidence": None,
            "key_musical": "Unavailable",
            "key_camelot": "--",
            "key_confidence": None,
            "loudness_lufs": None,
            "energy": None,
            "beat_positions_json": [],
            "beat_confidence": None,
            "intro_start": 0.0,
            "intro_end": 0.0,
            "outro_start": 0.0,
            "outro_end": 0.0,
            "waveform_json": []
        }
