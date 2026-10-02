/**
 * frontend/src/services/energyManager.ts - AI Energy Management System (Phase 9)
 *
 * Implements continuous energy curve planning, tracking energy from 0.0 to 1.0.
 * Supports:
 *   - LOW: 0.00 - 0.39
 *   - MEDIUM: 0.40 - 0.69
 *   - HIGH: 0.70 - 0.84
 *   - PEAK: 0.85 - 1.00
 *
 * Supports Event Profiles:
 *   - Chill
 *   - Party
 *   - High Energy
 *   - EDM
 *   - Tamil/Kuthu
 *   - Romantic
 *   - Custom
 *
 * Provides configurable:
 *   - START ENERGY
 *   - TARGET ENERGY
 *   - EVENT DURATION
 *   - PEAK TIME
 *   - AVOID SUDDEN INAPPROPRIATE JUMPS
 */

import type { EventProfile, Track } from '../types/dj';

export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK';

export interface EnergyConfig {
  profile: EventProfile;
  startEnergy: number;       // 0.0 to 1.0
  targetEnergy: number;      // 0.0 to 1.0 (Peak target)
  eventDurationMinutes: number; // Set duration in minutes
  peakTimeMinutes: number;   // Minute when target energy peaks
  allowJumps: boolean;       // If false, penalizes energy delta > 0.20 between tracks
}

export interface EnergyCurvePoint {
  minute: number;
  progressPercent: number;
  targetEnergy: number;
  level: EnergyLevel;
  phaseName: string;
}

export interface PlaylistEnergySimulationItem {
  track: Track;
  minuteTimestamp: number;
  actualEnergy: number;
  curveTargetEnergy: number;
  energyLevel: EnergyLevel;
  deltaFromTarget: number;
  isSmoothTransition: boolean;
}

export interface PlaylistSimulationResult {
  plannedSequence: PlaylistEnergySimulationItem[];
  averageEnergyDelta: number;
  maxEnergyJump: number;
  smoothnessScorePercent: number;
  summary: string;
}

