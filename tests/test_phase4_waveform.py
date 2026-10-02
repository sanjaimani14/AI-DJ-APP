"""
tests/test_phase4_waveform.py - Comprehensive Verification Suite for Phase 4 Waveform & Beat Grid
Validates:
1. Real audio waveform generation (800-pt overview + 3-band frequency energy arrays).
2. Structured Beat Grid generation (beat times, downbeat detection, bar numbering).
3. Intro and Outro zone detection.
4. SQLite waveform and beatgrid caching and deserialization.
5. Beat-grid readiness for Phase 5 beat matching.
6. REST API endpoint availability and response structure.
"""

import os
import sys
import json
import urllib.request
import unittest
import numpy as np
import librosa

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from analyzer.waveform import generate_waveform_and_beatgrid
from analyzer.audio_features import extract_audio_features
from analyzer.engine import AudioAnalysisEngine
from database.db import DatabaseManager


class TestPhase4WaveformsAndBeatGrid(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.demo_dir = os.path.join(BASE_DIR, "demo-music")
        cls.club_beat = os.path.join(cls.demo_dir, "Club_Beat_128BPM.wav")
        cls.synths = os.path.join(cls.demo_dir, "Harmonic_Synths_120BPM.mp3")
        cls.alarm = os.path.join(cls.demo_dir, "Alarm01.wav")
        cls.tada = os.path.join(cls.demo_dir, "tada.wav")

        cls.test_db_path = os.path.join(BASE_DIR, "tests", "test_phase4_cache.db")
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
        cls.db = DatabaseManager(cls.test_db_path)
        cls.engine = AudioAnalysisEngine(cls.db)

        print("\n=======================================================")
        print(" PHASE 4 WAVEFORMS & BEAT GRID — VERIFICATION SUITE")
        print("=======================================================")

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception:
                pass

    def test_01_waveform_generation_from_audio(self):
        """Test waveform extraction from actual audio data."""
        self.assertTrue(os.path.exists(self.club_beat), f"Audio file not found: {self.club_beat}")
        
        y, sr = librosa.load(self.club_beat, sr=22050, duration=10.0)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(np.atleast_1d(tempo)[0])

        result = generate_waveform_and_beatgrid(
            y=y,
            sr=sr,
            bpm=bpm,
            beat_frames=beat_frames,
            duration=10.0,
            intro_end=2.0,
            outro_start=8.0
        )

        waveform = result["waveform"]
        self.assertIn("overview", waveform)
        self.assertIn("low", waveform)
        self.assertIn("mid", waveform)
        self.assertIn("high", waveform)
        self.assertEqual(waveform["fps"], 35)

        # Overview should have exactly 800 normalized points
        overview = waveform["overview"]
        self.assertEqual(len(overview), 800)
        self.assertTrue(all(0.0 <= pt <= 1.0 for pt in overview))
        self.assertGreater(max(overview), 0.1, "Waveform amplitude should have substantial signal")

        # 3-band STFT frequencies
        low = waveform["low"]
        mid = waveform["mid"]
        high = waveform["high"]
        self.assertEqual(len(low), len(mid))
        self.assertEqual(len(mid), len(high))
        self.assertGreater(len(low), 100, "Should have continuous frames across audio duration")
        self.assertTrue(all(0.0 <= pt <= 1.0 for pt in low))
        self.assertTrue(all(0.0 <= pt <= 1.0 for pt in mid))
        self.assertTrue(all(0.0 <= pt <= 1.0 for pt in high))

    def test_02_structured_beat_grid_and_downbeats(self):
        """Test beat grid structure, downbeat identification, and bar numbering."""
        features = extract_audio_features(self.club_beat)
        
        self.assertIn("beat_positions_json", features)
        bg = features["beat_positions_json"]
        self.assertIsInstance(bg, dict)

        self.assertIn("bpm", bg)
        self.assertIn("beatInterval", bg)
        self.assertIn("firstBeat", bg)
        self.assertIn("downbeatPhase", bg)
        self.assertIn("totalBeats", bg)
        self.assertIn("beats", bg)

        beats = bg["beats"]
        self.assertGreater(len(beats), 10, "Should detect multiple beats in track")

        # Verify beat item fields
        downbeats = [b for b in beats if b["isDownbeat"]]
        self.assertGreater(len(downbeats), 0, "Should detect at least one downbeat in rhythmic dance track")

        for b in beats:
            self.assertIn("time", b)
            self.assertIn("isDownbeat", b)
            self.assertIn("bar", b)
            self.assertIn("beat", b)
            self.assertIn(b["beat"], [1, 2, 3, 4], "Beats in 4/4 grid must be 1, 2, 3, or 4")
            if b["isDownbeat"]:
                self.assertEqual(b["beat"], 1, "Downbeat must be beat 1 of its bar")

        # Verify monotonicity of time
        times = [b["time"] for b in beats]
        self.assertEqual(times, sorted(times), "Beat timestamps must be monotonically increasing")

    def test_03_intro_outro_zone_detection(self):
        """Verify intro and outro markers are generated alongside waveform."""
        features = extract_audio_features(self.club_beat)
        
        intro_start = features.get("intro_start", 0.0)
        intro_end = features.get("intro_end", 0.0)
        outro_start = features.get("outro_start", 0.0)
        outro_end = features.get("outro_end", 0.0)
        duration = features.get("duration", 0.0)

        self.assertGreater(duration, 0.0)
        self.assertGreaterEqual(intro_end, intro_start)
        self.assertGreaterEqual(outro_start, intro_end, "Outro should start after intro ends")
        self.assertLessEqual(outro_start, duration)
        self.assertLessEqual(outro_end, duration + 0.1)

    def test_04_sqlite_caching_and_deserialization(self):
        """Verify that waveform and beat-grid data are cleanly cached in SQLite and restored as dicts/lists."""
        analyzed = self.engine.analyze_file(self.synths)
        self.assertIsNotNone(analyzed)

        # Retrieve from test DB and verify deserialized types
        saved = self.db.get_track_by_path(self.synths)
        self.assertIsNotNone(saved)

        # Check waveform object
        self.assertIn("waveform", saved)
        wf = saved["waveform"]
        self.assertIsInstance(wf, dict)
        self.assertIn("overview", wf)
        self.assertEqual(len(wf["overview"]), 800)
        self.assertIn("low", wf)
        self.assertIn("mid", wf)
        self.assertIn("high", wf)

        # Check beat grid object
        self.assertIn("beatGrid", saved)
        bg = saved["beatGrid"]
        self.assertIsInstance(bg, dict)
        self.assertIn("beats", bg)
        self.assertIsInstance(bg["beats"], list)
        self.assertGreater(len(bg["beats"]), 0)
        self.assertIsInstance(bg["beats"][0], dict)
        self.assertIn("isDownbeat", bg["beats"][0])

    def test_05_beat_grid_matching_preparedness(self):
        """Verify that beat grid data can be used to compute sync offset and pitch delta for future beat matching."""
        feat_a = extract_audio_features(self.club_beat)
        feat_b = extract_audio_features(self.synths)

        bg_a = feat_a["beat_positions_json"]
        bg_b = feat_b["beat_positions_json"]

        bpm_a = bg_a["bpm"]
        bpm_b = bg_b["bpm"]
        
        # Calculate pitch slider adjustment needed to match Deck B to Deck A
        pitch_rate_b_to_a = bpm_a / bpm_b
        pitch_pct_adjustment = (pitch_rate_b_to_a - 1.0) * 100.0

        # Assert calculation is mathematically sound and ready
        self.assertIsInstance(pitch_pct_adjustment, float)
        self.assertTrue(-50.0 < pitch_pct_adjustment < 50.0)

        # Calculate phase offset at a given playback time
        current_time_a = 5.0
        # Find nearest beat in Deck A
        beats_a = [b["time"] for b in bg_a["beats"]]
        nearest_beat_a = min(beats_a, key=lambda t: abs(t - current_time_a))
        phase_offset_a = current_time_a - nearest_beat_a
        self.assertLess(abs(phase_offset_a), bg_a["beatInterval"])

    def test_06_analysis_api_service_serves_phase4_data(self):
        """Test that the running FastAPI service exposes waveform and beat grid data for frontend consumption."""
        try:
            req = urllib.request.urlopen("http://127.0.0.1:8001/api/tracks", timeout=3.0)
            res = json.loads(req.read().decode())
            tracks = res.get("tracks", [])
            self.assertGreaterEqual(len(tracks), 2, "API should return pre-cached tracks")

            # Check that tracks have waveform and beatGrid populated
            analyzed_tracks = [t for t in tracks if t.get("waveform") and t.get("beatGrid")]
            self.assertGreaterEqual(len(analyzed_tracks), 2, "Tracks must have waveform and beatGrid")

            sample_track = analyzed_tracks[0]
            wf = sample_track["waveform"]
            self.assertEqual(len(wf["overview"]), 800)
            self.assertIn("low", wf)
            self.assertIn("mid", wf)
            self.assertIn("high", wf)

            bg = sample_track["beatGrid"]
            self.assertIn("beats", bg)
            self.assertGreater(len(bg["beats"]), 0)
            print(f"\n[API TEST PASSED] Track '{sample_track['title']}' loaded with 800 overview points & {len(bg['beats'])} beat grid markers.")
        except Exception as e:
            self.fail(f"API service check failed: {e}")


if __name__ == "__main__":
    unittest.main()
