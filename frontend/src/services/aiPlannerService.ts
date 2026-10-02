/**
 * frontend/src/services/aiPlannerService.ts - AI DJ Decision Engine (Phase 7)
 * Evaluates structured track information (BPM, Camelot Key, Energy, Genre, History)
 * and determines:
 * 1. Next track
 * 2. Transition type
 * 3. Transition length (bars)
 * 4. Target BPM
 * 5. Target energy
 * 6. Transition timing
 * 
 * Operates purely on structured metadata - NEVER touches raw audio samples.
 * 100% deterministic & offline-capable with rule-based fallback decision logic.
 */

import type { Track, EventProfile } from '../types/dj';
import type { TransitionType, TransitionBars } from '../audio/transitions';
import { EnergyManager, type EnergyLevel } from './energyManager';
import { SafetyLogger } from './safetyLogger';

export interface StructuredAIDecision {
  // REQUIRED ROOT FORMAT
  next_track: string;
  transition_type: TransitionType;
  transition_bars: TransitionBars;
  target_bpm: number;
  target_energy: number;

  // EXTENDED PROTOCOL FIELDS
  decision_id: string;
  timestamp: number;
  active_deck: 'A' | 'B';
  next_deck: 'A' | 'B';
  next_track_details: Track | null;
  compatibility_score: number;
  match_percent: number;
  score_breakdown: {
    key_compatibility: number;
    bpm_compatibility: number;
    energy_compatibility: number;
    genre_compatibility: number;
    history_penalty: number;
    artist_penalty: number;
    jump_penalty?: number;
    energy_level?: EnergyLevel;
  };
  reasoning: string[];
  transition_timing: {
    mix_out_start_seconds: number;
    transition_duration_seconds: number;
    bars: TransitionBars;
    cue_in_seconds: number;
  };
  fallback_strategy: 'smooth_crossfade';
}

export class CamelotWheelTS {
  public static parseKey(keyStr: string | undefined | null): { num: number; letter: string } | null {
    if (!keyStr || keyStr === '--' || keyStr === 'Unknown') return null;
    const clean = keyStr.trim().toUpperCase();
    if (clean.length >= 2 && (clean.endsWith('A') || clean.endsWith('B'))) {
      const num = parseInt(clean.slice(0, -1), 10);
      const letter = clean.slice(-1);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        return { num, letter };
      }
    }
    return null;
  }

  public static compatibilityScore(key1: string | undefined | null, key2: string | undefined | null): number {
    const k1 = this.parseKey(key1);
    const k2 = this.parseKey(key2);

    if (!k1 || !k2) return 0.50; // Neutral fallback for unanalyzed keys
    if (k1.num === k2.num && k1.letter === k2.letter) return 1.00; // Perfect match

    const diff = Math.abs(k1.num - k2.num);
    const dist = Math.min(diff, 12 - diff);

    if (dist === 0 && k1.letter !== k2.letter) return 0.90; // Relative Major/Minor (e.g. 8A <-> 8B)
    if (dist === 1) {
      if (k1.letter === k2.letter) return 0.95; // Adjacent key (e.g. 8A -> 9A)
      return 0.70; // Diagonal
    }
    if (dist === 2) return 0.50; // 2 steps energy shift
    return 0.15; // Harmonic clash
  }
}

export class AIPlannerService {
  private static history: string[] = [];
  private static artistHistory: string[] = [];

  public static recordPlayed(trackId: string, artist: string) {
    if (trackId) this.history.push(trackId);
    if (artist) this.artistHistory.push(artist.trim().toLowerCase());
    if (this.history.length > 20) this.history.shift();
    if (this.artistHistory.length > 20) this.artistHistory.shift();
  }

  public static resetHistory() {
    this.history = [];
    this.artistHistory = [];
  }

