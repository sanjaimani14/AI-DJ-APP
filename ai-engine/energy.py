"""
ai-engine/energy.py - AI Energy Management System (Phase 9)
Tracks energy values from 0.0 to 1.0.
Classifies energy into:
  - LOW (0.00 - 0.39)
  - MEDIUM (0.40 - 0.69)
  - HIGH (0.70 - 0.84)
  - PEAK (0.85 - 1.00)

Supports event profiles:
  - Chill, Party, High Energy, EDM, Tamil/Kuthu, Romantic, Custom

Allows user configuration:
  - START ENERGY
  - TARGET ENERGY
  - EVENT DURATION
  - PEAK TIME
  - AVOID INAPPROPRIATE JUMPS
"""

from typing import Dict, List, Any, Tuple


def get_energy_level(energy: float) -> str:
    """Classifies energy into LOW, MEDIUM, HIGH, PEAK."""
    e = max(0.0, min(1.0, float(energy)))
    if e >= 0.85:
        return "PEAK"
    if e >= 0.70:
        return "HIGH"
    if e >= 0.40:
        return "MEDIUM"
    return "LOW"


def get_profile_presets() -> Dict[str, Dict[str, Any]]:
    """Returns standard presets for each event profile."""
    return {
        "Party": {
            "profile": "Party",
            "start_energy": 0.60,
            "target_energy": 0.88,
            "duration_minutes": 120,
            "peak_time_minutes": 80,
            "allow_jumps": False
        },
        "High Energy": {
            "profile": "High Energy",
            "start_energy": 0.75,
            "target_energy": 0.98,
            "duration_minutes": 90,
            "peak_time_minutes": 55,
            "allow_jumps": False
        },
        "EDM": {
            "profile": "EDM",
            "start_energy": 0.68,
            "target_energy": 0.95,
            "duration_minutes": 90,
            "peak_time_minutes": 60,
            "allow_jumps": False
        },
        "Tamil/Kuthu": {
            "profile": "Tamil/Kuthu",
            "start_energy": 0.70,
            "target_energy": 0.96,
            "duration_minutes": 120,
            "peak_time_minutes": 80,
            "allow_jumps": False
        },
        "Tamil / Kuthu": {
            "profile": "Tamil / Kuthu",
            "start_energy": 0.70,
            "target_energy": 0.96,
            "duration_minutes": 120,
            "peak_time_minutes": 80,
            "allow_jumps": False
        },
        "Chill": {
            "profile": "Chill",
            "start_energy": 0.35,
            "target_energy": 0.52,
            "duration_minutes": 90,
            "peak_time_minutes": 45,
            "allow_jumps": False
        },
        "Romantic": {
            "profile": "Romantic",
            "start_energy": 0.30,
            "target_energy": 0.55,
            "duration_minutes": 60,
            "peak_time_minutes": 35,
            "allow_jumps": False
        },
        "Custom": {
            "profile": "Custom",
            "start_energy": 0.50,
            "target_energy": 0.85,
            "duration_minutes": 60,
            "peak_time_minutes": 40,
            "allow_jumps": False
        }
    }


def _smooth_step(t: float) -> float:
    """Hermite interpolation smoothstep function."""
    x = max(0.0, min(1.0, t))
    return x * x * (3.0 - 2.0 * x)


def get_target_energy_at_elapsed(
    start_energy: float,
    target_energy: float,
    duration_minutes: float,
    peak_time_minutes: float,
    elapsed_minutes: float
) -> float:
    """
    Computes instantaneous target energy along the planned smooth energy curve.
    Ramps smoothly to peak at peak_time_minutes, then maintains plateau/encore taper.
    """
    dur = max(1.0, float(duration_minutes))
    peak_t = max(1.0, min(dur, float(peak_time_minutes)))
    t = max(0.0, min(dur, float(elapsed_minutes)))

    start = max(0.0, min(1.0, float(start_energy)))
    peak = max(0.0, min(1.0, float(target_energy)))

    if t <= peak_t:
        ratio = t / peak_t
        progress = _smooth_step(ratio)
        return round(start + (peak - start) * progress, 3)
    else:
        post_ratio = (t - peak_t) / max(1.0, dur - peak_t)
        post_progress = _smooth_step(post_ratio)
        end_energy = max(start, peak - 0.10)
        return round(peak - (peak - end_energy) * post_progress, 3)


