"""
tests/test_phase3_e2e.py - End-to-End Integration Test for Phase 3 Audio Analysis Engine
Tests API service communication, caching, reanalysis, and error handling.
"""

import os
import sys
import json
import time
import unittest
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_URL = "http://127.0.0.1:8001/api"


def make_request(endpoint: str, data: dict = None, method: str = None) -> dict:
    url = f"{API_URL}/{endpoint}"
    if method is None:
        method = "POST" if data is not None else "GET"
    req_data = json.dumps(data).encode("utf-8") if data else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


class TestPhase3E2E(unittest.TestCase):
    def test_01_service_health(self):
        """Verify the Python audio analysis service is healthy and connected to SQLite."""
        health = make_request("health")
        self.assertEqual(health.get("status"), "healthy")
        self.assertIn("librosa", health.get("backend", ""))
        self.assertGreaterEqual(health.get("tracks_cached", 0), 5)
        print(f"\n[E2E HEALTH]: Service is ONLINE with {health.get('tracks_cached')} cached tracks in SQLite.")

    def test_02_library_tracks_metrics(self):
        """Verify all cached tracks have complete Phase 3 calculations."""
        data = make_request("tracks")
        tracks = data.get("tracks", [])
        self.assertGreaterEqual(len(tracks), 5, "Library must contain at least 5 cached tracks")

        print(f"\n[E2E LIBRARY DISPLAY VERIFICATION]: {len(tracks)} tracks verified:")
        for t in tracks:
            # Display: BPM | KEY | ENERGY | DURATION
            bpm_str = f"{t.get('bpm'):.1f}" if t.get("bpm") is not None else "UNAVAILABLE"
            key_str = f"{t.get('key_camelot')} ({t.get('key_musical')})" if t.get("key_camelot") else "UNAVAILABLE"
            energy_str = f"{round(t.get('energy', 0) * 100)}%" if t.get("energy") is not None else "UNAVAILABLE"
            duration_str = f"{t.get('duration'):.1f}s" if t.get("duration") is not None else "UNAVAILABLE"
            
            print(f"  • {t.get('title'):<30} | BPM: {bpm_str:<5} | KEY: {key_str:<18} | ENERGY: {energy_str:<5} | DURATION: {duration_str}")

            self.assertIsNotNone(t.get("bpm"), f"BPM must not be None for {t.get('title')}")
            self.assertIsNotNone(t.get("key_camelot"), f"Key must not be None for {t.get('title')}")
            self.assertIsNotNone(t.get("energy"), f"Energy must not be None for {t.get('title')}")
            self.assertIsNotNone(t.get("duration"), f"Duration must not be None for {t.get('title')}")
            self.assertIsNotNone(t.get("loudness_lufs"), f"LUFS must not be None for {t.get('title')}")

    def test_03_reanalyze_endpoint(self):
        """Verify POST /api/reanalyze recalculates fresh audio features bypassing cache."""
        club_beat_path = os.path.join(BASE_DIR, "demo-music", "Club_Beat_128BPM.wav")
        res = make_request("reanalyze", {"file_path": club_beat_path})
        
        self.assertFalse(res.get("cached"), "Reanalyze must bypass cache and set cached=False")
        self.assertEqual(res.get("status"), "analyzed")
        self.assertAlmostEqual(res.get("bpm"), 128.0, delta=2.5)
        print(f"\n[E2E REANALYZE]: Fresh extraction of Club_Beat_128BPM.wav succeeded (BPM: {res.get('bpm')}, Key: {res.get('key_camelot')}).")

    def test_04_instant_cache_on_unchanged_file(self):
        """Verify subsequent analysis of unchanged file returns cached record with near-zero latency."""
        club_beat_path = os.path.join(BASE_DIR, "demo-music", "Club_Beat_128BPM.wav")
        t0 = time.time()
        res = make_request("analyze", {"file_path": club_beat_path, "force_reanalyze": False})
        dt = (time.time() - t0) * 1000
        
        self.assertTrue(res.get("cached"), "Unchanged file must return cached=True")
        self.assertLess(dt, 150, "Cached request must be served under 150ms")
        print(f"\n[E2E CACHE]: Unchanged file returned from SQLite cache in {dt:.2f}ms (cached=True).")

    def test_05_error_handling_nonexistent_file(self):
        """Verify non-existent files return 404 or failed status without fake metrics."""
        try:
            make_request("analyze", {"file_path": "non_existent_path.wav"})
            self.fail("Should have raised HTTP error for missing file")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 404)
            print(f"\n[E2E ERROR HANDLING]: Non-existent file returned HTTP 404 cleanly.")


if __name__ == "__main__":
    unittest.main()