  public static calculateBpmScore(currentBpm: number, candidateBpm: number): { score: number; pitchAdj: number } {
    if (!currentBpm || !candidateBpm || currentBpm <= 0 || candidateBpm <= 0) {
      return { score: 0.50, pitchAdj: 0 };
    }

    const diffPct = Math.abs(candidateBpm - currentBpm) / currentBpm * 100.0;
    const halfPct = Math.abs(candidateBpm * 2.0 - currentBpm) / currentBpm * 100.0;
    const doublePct = Math.abs(candidateBpm * 0.5 - currentBpm) / currentBpm * 100.0;

    if (halfPct < diffPct && halfPct < 6.0) {
      return { score: 0.85, pitchAdj: (currentBpm / (candidateBpm * 2.0) - 1.0) * 100.0 };
    }
    if (doublePct < diffPct && doublePct < 6.0) {
      return { score: 0.85, pitchAdj: (currentBpm / (candidateBpm * 0.5) - 1.0) * 100.0 };
    }

    const pitchAdj = (currentBpm / candidateBpm - 1.0) * 100.0;
    let score = 0.5;

    if (diffPct <= 2.0) {
      score = 1.00 - diffPct * 0.02;
    } else if (diffPct <= 5.0) {
      score = 0.96 - (diffPct - 2.0) * 0.03;
    } else if (diffPct <= 8.0) {
      score = 0.87 - (diffPct - 5.0) * 0.05;
    } else if (diffPct <= 15.0) {
      score = 0.72 - (diffPct - 8.0) * 0.06;
    } else {
      score = Math.max(0.10, 0.30 - (diffPct - 15.0) * 0.02);
    }

    return { score: Math.max(0, Math.min(1.0, score)), pitchAdj };
  }

  public static calculateRepetitionPenalties(trackId: string, artist: string): { historyPen: number; artistPen: number } {
    let historyPen = 0;
    let artistPen = 0;

    const histIdx = this.history.lastIndexOf(trackId);
    if (histIdx !== -1) {
      const idxFromEnd = this.history.length - 1 - histIdx;
      if (idxFromEnd === 0) historyPen = 0.95;
      else if (idxFromEnd <= 2) historyPen = 0.70;
      else if (idxFromEnd <= 5) historyPen = 0.45;
      else historyPen = 0.25;
    }

    const cleanArtist = (artist || '').trim().toLowerCase();
    if (cleanArtist) {
      const artIdx = this.artistHistory.lastIndexOf(cleanArtist);
      if (artIdx !== -1) {
        const idxFromEnd = this.artistHistory.length - 1 - artIdx;
        if (idxFromEnd === 0) artistPen = 0.40;
        else if (idxFromEnd <= 2) artistPen = 0.20;
        else artistPen = 0.10;
      }
    }

    return { historyPen, artistPen };
  }

