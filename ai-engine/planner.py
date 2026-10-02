"""
ai-engine/planner.py - Deterministic AI DJ Decision Engine (Phase 7)
Evaluates structured track metadata (BPM, Camelot Key, Energy, Genre, History)
and determines optimal next track, transition type, transition length, and timing.
Operates strictly on structured metadata - NEVER processes raw audio samples.
Fully deterministic and offline-capable with rule-based fallback logic.
"""

import math
import time
from typing import Dict, List, Optional, Any, Tuple


class CamelotWheel:
    """
    Camelot Key harmonic mixing matrix.
    Keys are in format: '1A' through '12A' (Minor) and '1B' through '12B' (Major).
    """

    @staticmethod
    def parse_key(key_str: Optional[str]) -> Tuple[Optional[int], Optional[str]]:
        if not key_str or key_str in ("--", "Unknown", "Unavailable"):
            return None, None
        key_str = key_str.strip().upper()
        if len(key_str) >= 2 and key_str[-1] in ('A', 'B'):
            try:
                num = int(key_str[:-1])
                letter = key_str[-1]
                if 1 <= num <= 12:
                    return num, letter
            except ValueError:
                pass
        return None, None

    @classmethod
    def compatibility_score(cls, key1: Optional[str], key2: Optional[str]) -> float:
        """
        Calculate harmonic compatibility score between 0.0 and 1.0.
        Same key: 1.0
        Adjacent (+/- 1 on wheel, same letter): 0.95
        Relative Major/Minor (same number, A <-> B): 0.90
        Diagonal (+/- 1 and opposite letter): 0.70
        2 steps (+/- 2, energy boost/drop): 0.50
        Clash / Opposite side: 0.15
        Unknown key: 0.50
        """
        n1, l1 = cls.parse_key(key1)
        n2, l2 = cls.parse_key(key2)

        if n1 is None or n2 is None or l1 is None or l2 is None:
            return 0.50  # Neutral fallback for unanalyzed keys

        if n1 == n2 and l1 == l2:
            return 1.00  # Exact same key

        # Distance around 12-hour wheel
        diff = abs(n1 - n2)
        dist = min(diff, 12 - diff)

        if dist == 0 and l1 != l2:
            return 0.90  # Relative major/minor (e.g. 8A <-> 8B)

        if dist == 1:
            if l1 == l2:
                return 0.95  # Adjacent key (e.g. 8A -> 9A or 8A -> 7A)
            else:
                return 0.70  # Diagonal change

        if dist == 2:
            return 0.50  # 2 steps jump (energy modulation)

        return 0.15  # Harmonic clash