export class EnergyManager {
  /**
   * Classify energy into LOW, MEDIUM, HIGH, PEAK.
   */
  public static getEnergyLevel(energy: number): EnergyLevel {
    const clamped = Math.max(0.0, Math.min(1.0, energy));
    if (clamped >= 0.85) return 'PEAK';
    if (clamped >= 0.70) return 'HIGH';
    if (clamped >= 0.40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Visual badge color for each energy tier.
   */
  public static getEnergyColor(level: EnergyLevel): string {
    switch (level) {
      case 'PEAK': return '#ff007f';   // Radiant neon pink/magenta
      case 'HIGH': return '#ff9100';   // Warm vibrant amber/orange
      case 'MEDIUM': return '#00ff88'; // Clean neon green
      case 'LOW':
      default: return '#00e5ff';       // Electric cyan
    }
  }

  /**
   * Default presets for all event profiles.
   */
  public static getProfilePresets(): Record<string, EnergyConfig> {
    return {
      'Party': {
        profile: 'Party',
        startEnergy: 0.60,
        targetEnergy: 0.88,
        eventDurationMinutes: 120,
        peakTimeMinutes: 80,
        allowJumps: false
      },
      'High Energy': {
        profile: 'High Energy',
        startEnergy: 0.75,
        targetEnergy: 0.98,
        eventDurationMinutes: 90,
        peakTimeMinutes: 55,
        allowJumps: false
      },
      'EDM': {
        profile: 'EDM',
        startEnergy: 0.68,
        targetEnergy: 0.95,
        eventDurationMinutes: 90,
        peakTimeMinutes: 60,
        allowJumps: false
      },
      'Tamil / Kuthu': {
        profile: 'Tamil / Kuthu',
        startEnergy: 0.70,
        targetEnergy: 0.96,
        eventDurationMinutes: 120,
        peakTimeMinutes: 80,
        allowJumps: false
      },
      'Tamil/Kuthu': {
        profile: 'Tamil / Kuthu',
        startEnergy: 0.70,
        targetEnergy: 0.96,
        eventDurationMinutes: 120,
        peakTimeMinutes: 80,
        allowJumps: false
      },
      'Chill': {
        profile: 'Chill',
        startEnergy: 0.35,
        targetEnergy: 0.52,
        eventDurationMinutes: 90,
        peakTimeMinutes: 45,
        allowJumps: false
      },
      'Romantic': {
        profile: 'Romantic',
        startEnergy: 0.30,
        targetEnergy: 0.55,
        eventDurationMinutes: 60,
        peakTimeMinutes: 35,
        allowJumps: false
      },
      'Custom': {
        profile: 'Custom',
        startEnergy: 0.50,
        targetEnergy: 0.85,
        eventDurationMinutes: 60,
        peakTimeMinutes: 40,
        allowJumps: false
      }
    };
  }

  /**
   * Smooth S-curve (Hermite smoothstep) interpolation.
   */
  private static smoothStep(t: number): number {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  /**
   * Calculate instantaneous target energy along the planned curve.
   * Smoothly builds to peak at peakTimeMinutes, then sustains with gentle encore plateau.
   */
  public static getTargetEnergyAtElapsed(config: EnergyConfig, elapsedMinutes: number): number {
    const duration = Math.max(1, config.eventDurationMinutes);
    const peakTime = Math.max(1, Math.min(duration, config.peakTimeMinutes));
    const t = Math.max(0, Math.min(duration, elapsedMinutes));

    const start = Math.max(0, Math.min(1, config.startEnergy));
    const peak = Math.max(0, Math.min(1, config.targetEnergy));

    if (t <= peakTime) {
      // Build-up Phase: Smooth S-Curve ramp from start to peak
      const ratio = t / peakTime;
      const progress = this.smoothStep(ratio);
      return parseFloat((start + (peak - start) * progress).toFixed(3));
    } else {
      // Post-Peak Phase: Gentle plateau / encore taper
      const postRatio = (t - peakTime) / Math.max(1, duration - peakTime);
      const postProgress = this.smoothStep(postRatio);
      const endEnergy = Math.max(start, peak - 0.10);
      return parseFloat((peak - (peak - endEnergy) * postProgress).toFixed(3));
    }
  }

  /**
   * Generate discretized points for SVG/Canvas energy curve rendering.
   */
  public static generateCurve(config: EnergyConfig, numPoints = 25): EnergyCurvePoint[] {
    const duration = Math.max(1, config.eventDurationMinutes);
    const points: EnergyCurvePoint[] = [];

    for (let i = 0; i < numPoints; i++) {
      const minute = (i / (numPoints - 1)) * duration;
      const targetEnergy = this.getTargetEnergyAtElapsed(config, minute);
      const level = this.getEnergyLevel(targetEnergy);

      let phaseName = 'Build-Up';
      if (minute < duration * 0.15) phaseName = 'Warm-Up';
      else if (Math.abs(minute - config.peakTimeMinutes) <= duration * 0.08) phaseName = 'Peak Time';
      else if (minute > config.peakTimeMinutes) phaseName = 'Climax / Cool-Down';

      points.push({
        minute: Math.round(minute),
        progressPercent: Math.round((minute / duration) * 100),
        targetEnergy,
        level,
        phaseName
      });
    }

    return points;
  }

  /**
   * Score a candidate track's energy alignment and penalize sudden inappropriate jumps.
   */
  public static scoreCandidateEnergy(
    candidateEnergy: number,
    currentEnergy: number,
    targetCurveEnergy: number,
    allowJumps = false
  ): {
    score: number;
    jumpPenalty: number;
    deltaFromTarget: number;
    deltaFromCurrent: number;
    isAppropriate: boolean;
  } {
    const cand = Math.max(0, Math.min(1, candidateEnergy));
    const cur = Math.max(0, Math.min(1, currentEnergy));
    const target = Math.max(0, Math.min(1, targetCurveEnergy));

    const deltaFromTarget = Math.abs(cand - target);
    const deltaFromCurrent = Math.abs(cand - cur);

    // Sudden jump penalty: if transition energy shifts by more than 0.20 abruptly
    let jumpPenalty = 0.0;
    if (!allowJumps && deltaFromCurrent > 0.20) {
      jumpPenalty = (deltaFromCurrent - 0.20) * 1.5;
    }

    // Proximity to instantaneous curve target (0.0 to 1.0)
    const rawProximity = Math.max(0.0, 1.0 - deltaFromTarget * 2.2);
    const finalScore = Math.max(0.0, Math.min(1.0, rawProximity - jumpPenalty));

    return {
      score: parseFloat(finalScore.toFixed(3)),
      jumpPenalty: parseFloat(jumpPenalty.toFixed(3)),
      deltaFromTarget: parseFloat(deltaFromTarget.toFixed(3)),
      deltaFromCurrent: parseFloat(deltaFromCurrent.toFixed(3)),
      isAppropriate: jumpPenalty === 0
    };
  }

  /**
   * Test with a playlist: Simulates planning an optimal track sequence across the planned energy curve.
   */
  public static simulatePlaylistEnergyPlan(
    playlist: Track[],
    config: EnergyConfig
  ): PlaylistSimulationResult {
    if (!playlist || playlist.length === 0) {
      return {
        plannedSequence: [],
        averageEnergyDelta: 0,
        maxEnergyJump: 0,
        smoothnessScorePercent: 100,
        summary: 'Playlist is empty. Add tracks to simulate energy progression.'
      };
    }

    const duration = config.eventDurationMinutes;
    const remainingPool = [...playlist];
    const plannedSequence: PlaylistEnergySimulationItem[] = [];

    let currentMinute = 0;
    let currentEnergy = config.startEnergy;
    let maxJump = 0;
    let totalDelta = 0;

    // Estimate track duration or default to 3.5 minutes
    const stepDuration = Math.max(1, duration / Math.max(1, playlist.length));

    while (remainingPool.length > 0) {
      const curveTarget = this.getTargetEnergyAtElapsed(config, currentMinute);

      // Score each candidate in the remaining pool against the curve
      let bestIndex = 0;
      let bestScore = -999;

      for (let i = 0; i < remainingPool.length; i++) {
        const cand = remainingPool[i];
        const candEnergy = cand.energy ?? 0.75;
        const { score } = this.scoreCandidateEnergy(
          candEnergy,
          currentEnergy,
          curveTarget,
          config.allowJumps
        );

        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      const chosenTrack = remainingPool.splice(bestIndex, 1)[0];
      const actualEnergy = chosenTrack.energy ?? 0.75;
      const jump = parseFloat(Math.abs(actualEnergy - currentEnergy).toFixed(3));
      const delta = parseFloat(Math.abs(actualEnergy - curveTarget).toFixed(3));

      if (plannedSequence.length > 0 && jump > maxJump) {
        maxJump = jump;
      }
      totalDelta += delta;

      plannedSequence.push({
        track: chosenTrack,
        minuteTimestamp: Math.round(currentMinute),
        actualEnergy: parseFloat(actualEnergy.toFixed(2)),
        curveTargetEnergy: curveTarget,
        energyLevel: this.getEnergyLevel(actualEnergy),
        deltaFromTarget: parseFloat(delta.toFixed(2)),
        isSmoothTransition: jump <= 0.20 || config.allowJumps
      });

      currentEnergy = actualEnergy;
      currentMinute += stepDuration;
    }

    const avgDelta = plannedSequence.length > 0 ? totalDelta / plannedSequence.length : 0;
    const smoothness = Math.max(0, Math.round((1.0 - Math.min(1.0, maxJump * 1.5)) * 100));

    return {
      plannedSequence,
      averageEnergyDelta: parseFloat(avgDelta.toFixed(3)),
      maxEnergyJump: parseFloat(maxJump.toFixed(3)),
      smoothnessScorePercent: smoothness,
      summary: `Planned ${plannedSequence.length} tracks across ${config.eventDurationMinutes}m curve. Peak at ${config.peakTimeMinutes}m. Max energy delta: ${Math.round(maxJump * 100)}%. Smoothness score: ${smoothness}%.`
    };
  }
}