  public static evaluateCandidate(
    currentTrack: Track,
    candidate: Track,
    eventProfile: EventProfile = 'Party',
    customTargetEnergy?: number,
    allowJumps = false
  ): {
    totalScore: number;
    matchPercent: number;
    keyScore: number;
    bpmScore: number;
    energyScore: number;
    jumpPenalty: number;
    energyLevel: EnergyLevel;
    genreScore: number;
    historyPen: number;
    artistPen: number;
    targetEnergy: number;
    recommendedTransition: TransitionType;
    recommendedBars: TransitionBars;
    reasoning: string[];
  } {
    const curBpm = currentTrack.bpm || 128.0;
    const candBpm = candidate.bpm || 128.0;
    const curEnergy = currentTrack.energy ?? 0.80;
    const candEnergy = candidate.energy ?? 0.80;

    // Use dynamic curve target if specified, otherwise profile default
    const targetEnergy = customTargetEnergy !== undefined
      ? customTargetEnergy
      : (EnergyManager.getProfilePresets()[eventProfile]?.targetEnergy ?? 0.85);

    // 1. Scoring dimensions
    const keyScore = CamelotWheelTS.compatibilityScore(currentTrack.key, candidate.key);
    const { score: bpmScore } = this.calculateBpmScore(curBpm, candBpm);
    const { score: energyScore, jumpPenalty, isAppropriate } = EnergyManager.scoreCandidateEnergy(
      candEnergy,
      curEnergy,
      targetEnergy,
      allowJumps
    );

    const curGenre = (currentTrack.genre || '').toLowerCase();
    const candGenre = (candidate.genre || '').toLowerCase();
    let genreScore = 0.70;
    if (curGenre && candGenre) {
      if (curGenre === candGenre) genreScore = 1.00;
      else if (
        (curGenre.includes('edm') || curGenre.includes('club') || curGenre.includes('synth')) &&
        (candGenre.includes('edm') || candGenre.includes('club') || candGenre.includes('synth'))
      ) {
        genreScore = 0.85;
      }
    }

    const { historyPen, artistPen } = this.calculateRepetitionPenalties(candidate.id, candidate.artist);

    // Feasibility
    let feasibilityScore = 1.00;
    if (candidate.duration && candidate.duration < 30.0) feasibilityScore -= 0.30;
    if ((candidate.introTime || 0) >= 4.0) feasibilityScore = Math.min(1.0, feasibilityScore + 0.05);

    // Weighted Total Score with jump penalty applied
    const rawScore = (
      0.30 * keyScore +
      0.25 * bpmScore +
      0.20 * energyScore +
      0.10 * genreScore +
      0.15 * feasibilityScore -
      historyPen -
      artistPen -
      jumpPenalty
    );
    const totalScore = Math.max(0.01, Math.min(1.00, rawScore));

    // Transition Strategy Rules
    const bpmDiff = Math.abs(candBpm - curBpm);
    const energyDiff = candEnergy - curEnergy;
    let recommendedTransition: TransitionType = 'smooth_crossfade';
    let recommendedBars: TransitionBars = 16;
    const reasoning: string[] = [];

    if (!isAppropriate && jumpPenalty > 0) {
      reasoning.push(`Sudden energy jump (${Math.round(Math.abs(candEnergy - curEnergy) * 100)}% shift): penalized to avoid jarring transition`);
    } else {
      reasoning.push(`Energy matches planned curve (${Math.round(candEnergy * 100)}% [${EnergyManager.getEnergyLevel(candEnergy)}] vs target ${Math.round(targetEnergy * 100)}%)`);
    }

    if (keyScore >= 0.90 && bpmDiff <= 5.0) {
      recommendedTransition = 'eq_bass_swap';
      recommendedBars = 16;
      reasoning.push(`Harmonic match (${Math.round(keyScore * 100)}%): EQ Bass Swap isolates low-end on phrase drop`);
      reasoning.push('Tempo delta <= 5 BPM allows seamless beat alignment across 16 bars');
    } else if (Math.abs(energyDiff) >= 0.18 || keyScore <= 0.60) {
      recommendedTransition = 'filter_transition';
      recommendedBars = 16;
      reasoning.push('High-Pass Filter sweep builds energy and dissolves harmonic disparity before drop');
      reasoning.push('16-bar build creates tension release on incoming phrase downbeat');
    } else if (bpmDiff <= 10.0) {
      recommendedTransition = 'beat_mix';
      recommendedBars = 16;
      reasoning.push(`Tempo delta ${bpmDiff.toFixed(1)} BPM: Beat Mix synchronizes rhythm across 16 bars`);
      reasoning.push('Dual synchronized groove holds rhythm while crossfading mids and highs');
    } else if (bpmDiff > 10.0 || energyDiff <= -0.25) {
      recommendedTransition = 'echo_out';
      recommendedBars = 8;
      reasoning.push('Tempo/energy shift exceeds blend threshold: Echo-Out decay provides clean break');
      reasoning.push('8-bar ambient tail clears soundstage for incoming track drop');
    } else {
      recommendedTransition = 'smooth_crossfade';
      recommendedBars = 16;
      reasoning.push('Standard equal-power crossfade ensures acoustic balance with zero silence');
    }

    return {
      totalScore: parseFloat(totalScore.toFixed(4)),
      matchPercent: Math.round(totalScore * 100),
      keyScore: parseFloat(keyScore.toFixed(3)),
      bpmScore: parseFloat(bpmScore.toFixed(3)),
      energyScore: parseFloat(energyScore.toFixed(3)),
      jumpPenalty: parseFloat(jumpPenalty.toFixed(3)),
      energyLevel: EnergyManager.getEnergyLevel(candEnergy),
      genreScore: parseFloat(genreScore.toFixed(3)),
      historyPen,
      artistPen,
      targetEnergy: parseFloat(targetEnergy.toFixed(2)),
      recommendedTransition,
      recommendedBars,
      reasoning
    };
  }