class AIDJPlanner:
    """
    Deterministic AI DJ Planner.
    Selects the next track and orchestrates transitions using compatibility scoring.
    """

    def __init__(self):
        self.history: List[str] = []  # List of recently played track IDs
        self.artist_history: List[str] = []  # List of recently played artists

    def reset_history(self):
        self.history.clear()
        self.artist_history.clear()

    def record_played(self, track_id: str, artist: str):
        if track_id:
            self.history.append(track_id)
        if artist:
            self.artist_history.append(artist.strip().lower())
        # Keep sliding window of 20 tracks
        if len(self.history) > 20:
            self.history.pop(0)
        if len(self.artist_history) > 20:
            self.artist_history.pop(0)

    @staticmethod
    def calculate_bpm_score(current_bpm: float, candidate_bpm: float) -> Tuple[float, float]:
        """
        Calculate BPM compatibility score and required pitch adjustment percent.
        Handles standard tempo ranges and half-time/double-time.
        """
        if not current_bpm or not candidate_bpm or current_bpm <= 0 or candidate_bpm <= 0:
            return 0.50, 0.0

        # Check direct tempo
        diff_pct = abs(candidate_bpm - current_bpm) / current_bpm * 100.0

        # Check half-time / double-time
        half_pct = abs(candidate_bpm * 2.0 - current_bpm) / current_bpm * 100.0
        double_pct = abs(candidate_bpm * 0.5 - current_bpm) / current_bpm * 100.0

        if half_pct < diff_pct and half_pct < 6.0:
            return 0.85, (current_bpm / (candidate_bpm * 2.0) - 1.0) * 100.0
        if double_pct < diff_pct and double_pct < 6.0:
            return 0.85, (current_bpm / (candidate_bpm * 0.5) - 1.0) * 100.0

        pitch_adj = (current_bpm / candidate_bpm - 1.0) * 100.0

        if diff_pct <= 2.0:
            score = 1.00 - diff_pct * 0.02
        elif diff_pct <= 5.0:
            score = 0.96 - (diff_pct - 2.0) * 0.03
        elif diff_pct <= 8.0:
            score = 0.87 - (diff_pct - 5.0) * 0.05
        elif diff_pct <= 15.0:
            score = 0.72 - (diff_pct - 8.0) * 0.06
        else:
            score = max(0.10, 0.30 - (diff_pct - 15.0) * 0.02)

        return max(0.0, min(1.0, score)), pitch_adj

    @staticmethod
    def calculate_energy_score(target_energy: float, candidate_energy: float) -> float:
        """Score closeness of candidate energy to desired target energy (0.0 to 1.0)."""
        diff = abs(candidate_energy - target_energy)
        return max(0.0, 1.0 - diff * 2.0)

    @staticmethod
    def calculate_genre_score(current_genre: str, candidate_genre: str) -> float:
        """Evaluate genre affinity and compatibility."""
        g1 = (current_genre or "").strip().lower()
        g2 = (candidate_genre or "").strip().lower()

        if not g1 or not g2:
            return 0.70
        if g1 == g2:
            return 1.00

        # Compatible cross-genre pairings
        compatible_groups = [
            {"edm", "club", "house", "electro", "dance", "synth melodic"},
            {"hip hop", "trap", "rap", "r&b"},
            {"chill", "ambient", "downtempo", "acoustic"},
            {"tamil / kuthu", "kuthu", "folk", "high energy", "party"}
        ]
        for group in compatible_groups:
            if any(term in g1 for term in group) and any(term in g2 for term in group):
                return 0.85

        return 0.40

    def calculate_repetition_penalties(self, track_id: str, artist: str) -> Tuple[float, float]:
        """Penalty for recently played tracks and back-to-back artist repetition."""
        history_penalty = 0.0
        artist_penalty = 0.0

        if track_id in self.history:
            idx_from_end = len(self.history) - 1 - self.history.index(track_id)
            if idx_from_end == 0:
                history_penalty = 0.95  # Just played
            elif idx_from_end <= 2:
                history_penalty = 0.70
            elif idx_from_end <= 5:
                history_penalty = 0.45
            else:
                history_penalty = 0.25

        cand_artist = (artist or "").strip().lower()
        if cand_artist and cand_artist in self.artist_history:
            idx_from_end = len(self.artist_history) - 1 - self.artist_history.index(cand_artist)
            if idx_from_end == 0:
                artist_penalty = 0.40  # Back-to-back same artist
            elif idx_from_end <= 2:
                artist_penalty = 0.20
            else:
                artist_penalty = 0.10

        return history_penalty, artist_penalty

    def evaluate_candidate(
        self,
        current_track: Dict[str, Any],
        candidate: Dict[str, Any],
        event_profile: str = "Party",
        target_energy_override: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate candidate track compatibility against currently playing track.
        Returns composite score (0 to 1) and breakdown telemetry.
        """
        cur_bpm = float(current_track.get("bpm") or 128.0)
        cand_bpm = float(candidate.get("bpm") or 128.0)
        cur_key = current_track.get("key", "--")
        cand_key = candidate.get("key", "--")
        cur_energy = float(current_track.get("energy") if current_track.get("energy") is not None else 0.80)
        cand_energy = float(candidate.get("energy") if candidate.get("energy") is not None else 0.80)
        cur_genre = current_track.get("genre", "")
        cand_genre = candidate.get("genre", "")

        # Target energy determination based on event style profile
        if target_energy_override is not None:
            target_energy = target_energy_override
        else:
            profile_energy_map = {
                "Party": min(1.0, cur_energy + 0.05),
                "High Energy": 0.95,
                "EDM": min(1.0, cur_energy + 0.08),
                "Tamil / Kuthu": 0.92,
                "Chill": 0.50,
                "Romantic": 0.45,
                "Custom": cur_energy
            }
            target_energy = profile_energy_map.get(event_profile, 0.85)

        # 1. Component scores
        key_score = CamelotWheel.compatibility_score(cur_key, cand_key)
        bpm_score, pitch_adj = self.calculate_bpm_score(cur_bpm, cand_bpm)
        energy_score = self.calculate_energy_score(target_energy, cand_energy)
        genre_score = self.calculate_genre_score(cur_genre, cand_genre)

        # 2. Penalties
        hist_pen, artist_pen = self.calculate_repetition_penalties(
            candidate.get("id", ""),
            candidate.get("artist", "")
        )

        # 3. Transition Feasibility
        feasibility_score = 1.00
        cand_intro = float(candidate.get("intro_time") or candidate.get("introTime") or 4.0)
        cand_dur = float(candidate.get("duration") or 0.0)
        if cand_dur > 0 and cand_dur < 30.0:
            feasibility_score -= 0.30  # Very short track
        if cand_intro >= 4.0:
            feasibility_score = min(1.0, feasibility_score + 0.05)

        # 4. Weighted Composite Compatibility Score
        # Key: 30%, BPM: 25%, Energy: 20%, Genre: 10%, Feasibility: 15%
        raw_score = (
            0.30 * key_score +
            0.25 * bpm_score +
            0.20 * energy_score +
            0.10 * genre_score +
            0.15 * feasibility_score -
            hist_pen -
            artist_pen
        )
        total_score = max(0.01, min(1.00, raw_score))

        # 5. Deterministic Transition Strategy Selection
        transition_type, transition_bars, reasoning = self.select_transition_strategy(
            key_score, bpm_score, abs(cand_bpm - cur_bpm), cand_energy - cur_energy
        )

        return {
            "candidate_id": candidate.get("id"),
            "candidate_title": candidate.get("title"),
            "candidate_artist": candidate.get("artist"),
            "total_score": round(total_score, 4),
            "match_percent": int(total_score * 100),
            "key_score": round(key_score, 3),
            "bpm_score": round(bpm_score, 3),
            "energy_score": round(energy_score, 3),
            "genre_score": round(genre_score, 3),
            "history_penalty": hist_pen,
            "artist_penalty": artist_pen,
            "pitch_adjustment_percent": round(pitch_adj, 2),
            "target_bpm": round(cur_bpm, 1),
            "target_energy": round(target_energy, 2),
            "recommended_transition": transition_type,
            "recommended_bars": transition_bars,
            "reasoning": reasoning
        }

    @staticmethod
    def select_transition_strategy(
        key_score: float,
        bpm_score: float,
        bpm_diff: float,
        energy_diff: float
    ) -> Tuple[str, int, List[str]]:
        """
        Deterministic rule-based transition selector.
        Returns: (transition_type, transition_bars, reasoning_list)
        """
        reasoning = []

        # Case 1: High harmonic match & close tempo -> EQ Bass Swap
        if key_score >= 0.90 and bpm_diff <= 5.0:
            transition_type = "eq_bass_swap"
            transition_bars = 16
            reasoning.append(f"Harmonic key match ({int(key_score * 100)}%): EQ Bass Swap isolates low-end on phrase drop")
            reasoning.append("Tempo delta <= 5 BPM allows seamless beat alignment across 16 bars")

        # Case 2: Significant energy build/drop or moderate key change -> Filter Transition
        elif abs(energy_diff) >= 0.18 or key_score <= 0.60:
            transition_type = "filter_transition"
            transition_bars = 16
            reasoning.append("High-Pass Filter sweep builds energy and dissolves harmonic disparity before drop")
            reasoning.append("16-bar build creates tension release on incoming phrase downbeat")

        # Case 3: Moderate tempo difference -> Beat Mix with tempo synchronization
        elif bpm_diff <= 10.0:
            transition_type = "beat_mix"
            transition_bars = 16
            reasoning.append(f"Tempo delta {bpm_diff:.1f} BPM: Beat Mix synchronizes rhythm across 16 bars")
            reasoning.append("Dual synchronized groove holds rhythm while crossfading mids and highs")

        # Case 4: Large tempo or energy gap -> Echo-Out
        elif bpm_diff > 10.0 or energy_diff <= -0.25:
            transition_type = "echo_out"
            transition_bars = 8
            reasoning.append("Tempo/energy shift exceeds blend threshold: Echo-Out decay provides clean break")
            reasoning.append("8-bar ambient tail clears soundstage for incoming track drop")

        # Case 5: Standard fallback -> Smooth Crossfade
        else:
            transition_type = "smooth_crossfade"
            transition_bars = 16
            reasoning.append("Standard equal-power crossfade ensures acoustic balance with zero silence")

        return transition_type, transition_bars, reasoning

    def plan_next_track(
        self,
        current_track: Dict[str, Any],
        library: List[Dict[str, Any]],
        event_profile: str = "Party",
        active_deck: str = "A"
    ) -> Dict[str, Any]:
        """
        Main AI Decision Entry Point.
        Evaluates entire library and selects optimal next track.
        Produces strictly typed structured decision JSON adhering to protocol.
        """
        if not library:
            # Fallback if library is empty
            return self.get_empty_fallback_decision(current_track, active_deck)

        # Filter out currently playing track
        cur_id = current_track.get("id")
        candidates = [t for t in library if t.get("id") != cur_id]
        if not candidates:
            candidates = list(library)

        scored_candidates = []
        for cand in candidates:
            eval_res = self.evaluate_candidate(current_track, cand, event_profile)
            scored_candidates.append((eval_res["total_score"], cand, eval_res))

        # Sort descending by score (deterministic tie breaking by title)
        scored_candidates.sort(
            key=lambda x: (x[0], x[1].get("title", "")),
            reverse=True
        )

        best_score, best_track, best_eval = scored_candidates[0]

        next_deck = "B" if active_deck == "A" else "A"
        cur_bpm = float(current_track.get("bpm") or 128.0)
        target_bpm = round(cur_bpm, 1)
        target_energy = best_eval["target_energy"]
        transition_type = best_eval["recommended_transition"]
        transition_bars = best_eval["recommended_bars"]

        # Calculate timing
        cur_dur = float(current_track.get("duration") or 180.0)
        cur_outro = float(current_track.get("outro_time") or current_track.get("outroTime") or (cur_dur - 15.0))
        transition_seconds = transition_bars * 4 * (60.0 / cur_bpm)
        mix_out_start = max(0.0, cur_outro - transition_seconds)

        decision = {
            # REQUIRED ROOT FIELDS AS SPECIFIED IN USER PROMPT
            "next_track": best_track.get("title", ""),
            "transition_type": transition_type,
            "transition_bars": transition_bars,
            "target_bpm": target_bpm,
            "target_energy": target_energy,

            # EXTENDED PROTOCOL FIELDS
            "decision_id": f"dec-{int(time.time())}",
            "timestamp": int(time.time()),
            "active_deck": active_deck,
            "next_deck": next_deck,
            "next_track_details": {
                "id": best_track.get("id", ""),
                "title": best_track.get("title", ""),
                "artist": best_track.get("artist", ""),
                "file_path": best_track.get("file_path") or best_track.get("filePath") or "",
                "bpm": float(best_track.get("bpm") or 128.0),
                "key": best_track.get("key", "--"),
                "energy": float(best_track.get("energy") if best_track.get("energy") is not None else 0.8),
                "genre": best_track.get("genre", "General")
            },
            "compatibility_score": best_eval["total_score"],
            "match_percent": best_eval["match_percent"],
            "score_breakdown": {
                "key_compatibility": best_eval["key_score"],
                "bpm_compatibility": best_eval["bpm_score"],
                "energy_compatibility": best_eval["energy_score"],
                "genre_compatibility": best_eval["genre_score"],
                "history_penalty": best_eval["history_penalty"],
                "artist_penalty": best_eval["artist_penalty"]
            },
            "reasoning": best_eval["reasoning"],
            "transition_timing": {
                "mix_out_start_seconds": round(mix_out_start, 1),
                "transition_duration_seconds": round(transition_seconds, 1),
                "bars": transition_bars,
                "cue_in_seconds": float(best_track.get("intro_time") or best_track.get("introTime") or 4.0)
            },
            "fallback_strategy": "smooth_crossfade"
        }

        return decision

    @staticmethod
    def get_empty_fallback_decision(current_track: Dict[str, Any], active_deck: str) -> Dict[str, Any]:
        """Safe fallback decision when library or tracks are unavailable."""
        next_deck = "B" if active_deck == "A" else "A"
        cur_bpm = float(current_track.get("bpm") or 128.0)
        return {
            "next_track": "Default Standby Groove",
            "transition_type": "smooth_crossfade",
            "transition_bars": 16,
            "target_bpm": round(cur_bpm, 1),
            "target_energy": 0.80,
            "decision_id": f"dec-fallback-{int(time.time())}",
            "timestamp": int(time.time()),
            "active_deck": active_deck,
            "next_deck": next_deck,
            "next_track_details": {
                "id": "trk-fallback",
                "title": "Default Standby Groove",
                "artist": "AI DJ Safeguard",
                "file_path": "",
                "bpm": cur_bpm,
                "key": "8A",
                "energy": 0.80,
                "genre": "Safe Groove"
            },
            "compatibility_score": 0.70,
            "match_percent": 70,
            "score_breakdown": {
                "key_compatibility": 0.70,
                "bpm_compatibility": 1.00,
                "energy_compatibility": 0.80,
                "genre_compatibility": 0.70,
                "history_penalty": 0.0,
                "artist_penalty": 0.0
            },
            "reasoning": ["Rule-based safe fallback activated: Standard 16-bar equal-power crossfade"],
            "transition_timing": {
                "mix_out_start_seconds": 150.0,
                "transition_duration_seconds": 30.0,
                "bars": 16,
                "cue_in_seconds": 0.0
            },
            "fallback_strategy": "smooth_crossfade"
        }


# Global singleton instance
planner_instance = AIDJPlanner()
