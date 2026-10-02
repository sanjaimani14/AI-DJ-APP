"""
tests/test_phase3_analysis.py - Comprehensive Verification Suite for Phase 3 Audio Analysis Engine
Tests at least 5 real audio files, validates calculations, compares with expected values,
tests SQLite caching and cache invalidation, and verifies error handling.
"""

import os
import sys
import time
import unittest

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from analyzer.engine import AudioAnalysisEngine
from analyzer.audio_features import extract_audio_features
from database.db import DatabaseManager


class TestPhase3AudioAnalysis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use an isolated test database
        cls.test_db_path = os.path.join(BASE_DIR, "tests", "test_cache.db")
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
        cls.db = DatabaseManager(cls.test_db_path)
        cls.engine = AudioAnalysisEngine(cls.db)

        # 5+ Real audio files to test
        cls.demo_dir = os.path.join(BASE_DIR, "demo-music")
        cls.test_files = [
            os.path.join(cls.demo_dir, "Club_Beat_128BPM.wav"),
            os.path.join(cls.demo_dir, "Harmonic_Synths_120BPM.mp3"),
            os.path.join(cls.demo_dir, "Alarm01.wav"),
            os.path.join(cls.demo_dir, "Ring01.wav"),
            os.path.join(cls.demo_dir, "chimes.wav"),
            os.path.join(cls.demo_dir, "tada.wav"),
        ]

        print("\n=======================================================")
        print(" PHASE 3 AUDIO ANALYSIS ENGINE — REAL AUDIO TEST SUITE")
        print("=======================================================")

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception:
                pass

    def test_01_verify_at_least_5_real_audio_files(self):
        """Test extraction across all 6 real audio files and verify all required Phase 3 metrics."""
        self.assertGreaterEqual(len(self.test_files), 5, "Must test with at least 5 real audio files")
        
        for file_path in self.test_files:
            self.assertTrue(os.path.exists(file_path), f"Audio file must exist: {file_path}")
            fname = os.path.basename(file_path)
            print(f"\n[ANALYZING REAL FILE]: {fname}")

            res = self.engine.analyze_file(file_path, force_reanalyze=True)
            self.assertEqual(res["status"], "analyzed", f"Track analysis should succeed for {fname}")
            
            # Verify ALL required Phase 3 features are present and calculated:
            # 1. BPM
            self.assertIsNotNone(res["bpm"], f"BPM must not be None for {fname}")
            self.assertGreater(res["bpm"], 0, f"BPM must be positive for {fname}")

            # 2. Beat positions
            self.assertIn("beatPositions", res, f"Beat positions must be present for {fname}")
            self.assertIsInstance(res["beatPositions"], list, f"Beat positions must be a list for {fname}")

            # 3. Beat confidence
            self.assertIsNotNone(res["beat_confidence"], f"Beat confidence must not be None for {fname}")
            self.assertGreaterEqual(res["beat_confidence"], 0.0)
            self.assertLessEqual(res["beat_confidence"], 1.0)

            # 4. Musical key & Camelot key
            self.assertIsNotNone(res["key_musical"], f"Musical key must be extracted for {fname}")
            self.assertIsNotNone(res["key_camelot"], f"Camelot key must be extracted for {fname}")

            # 5. Duration
            self.assertIsNotNone(res["duration"], f"Duration must not be None for {fname}")
            self.assertGreater(res["duration"], 0, f"Duration must be positive for {fname}")

            # 6. Loudness
            self.assertIsNotNone(res["loudness_lufs"], f"Loudness (LUFS) must not be None for {fname}")

            # 7. Energy
            self.assertIsNotNone(res["energy"], f"Energy must not be None for {fname}")
            self.assertGreaterEqual(res["energy"], 0.0)
            self.assertLessEqual(res["energy"], 1.0)

            # 8. Tempo confidence
            self.assertIsNotNone(res["tempo_confidence"], f"Tempo confidence must not be None for {fname}")
            self.assertGreaterEqual(res["tempo_confidence"], 0.0)
            self.assertLessEqual(res["tempo_confidence"], 1.0)

            # 9. Intro estimate
            self.assertIsNotNone(res["intro_start"])
            self.assertIsNotNone(res["intro_end"])
            self.assertGreaterEqual(res["intro_end"], res["intro_start"])

            # 10. Outro estimate
            self.assertIsNotNone(res["outro_start"])
            self.assertIsNotNone(res["outro_end"])
            self.assertGreaterEqual(res["outro_end"], res["outro_start"])

            print(f"  [OK] BPM: {res['bpm']} (confidence: {res['tempo_confidence']})")
            print(f"  [OK] Key: {res['key_musical']} | Camelot: {res['key_camelot']} (conf: {res['key_confidence']})")
            print(f"  [OK] Energy: {res['energy']} | Loudness: {res['loudness_lufs']} LUFS")
            print(f"  [OK] Duration: {res['duration']}s | Beats Detected: {len(res['beatPositions'])} (conf: {res['beat_confidence']})")
            print(f"  [OK] Intro: {res['intro_start']}s -> {res['intro_end']}s | Outro: {res['outro_start']}s -> {res['outro_end']}s")

    def test_02_compare_with_known_expected_values(self):
        """Compare calculated values with known ground-truth / filename metadata."""
        # 1. Club_Beat_128BPM.wav has known 128 BPM and exactly 30.0s duration
        club_beat = os.path.join(self.demo_dir, "Club_Beat_128BPM.wav")
        res1 = self.engine.analyze_file(club_beat)
        
        # Librosa beat_track on 128 BPM club loop detects ~129.2 or 128 BPM
        print(f"\n[GROUND TRUTH COMPARISON]: Club_Beat_128BPM.wav")
        print(f"  Expected BPM: ~128.0 | Calculated BPM: {res1['bpm']}")
        print(f"  Expected Duration: ~30.0s | Calculated Duration: {res1['duration']}s")
        self.assertAlmostEqual(res1["duration"], 30.0, delta=0.5, msg="Duration should be ~30.0s")
        self.assertAlmostEqual(res1["bpm"], 128.0, delta=2.5, msg="Club beat should be within 2.5 BPM of 128")
        self.assertGreaterEqual(res1["energy"], 0.65, "Club Beat should have high dance energy (>= 0.65)")

        # 2. Harmonic_Synths_120BPM.mp3 has known 120 BPM and 30.0s duration
        synths = os.path.join(self.demo_dir, "Harmonic_Synths_120BPM.mp3")
        res2 = self.engine.analyze_file(synths)
        print(f"\n[GROUND TRUTH COMPARISON]: Harmonic_Synths_120BPM.mp3")
        print(f"  Expected BPM: ~120.0 | Calculated BPM: {res2['bpm']}")
        print(f"  Expected Duration: ~30.0s | Calculated Duration: {res2['duration']}s")
        self.assertAlmostEqual(res2["duration"], 30.0, delta=0.5, msg="Duration should be ~30.0s")
        self.assertAlmostEqual(res2["bpm"], 120.0, delta=3.0, msg="Synths track should be close to 120 BPM")

        # 3. Alarm01.wav known duration ~5.57s
        alarm = os.path.join(self.demo_dir, "Alarm01.wav")
        res3 = self.engine.analyze_file(alarm)
        print(f"\n[GROUND TRUTH COMPARISON]: Alarm01.wav")
        print(f"  Expected Duration: ~5.57s | Calculated Duration: {res3['duration']}s")
        self.assertAlmostEqual(res3["duration"], 5.57, delta=0.2)

    def test_03_sqlite_caching_and_avoiding_reanalysis(self):
        """Verify that unchanged files are served from SQLite cache instantly."""
        file_path = self.test_files[0]
        
        # First call (already analyzed)
        t0 = time.time()
        res_cached = self.engine.analyze_file(file_path, force_reanalyze=False)
        t_cache = time.time() - t0
        self.assertTrue(res_cached.get("cached"), "Subsequent analysis must return cached record")
        self.assertLess(t_cache, 0.05, "Cache lookup must be ultra-fast (< 50ms)")
        print(f"\n[CACHE TEST]: Cached lookup completed in {t_cache*1000:.2f}ms (instant response, zero CPU re-analysis)")

        # Force reanalyze must bypass cache
        res_forced = self.engine.analyze_file(file_path, force_reanalyze=True)
        self.assertFalse(res_forced.get("cached"), "Force reanalyze must re-run extraction and set cached=False")
        print(f"[REANALYZE TEST]: Force reanalyze successfully bypassed cache")

    def test_04_error_handling_and_unavailable_features(self):
        """Test that invalid or missing files do not invent values and clearly mark unavailable."""
        fake_file = os.path.join(self.demo_dir, "non_existent_audio.wav")
        res = self.engine.analyze_file(fake_file)
        self.assertEqual(res["status"], "failed")
        self.assertIn("File not found", res["error_message"])
        self.assertIsNone(res.get("bpm"), "Must not invent BPM for failed file")
        self.assertIsNone(res.get("energy"), "Must not invent energy for failed file")
        print("\n[ERROR HANDLING TEST]: Non-existent file cleanly handled without inventing values")


if __name__ == "__main__":
    unittest.main()
