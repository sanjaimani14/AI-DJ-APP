"""
tests/test_phase9_energy.py - Phase 9 AI Energy Management Test Suite
Tests:
- Classification into LOW, MEDIUM, HIGH, PEAK
- Event profiles (Chill, Party, High Energy, EDM, Tamil/Kuthu, Romantic, Custom)
- User choices: start_energy, target_energy, duration_minutes, peak_time_minutes
- Smooth energy curve generation (Hermite smoothstep)
- Avoiding sudden inappropriate jumps unless allowed
- Testing candidate selection and playlist simulation
"""

import sys
import os
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_ENGINE_DIR = os.path.join(BASE_DIR, "ai-engine")
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from energy import (
    get_energy_level,
    get_profile_presets,
    get_target_energy_at_elapsed,
    score_candidate_energy,
    generate_curve,
    simulate_playlist_energy_plan
)


class TestPhase9EnergyManagement(unittest.TestCase):
    def test_01_energy_classification(self):
        """Test energy tier classification into LOW, MEDIUM, HIGH, PEAK."""
        # LOW: 0.00 - 0.39
        self.assertEqual(get_energy_level(0.10), "LOW")
        self.assertEqual(get_energy_level(0.35), "LOW")

        # MEDIUM: 0.40 - 0.69
        self.assertEqual(get_energy_level(0.40), "MEDIUM")
        self.assertEqual(get_energy_level(0.55), "MEDIUM")
        self.assertEqual(get_energy_level(0.68), "MEDIUM")

        # HIGH: 0.70 - 0.84
        self.assertEqual(get_energy_level(0.70), "HIGH")
        self.assertEqual(get_energy_level(0.80), "HIGH")

        # PEAK: 0.85 - 1.00
        self.assertEqual(get_energy_level(0.85), "PEAK")
        self.assertEqual(get_energy_level(0.95), "PEAK")
        self.assertEqual(get_energy_level(1.00), "PEAK")

    def test_02_event_profiles_coverage(self):
        """Test that all required profiles are configured with valid energy boundaries."""
        presets = get_profile_presets()
        required_profiles = [
            "Chill",
            "Party",
            "High Energy",
            "EDM",
            "Tamil/Kuthu",
            "Romantic",
            "Custom"
        ]
        for prof in required_profiles:
            self.assertIn(prof, presets, f"Profile {prof} must be present in presets")
            cfg = presets[prof]
            self.assertGreaterEqual(cfg["start_energy"], 0.0)
            self.assertLessEqual(cfg["target_energy"], 1.0)
            self.assertGreaterEqual(cfg["duration_minutes"], 10)
            self.assertGreater(cfg["peak_time_minutes"], 0)
            self.assertLessEqual(cfg["peak_time_minutes"], cfg["duration_minutes"])

    def test_03_energy_curve_progression(self):
        """Test smooth curve progression from start to peak and cooldown."""
        start = 0.50
        target = 0.90
        duration = 100.0
        peak_time = 60.0

        # At minute 0: energy should be start energy
        e_start = get_target_energy_at_elapsed(start, target, duration, peak_time, 0)
        self.assertEqual(e_start, start)

        # At peak time: energy should reach target energy
        e_peak = get_target_energy_at_elapsed(start, target, duration, peak_time, peak_time)
        self.assertEqual(e_peak, target)

        # Mid-build should be strictly between start and peak
        e_mid = get_target_energy_at_elapsed(start, target, duration, peak_time, 30.0)
        self.assertGreater(e_mid, start)
        self.assertLess(e_mid, target)

        # Monotonic rise up to peak
        prev = start
        for m in range(0, int(peak_time), 5):
            curr = get_target_energy_at_elapsed(start, target, duration, peak_time, m)
            self.assertGreaterEqual(curr, prev)
            prev = curr

    def test_04_avoid_sudden_inappropriate_jumps(self):
        """Test that sudden jumps (>0.20 delta) are penalized unless requested."""
        current_energy = 0.50
        target_curve = 0.55

        # Candidate A: Energy 0.55 (Smooth delta 0.05)
        score_a, pen_a, is_app_a = score_candidate_energy(
            candidate_energy=0.55,
            current_energy=current_energy,
            target_curve_energy=target_curve,
            allow_jumps=False
        )
        self.assertEqual(pen_a, 0.0)
        self.assertTrue(is_app_a)
        self.assertGreater(score_a, 0.90)

        # Candidate B: Energy 0.95 (Sudden inappropriate jump delta 0.45)
        score_b, pen_b, is_app_b = score_candidate_energy(
            candidate_energy=0.95,
            current_energy=current_energy,
            target_curve_energy=target_curve,
            allow_jumps=False
        )
        self.assertGreater(pen_b, 0.0)
        self.assertFalse(is_app_b)
        self.assertLess(score_b, score_a)

        # When allow_jumps is True, jump penalty must be 0
        _, pen_allowed, _ = score_candidate_energy(
            candidate_energy=0.95,
            current_energy=current_energy,
            target_curve_energy=target_curve,
            allow_jumps=True
        )
        self.assertEqual(pen_allowed, 0.0)

    def test_05_playlist_simulation(self):
        """Test playlist sequencing that follows the energy curve without sudden jumps."""
        test_playlist = [
            {"id": "t1", "title": "Warm-up Groove", "energy": 0.35, "bpm": 115},
            {"id": "t2", "title": "Mid Beat", "energy": 0.55, "bpm": 120},
            {"id": "t3", "title": "Hype Builder", "energy": 0.72, "bpm": 125},
            {"id": "t4", "title": "Peak Banger", "energy": 0.92, "bpm": 128},
            {"id": "t5", "title": "Encore Track", "energy": 0.85, "bpm": 126}
        ]

        # Simulate a 60 min set with peak at 40 min
        res = simulate_playlist_energy_plan(
            playlist=test_playlist,
            start_energy=0.35,
            target_energy=0.92,
            duration_minutes=60,
            peak_time_minutes=40,
            allow_jumps=False
        )

        planned = res["planned_sequence"]
        self.assertEqual(len(planned), 5)
        self.assertGreaterEqual(res["smoothness_score"], 60)

        for step in planned:
            self.assertTrue(step["is_smooth"], f"Step {step['track']['title']} should be smooth")

        # Verify that max jump is within acceptable bounds (<= 0.20)
        self.assertLessEqual(res["max_jump"], 0.20)

        # First track should be low/medium energy, peak track should occur around peak time
        self.assertIn(planned[0]["level"], ["LOW", "MEDIUM"])
        self.assertEqual(planned[-2]["level"], "PEAK")


if __name__ == "__main__":
    unittest.main()
