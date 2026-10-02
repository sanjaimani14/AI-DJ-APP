"""
analyzer/prepopulate.py - Pre-populates the SQLite cache with all files from demo-music/
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from analyzer.engine import AudioAnalysisEngine
from database.db import db_instance

def main():
    engine = AudioAnalysisEngine(db_instance)
    demo_dir = os.path.join(BASE_DIR, "demo-music")
    files = [
        os.path.join(demo_dir, f)
        for f in os.listdir(demo_dir)
        if f.lower().endswith((".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg"))
    ]
    
    print(f"Pre-analyzing {len(files)} files into SQLite cache: {db_instance.db_path}")
    for f in files:
        res = engine.analyze_file(f, force_reanalyze=True)
        wf_pts = len(res.get("waveformPeaks", []))
        bg_beats = len(res.get("beatPositions", []))
        downbeats = sum(1 for b in res.get("beatGrid", {}).get("beats", []) if b.get("isDownbeat"))
        print(f" -> {os.path.basename(f)}: BPM={res.get('bpm')} | Waveform: {wf_pts} pts | Beats: {bg_beats} ({downbeats} downbeats) | DURATION={res.get('duration')}s")

    print(f"\nDone! Total tracks cached in SQLite: {len(db_instance.get_all_tracks())}")

if __name__ == "__main__":
    main()
