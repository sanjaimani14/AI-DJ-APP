"""
tests/test_phase7_planner.py - Unit & Integration Tests for Phase 7 AI DJ Planner
Validates deterministic scoring, Camelot wheel harmony, BPM tolerance, repetition penalties,
and strict structured decision format compliance.
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

from planner import CamelotWheel, AIDJPlanner, planner_instance


class TestPhase7Planner(unittest.TestCase):
    def setUp(self):
        self.planner = AIDJPlanner()
        self.planner.reset_history()

        self.mock_library = [
            {
                "id": "trk-1",
                "title": "Club Beat 128BPM",
                "artist": "DJ Master",
                "bpm": 128.0,
                "key": "8A",
                "energy": 0.85,
                "genre": "Club / EDM",
                "duration": 180.0,
                "intro_time": 4.0,
                "outro_time": 165.0
            },
            {
                "id": "trk-2",
                "title": "Harmonic Synths 120BPM",
                "artist": "Synth Wave",
                "bpm": 120.0,
                "key": "9A",
                "energy": 0.70,
                "genre": "Synthwave / EDM",
                "duration": 200.0,
                "intro_time": 8.0,
                "outro_time": 185.0
            },
            {
                "id": "trk-3",
                "title": "Deep Bass Groove 126BPM",
                "artist": "Bass Producer",
                "bpm": 126.0,
                "key": "8B",
                "energy": 0.82,
                "genre": "Deep House",
                "duration": 190.0,
                "intro_time": 4.0,
                "outro_time": 175.0
            },
            {
                "id": "trk-4",
                "title": "Acoustic Chill 90BPM",
                "artist": "Acoustic Band",
                "bpm": 90.0,
                "key": "2B",
                "energy": 0.35,
                "genre": "Acoustic",
                "duration": 210.0,
                "intro_time": 2.0,
                "outro_time": 195.0
            }
        ]

    def test_01_camelot_wheel_scoring(self):
        """Test Camelot harmonic wheel matrix compatibility scores."""
        # Exact match
        self.assertEqual(CamelotWheel.compatibility_score("8A", "8A"), 1.00)
        # Adjacent key (same letter, diff 1)
        self.assertEqual(CamelotWheel.compatibility_score("8A", "9A"), 0.95)
        self.assertEqual(CamelotWheel.compatibility_score("8A", "7A"), 0.95)
        # Relative major/minor (same number, diff letter)
        self.assertEqual(CamelotWheel.compatibility_score("8A", "8B"), 0.90)
        # Diagonal (adjacent number, diff letter)
        self.assertEqual(CamelotWheel.compatibility_score("8A", "9B"), 0.70)
        # 2 steps jump
        self.assertEqual(CamelotWheel.compatibility_score("8A", "10A"), 0.50)
        # Clash / distant
        self.assertEqual(CamelotWheel.compatibility_score("8A", "2A"), 0.15)
        # Wheel wrap around 12 to 1
        self.assertEqual(CamelotWheel.compatibility_score("12A", "1A"), 0.95)
        # Unknown/fallback
        self.assertEqual(CamelotWheel.compatibility_score(None, "8A"), 0.50)
        self.assertEqual(CamelotWheel.compatibility_score("--", "8A"), 0.50)

    def test_02_bpm_compatibility(self):
        """Test BPM compatibility curves and pitch adjustment."""
        # Exact same BPM
        score, pitch = self.planner.calculate_bpm_score(128.0, 128.0)
        self.assertEqual(score, 1.00)
        self.assertEqual(pitch, 0.0)

        # Close BPM (126 vs 128 = ~1.5% diff)
        score_close, _ = self.planner.calculate_bpm_score(128.0, 126.0)
        self.assertGreaterEqual(score_close, 0.95)

        # Half-time detection (64 BPM candidate vs 128 BPM current)
        score_half, _ = self.planner.calculate_bpm_score(128.0, 64.0)
        self.assertEqual(score_half, 0.85)

        # Large BPM gap (90 vs 128 = ~30% diff)
        score_far, _ = self.planner.calculate_bpm_score(128.0, 90.0)
        self.assertLess(score_far, 0.50)

    def test_03_repetition_penalties(self):
        """Test history and artist repetition penalties."""
        # Empty history -> no penalty
        pen_h, pen_a = self.planner.calculate_repetition_penalties("trk-1", "DJ Master")
        self.assertEqual(pen_h, 0.0)
        self.assertEqual(pen_a, 0.0)

        # Record played
        self.planner.record_played("trk-1", "DJ Master")
        pen_h1, pen_a1 = self.planner.calculate_repetition_penalties("trk-1", "DJ Master")
        self.assertGreater(pen_h1, 0.80)  # Very high penalty for immediately played
        self.assertGreater(pen_a1, 0.30)  # Artist penalty

        # Candidate by different artist and not in history
        pen_h2, pen_a2 = self.planner.calculate_repetition_penalties("trk-2", "Synth Wave")
        self.assertEqual(pen_h2, 0.0)
        self.assertEqual(pen_a2, 0.0)

    def test_04_structured_decision_format(self):
        """Verify the exact structured decision format required by prompt."""
        current_track = self.mock_library[0]  # Club Beat 128BPM (Key 8A, Energy 0.85)
        decision = self.planner.plan_next_track(
            current_track=current_track,
            library=self.mock_library,
            event_profile="Party",
            active_deck="A"
        )

        # 1. Check all required root keys from prompt
        self.assertIn("next_track", decision)
        self.assertIn("transition_type", decision)
        self.assertIn("transition_bars", decision)
        self.assertIn("target_bpm", decision)
        self.assertIn("target_energy", decision)

        # 2. Check types
        self.assertIsInstance(decision["next_track"], str)
        self.assertIsInstance(decision["transition_type"], str)
        self.assertIsInstance(decision["transition_bars"], int)
        self.assertTrue(isinstance(decision["target_bpm"], (int, float)))
        self.assertTrue(isinstance(decision["target_energy"], (int, float)))

        # 3. Check values
        self.assertIn(decision["transition_type"], ["smooth_crossfade", "beat_mix", "eq_bass_swap", "filter_transition", "echo_out"])
        self.assertIn(decision["transition_bars"], [4, 8, 16, 32])
        self.assertGreater(decision["target_bpm"], 0)
        self.assertTrue(0.0 <= decision["target_energy"] <= 1.0)

        # 4. Check that Deep Bass Groove (Key 8B, 126BPM, Energy 0.82) scored highest for Party vibe
        # (Relative major/minor 8A-8B, delta 2 BPM, high energy)
        self.assertEqual(decision["next_track"], "Deep Bass Groove 126BPM")
        self.assertEqual(decision["transition_type"], "eq_bass_swap")

        # 5. Check score breakdown
        self.assertIn("score_breakdown", decision)
        breakdown = decision["score_breakdown"]
        self.assertIn("key_compatibility", breakdown)
        self.assertIn("bpm_compatibility", breakdown)
        self.assertIn("energy_compatibility", breakdown)
        self.assertIn("genre_compatibility", breakdown)

        # 6. Check transition timing
        self.assertIn("transition_timing", decision)
        timing = decision["transition_timing"]
        self.assertIn("mix_out_start_seconds", timing)
        self.assertIn("transition_duration_seconds", timing)
        self.assertGreater(timing["transition_duration_seconds"], 0)

    def test_05_rule_based_fallback_on_empty(self):
        """Test reproducible fallback logic when library is empty."""
        current_track = self.mock_library[0]
        decision = self.planner.plan_next_track(
            current_track=current_track,
            library=[],
            event_profile="Party",
            active_deck="A"
        )

        self.assertIn("next_track", decision)
        self.assertEqual(decision["transition_type"], "smooth_crossfade")
        self.assertEqual(decision["transition_bars"], 16)
        self.assertEqual(decision["target_bpm"], 128.0)
        self.assertEqual(decision["fallback_strategy"], "smooth_crossfade")

    def test_06_profile_energy_adaptation(self):
        """Test that event profiles adapt target energy deterministically."""
        current_track = self.mock_library[0]

        # Chill profile
        decision_chill = self.planner.plan_next_track(current_track, self.mock_library, event_profile="Chill")
        self.assertEqual(decision_chill["target_energy"], 0.50)

        # High Energy profile
        decision_hi = self.planner.plan_next_track(current_track, self.mock_library, event_profile="High Energy")
        self.assertEqual(decision_hi["target_energy"], 0.95)


if __name__ == "__main__":
    unittest.main()
