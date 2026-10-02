"""
analyzer/key_detector.py - Deterministic Musical Key Detection
Uses Krumhansl-Schmuckler pitch-class profiles to estimate root note, mode (Major/Minor),
and Camelot Wheel notation with confidence scores.
"""

from typing import Dict, Any, Tuple
import numpy as np

# 12 chromatic semitones
PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Schmuckler key profiles
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

# Camelot Wheel Mappings: (Root, Mode) -> Camelot Code
CAMELOT_MAP = {
    # Major (B)
    ("B", "Major"): "1B",
    ("F#", "Major"): "2B", ("Gb", "Major"): "2B",
    ("C#", "Major"): "3B", ("Db", "Major"): "3B",
    ("G#", "Major"): "4B", ("Ab", "Major"): "4B",
    ("D#", "Major"): "5B", ("Eb", "Major"): "5B",
    ("A#", "Major"): "6B", ("Bb", "Major"): "6B",
    ("F", "Major"): "7B",
    ("C", "Major"): "8B",
    ("G", "Major"): "9B",
    ("D", "Major"): "10B",
    ("A", "Major"): "11B",
    ("E", "Major"): "12B",

    # Minor (A)
    ("G#", "Minor"): "1A", ("Ab", "Minor"): "1A",
    ("D#", "Minor"): "2A", ("Eb", "Minor"): "2A",
    ("A#", "Minor"): "3A", ("Bb", "Minor"): "3A",
    ("F", "Minor"): "4A",
    ("C", "Minor"): "5A",
    ("G", "Minor"): "6A",
    ("D", "Minor"): "7A",
    ("A", "Minor"): "8A",
    ("E", "Minor"): "9A",
    ("B", "Minor"): "10A",
    ("F#", "Minor"): "11A", ("Gb", "Minor"): "11A",
    ("C#", "Minor"): "12A", ("Db", "Minor"): "12A",
}


def estimate_key(chroma_matrix: np.ndarray) -> Dict[str, Any]:
    """
    Given a 12-band chromagram (shape: [12, n_frames]), calculate:
    - key_musical: e.g. "A Minor" or "C Major"
    - key_camelot: e.g. "8A" or "8B"
    - key_confidence: 0.0 to 1.0
    """
    if chroma_matrix is None or chroma_matrix.size == 0 or chroma_matrix.shape[0] != 12:
        return {
            "key_musical": None,
            "key_camelot": None,
            "key_confidence": 0.0,
            "status": "unavailable"
        }

    # Mean intensity for each of the 12 chromatic pitch classes
    chroma_mean = np.mean(chroma_matrix, axis=1)

    # Avoid zero-division / silent audio
    norm = np.linalg.norm(chroma_mean)
    if norm < 1e-6:
        return {
            "key_musical": "Undetected (Silent)",
            "key_camelot": "--",
            "key_confidence": 0.0,
            "status": "unavailable"
        }

    chroma_mean = chroma_mean / norm

    correlations = []

    # Correlate across all 12 circular shifts for Major and Minor
    for i in range(12):
        maj_profile_shift = np.roll(MAJOR_PROFILE, i)
        min_profile_shift = np.roll(MINOR_PROFILE, i)

        corr_maj = float(np.corrcoef(chroma_mean, maj_profile_shift)[0, 1])
        corr_min = float(np.corrcoef(chroma_mean, min_profile_shift)[0, 1])

        correlations.append((corr_maj, PITCH_CLASSES[i], "Major"))
        correlations.append((corr_min, PITCH_CLASSES[i], "Minor"))

    # Sort descending by correlation score
    correlations.sort(key=lambda x: x[0], reverse=True)

    best_score, best_root, best_mode = correlations[0]
    runner_up_score = correlations[1][0] if len(correlations) > 1 else 0.0

    # Key confidence is based on score magnitude and distance to 2nd runner-up
    confidence = float(np.clip((best_score - runner_up_score) * 2.5 + best_score * 0.5, 0.0, 1.0))

    key_musical = f"{best_root} {best_mode}"
    key_camelot = CAMELOT_MAP.get((best_root, best_mode), "8A")

    return {
        "key_musical": key_musical,
        "key_camelot": key_camelot,
        "key_confidence": round(confidence, 3),
        "correlation_score": round(best_score, 3)
    }