  /**
   * Deterministic Plan Next Track
   * Evaluates library candidates and produces structured decision JSON.
   */
  public static planNextTrack(
    currentTrack: Track | null,
    library: Track[],
    eventProfile: EventProfile = 'Party',
    activeDeck: 'A' | 'B' = 'A',
    targetEnergyOverride?: number,
    allowJumps = false
  ): StructuredAIDecision {
    try {
      const nextDeck = activeDeck === 'A' ? 'B' : 'A';

      if (!currentTrack || !library || library.length === 0) {
        return this.getFallbackDecision(currentTrack, activeDeck, library);
      }

      // Filter candidate tracks (avoid playing same track immediately)
      const candidates = library.filter((t) => t && t.id !== currentTrack.id);
      const validPool = candidates.length > 0 ? candidates : library.filter(Boolean);

      if (validPool.length === 0) {
        return this.getFallbackDecision(currentTrack, activeDeck, library);
      }

      const scored = validPool.map((candidate) => ({
        candidate,
        eval: this.evaluateCandidate(currentTrack, candidate, eventProfile, targetEnergyOverride, allowJumps)
      }));

      // Sort descending by totalScore (deterministic tie-break by title)
      scored.sort((a, b) => {
        if (b.eval.totalScore !== a.eval.totalScore) {
          return b.eval.totalScore - a.eval.totalScore;
        }
        return (a.candidate.title || '').localeCompare(b.candidate.title || '');
      });

      const best = scored[0];
      const bestTrack = best.candidate;
      const bestEval = best.eval;

      const curBpm = currentTrack.bpm || 128.0;
      const curDur = currentTrack.duration || 180.0;
      const curOutro = currentTrack.outroTime || (curDur - 15.0);
      const transitionSeconds = bestEval.recommendedBars * 4 * (60.0 / curBpm);
      const mixOutStart = Math.max(0, curOutro - transitionSeconds);

      return {
        // REQUIRED ROOT FIELDS AS SPECIFIED IN USER PROMPT
        next_track: bestTrack.title,
        transition_type: bestEval.recommendedTransition,
        transition_bars: bestEval.recommendedBars,
        target_bpm: parseFloat(curBpm.toFixed(1)),
        target_energy: bestEval.targetEnergy,

        // EXTENDED PROTOCOL FIELDS
        decision_id: `dec-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        active_deck: activeDeck,
        next_deck: nextDeck,
        next_track_details: bestTrack,
        compatibility_score: bestEval.totalScore,
        match_percent: bestEval.matchPercent,
        score_breakdown: {
          key_compatibility: bestEval.keyScore,
          bpm_compatibility: bestEval.bpmScore,
          energy_compatibility: bestEval.energyScore,
          genre_compatibility: bestEval.genreScore,
          history_penalty: bestEval.historyPen,
          artist_penalty: bestEval.artistPen,
          jump_penalty: bestEval.jumpPenalty,
          energy_level: bestEval.energyLevel
        },
        reasoning: bestEval.reasoning,
        transition_timing: {
          mix_out_start_seconds: parseFloat(mixOutStart.toFixed(1)),
          transition_duration_seconds: parseFloat(transitionSeconds.toFixed(1)),
          bars: bestEval.recommendedBars,
          cue_in_seconds: bestTrack.introTime || 4.0
        },
        fallback_strategy: 'smooth_crossfade'
      };
    } catch (planErr: unknown) {
      const errMsg = planErr instanceof Error ? planErr.message : String(planErr);
      SafetyLogger.log(
        'AI_PLANNER',
        'CRITICAL_RECOVERY',
        `AI Planner execution failed: ${errMsg}`,
        'Switched to deterministic offline rule-based fallback planner'
      );
      return this.getFallbackDecision(currentTrack, activeDeck, library);
    }
  }

  public static getFallbackDecision(
    currentTrack: Track | null,
    activeDeck: 'A' | 'B' = 'A',
    library: Track[] = []
  ): StructuredAIDecision {
    const curBpm = currentTrack?.bpm || 128.0;
    const nextDeck = activeDeck === 'A' ? 'B' : 'A';
    
    // Choose the first healthy track from library if available
    const fallbackTrack = library.length > 0 
      ? (library.find((t) => !currentTrack || t.id !== currentTrack.id) || library[0])
      : null;

    const trackTitle = fallbackTrack ? fallbackTrack.title : 'Deterministic Standby Track';

    return {
      next_track: trackTitle,
      transition_type: 'smooth_crossfade',
      transition_bars: 16,
      target_bpm: parseFloat(curBpm.toFixed(1)),
      target_energy: 0.80,
      decision_id: `dec-fallback-${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000),
      active_deck: activeDeck,
      next_deck: nextDeck,
      next_track_details: fallbackTrack,
      compatibility_score: 0.70,
      match_percent: 70,
      score_breakdown: {
        key_compatibility: 0.70,
        bpm_compatibility: 1.00,
        energy_compatibility: 0.80,
        genre_compatibility: 0.70,
        history_penalty: 0.0,
        artist_penalty: 0.0
      },
      reasoning: ['Deterministic safe rule fallback: Standard 16-bar equal-power crossfade (Offline Protected)'],
      transition_timing: {
        mix_out_start_seconds: 150.0,
        transition_duration_seconds: 30.0,
        bars: 16,
        cue_in_seconds: fallbackTrack?.introTime || 0.0
      },
      fallback_strategy: 'smooth_crossfade'
    };
  }
}