def score_candidate_energy(
    candidate_energy: float,
    current_energy: float,
    target_curve_energy: float,
    allow_jumps: bool = False
) -> Tuple[float, float, bool]:
    """
    Scores candidate track energy and penalizes sudden inappropriate jumps (> 0.20 delta).
    Returns (score, jump_penalty, is_appropriate).
    """
    cand = max(0.0, min(1.0, float(candidate_energy)))
    cur = max(0.0, min(1.0, float(current_energy)))
    target = max(0.0, min(1.0, float(target_curve_energy)))

    delta_target = abs(cand - target)
    delta_current = abs(cand - cur)

    jump_penalty = 0.0
    if not allow_jumps and delta_current > 0.20:
        jump_penalty = (delta_current - 0.20) * 1.5

    raw_proximity = max(0.0, 1.0 - delta_target * 2.2)
    final_score = max(0.0, min(1.0, raw_proximity - jump_penalty))

    return round(final_score, 3), round(jump_penalty, 3), jump_penalty == 0.0


def generate_curve(
    start_energy: float,
    target_energy: float,
    duration_minutes: float,
    peak_time_minutes: float,
    num_points: int = 25
) -> List[Dict[str, Any]]:
    """Generates discretized points along the energy curve for graphing."""
    points = []
    dur = max(1.0, float(duration_minutes))

    for i in range(num_points):
        minute = (i / (num_points - 1)) * dur
        energy = get_target_energy_at_elapsed(start_energy, target_energy, dur, peak_time_minutes, minute)
        points.append({
            "minute": round(minute, 1),
            "progress_percent": round((minute / dur) * 100),
            "target_energy": energy,
            "level": get_energy_level(energy)
        })

    return points


def simulate_playlist_energy_plan(
    playlist: List[Dict[str, Any]],
    start_energy: float,
    target_energy: float,
    duration_minutes: float,
    peak_time_minutes: float,
    allow_jumps: bool = False
) -> Dict[str, Any]:
    """Simulates selecting tracks from a playlist to follow the planned energy curve."""
    if not playlist:
        return {"planned_sequence": [], "average_delta": 0.0, "max_jump": 0.0, "smoothness_score": 100}

    dur = max(1.0, float(duration_minutes))
    remaining = list(playlist)
    planned = []

    current_minute = 0.0
    current_energy = start_energy
    max_jump = 0.0
    total_delta = 0.0
    step_duration = dur / max(1, len(playlist))

    while remaining:
        curve_target = get_target_energy_at_elapsed(
            start_energy, target_energy, dur, peak_time_minutes, current_minute
        )

        best_idx = 0
        best_score = -999.0

        for idx, cand in enumerate(remaining):
            cand_energy = float(cand.get("energy", 0.75))
            score, _, _ = score_candidate_energy(
                cand_energy, current_energy, curve_target, allow_jumps
            )
            if score > best_score:
                best_score = score
                best_idx = idx

        chosen = remaining.pop(best_idx)
        actual_energy = float(chosen.get("energy", 0.75))
        jump = round(abs(actual_energy - current_energy), 3)
        delta = round(abs(actual_energy - curve_target), 3)

        if planned and jump > max_jump:
            max_jump = jump
        total_delta += delta

        planned.append({
            "track": chosen,
            "minute": round(current_minute, 1),
            "actual_energy": round(actual_energy, 2),
            "curve_target_energy": curve_target,
            "level": get_energy_level(actual_energy),
            "is_smooth": jump <= 0.20 or allow_jumps
        })

        current_energy = actual_energy
        current_minute += step_duration

    avg_delta = total_delta / len(planned) if planned else 0.0
    smoothness = max(0, int((1.0 - min(1.0, max_jump * 1.5)) * 100))

    return {
        "planned_sequence": planned,
        "average_delta": round(avg_delta, 3),
        "max_jump": round(max_jump, 3),
        "smoothness_score": smoothness
    }
