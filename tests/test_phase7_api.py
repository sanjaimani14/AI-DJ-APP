"""
tests/test_phase7_api.py - Test FastAPI /api/ai/plan endpoint
Validates that the HTTP service receives structured track information and responds
with the exact structured decision format without touching raw audio.
"""

import sys
import os
import unittest
from starlette.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
ai_engine_dir = os.path.join(BASE_DIR, "ai-engine")
if ai_engine_dir not in sys.path:
    sys.path.insert(0, ai_engine_dir)

from analyzer.service import app


class TestPhase7API(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_post_ai_plan_endpoint(self):
        """Test POST /api/ai/plan returns required structured decision format."""
        payload = {
            "current_track": {
                "id": "trk-test-1",
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
            "library": [
                {
                    "id": "trk-test-2",
                    "title": "Harmonic Synths 120BPM",
                    "artist": "Synth Wave",
                    "bpm": 120.0,
                    "key": "9A",
                    "energy": 0.70,
                    "genre": "Synthwave",
                    "duration": 200.0,
                    "intro_time": 8.0,
                    "outro_time": 185.0
                },
                {
                    "id": "trk-test-3",
                    "title": "Deep Bass Groove 126BPM",
                    "artist": "Bass Producer",
                    "bpm": 126.0,
                    "key": "8B",
                    "energy": 0.82,
                    "genre": "Deep House",
                    "duration": 190.0,
                    "intro_time": 4.0,
                    "outro_time": 175.0
                }
            ],
            "event_profile": "Party",
            "active_deck": "A"
        }

        response = self.client.post("/api/ai/plan", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()

        # Verify all root format requirements from prompt
        self.assertIn("next_track", data)
        self.assertIn("transition_type", data)
        self.assertIn("transition_bars", data)
        self.assertIn("target_bpm", data)
        self.assertIn("target_energy", data)

        print("\nAPI Response Validated:")
        print(f"next_track: {data['next_track']}")
        print(f"transition_type: {data['transition_type']}")
        print(f"transition_bars: {data['transition_bars']}")
        print(f"target_bpm: {data['target_bpm']}")
        print(f"target_energy: {data['target_energy']}")
        print(f"compatibility_score: {data['compatibility_score']}")
        print(f"reasoning: {data['reasoning']}")

        self.assertEqual(data["next_track"], "Deep Bass Groove 126BPM")
        self.assertEqual(data["transition_type"], "eq_bass_swap")
        self.assertEqual(data["transition_bars"], 16)
        self.assertEqual(data["target_bpm"], 128.0)
        self.assertAlmostEqual(data["target_energy"], 0.90, delta=0.1)

    def test_post_ai_plan_fallback(self):
        """Test fallback when library is empty."""
        payload = {
            "current_track": {
                "id": "trk-test-solo",
                "title": "Solo Track",
                "bpm": 130.0,
                "key": "5A",
                "energy": 0.75
            },
            "library": [],
            "event_profile": "Chill",
            "active_deck": "B"
        }

        response = self.client.post("/api/ai/plan", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("next_track", data)
        self.assertEqual(data["transition_type"], "smooth_crossfade")
        self.assertEqual(data["transition_bars"], 16)
        self.assertEqual(data["target_bpm"], 130.0)


if __name__ == "__main__":
    unittest.main()
