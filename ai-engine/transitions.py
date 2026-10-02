"""
ai-engine/transitions.py - Deterministic Transition Rules & Strategy Planner
Defines transition protocols, timing formulas, and parameter curves.
"""

from typing import Dict, Any


TRANSITION_STRATEGIES = {
    "smooth_crossfade": {
        "name": "Smooth Crossfade",
        "description": "Equal-power harmonic crossfade preserving constant acoustic energy.",
        "ideal_bars": [8, 16],
        "safe_fallback": True
    },
    "beat_mix": {
        "name": "Beat Mix",
        "description": "16-bar beat-matched groove blend with downbeat phase alignment.",
        "ideal_bars": [16, 32],
        "safe_fallback": False
    },
    "eq_bass_swap": {
        "name": "EQ/Bass Swap",
        "description": "Midpoint phrase drop bass swap isolating low frequencies to prevent mud.",
        "ideal_bars": [8, 16],
        "safe_fallback": False
    },
    "filter_transition": {
        "name": "Filter Transition",
        "description": "High-pass sweep build and resonant release on incoming phrase.",
        "ideal_bars": [8, 16],
        "safe_fallback": False
    },
    "echo_out": {
        "name": "Echo-Out",
        "description": "Frequency roll-off and ambient decay for sudden tempo or genre shifts.",
        "ideal_bars": [4, 8],
        "safe_fallback": False
    }
}


def compute_transition_timing(
    duration: float,
    outro_time: float,
    bars: int,
    bpm: float
) -> Dict[str, float]:
    """
    Calculate deterministic timing parameters in seconds.
    """
    valid_bpm = max(60.0, min(220.0, bpm or 128.0))
    seconds_per_beat = 60.0 / valid_bpm
    transition_seconds = bars * 4 * seconds_per_beat

    # Trigger threshold relative to outro or track end
    if outro_time and outro_time > transition_seconds and outro_time < duration:
        mix_out_start = outro_time - transition_seconds
    else:
        mix_out_start = max(0.0, duration - transition_seconds)

    return {
        "transition_seconds": round(transition_seconds, 2),
        "mix_out_start_seconds": round(mix_out_start, 2),
        "bars": bars,
        "seconds_per_bar": round(4 * seconds_per_beat, 3)
    }
