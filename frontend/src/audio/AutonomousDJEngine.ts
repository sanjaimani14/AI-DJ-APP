/**
 * frontend/src/audio/AutonomousDJEngine.ts - Autonomous AI DJ Mode (Phase 8)
 * Connects:
 *   Music Library -> Audio Analysis -> AI DJ Planner -> Transition Engine -> Audio Engine
 *
 * Implements a continuous, non-blocking autonomous state machine:
 *   IDLE -> PLAYING -> PREPARING_NEXT -> TRANSITIONING -> PLAYING_NEXT -> PREPARING_NEXT -> ...
 *
 * Guarantees:
 * 1. Zero audience-perceived silence.
 * 2. Background preparation well ahead of transition points (no AI/network latency blocks audio).
 * 3. Safe fallback to equal-power crossfade if advanced transitions fail.
 * 4. Automatic candidate skipping if track loading fails.
 * 5. Runs indefinitely until explicitly stopped.
 */

import { AudioEngine } from './AudioEngine';
import { AIPlannerService, type StructuredAIDecision } from '../services/aiPlannerService';
import { EnergyManager, type EnergyConfig } from '../services/energyManager';
import { SafetyLogger } from '../services/safetyLogger';
import { HealthWatchdogService } from '../services/healthWatchdog';
import type { Track, EventProfile } from '../types/dj';
import type { TransitionBars, TransitionTelemetry } from './transitions';

export type AutonomousState =
  | 'IDLE'
  | 'PLAYING'
  | 'PREPARING_NEXT'
  | 'TRANSITIONING'
  | 'PLAYING_NEXT';

export interface AutonomousTelemetry {
  state: AutonomousState;
  statusMessage: string;
  activeDeck: 'A' | 'B';
  standbyDeck: 'A' | 'B';
  activeTrack: Track | null;
  preparedTrack: Track | null;
  decision: StructuredAIDecision | null;
  secondsUntilTransition: number;
  barsUntilTransition: number;
  transitionProgress: number;
  isAutonomousActive: boolean;
  totalAutonomousMixes: number;
}

export type AutonomousListener = (telemetry: AutonomousTelemetry) => void;

export class AutonomousDJEngine {
  private static instance: AutonomousDJEngine | null = null;

  private state: AutonomousState = 'IDLE';
  private statusMessage = 'Autonomous AI DJ Standby • Ready to mix';
  private isAutonomousActive = false;

  private activeDeck: 'A' | 'B' = 'A';
  private standbyDeck: 'A' | 'B' = 'B';

  private library: Track[] = [];
  private eventProfile: EventProfile = 'Party';
  private energyConfig: EnergyConfig = EnergyManager.getProfilePresets()['Party'];
  private eventStartTime: number = Date.now();

  private currentDecision: StructuredAIDecision | null = null;
  private preparedTrack: Track | null = null;
  private secondsUntilTransition = 0;
  private barsUntilTransition = 0;
  private transitionProgress = 0;
  private totalAutonomousMixes = 0;

  private monitorIntervalId: number | null = null;
  private listeners: Set<AutonomousListener> = new Set();
  private isPreparing = false;
  private transitionScheduledTime = 0;

  public onTrackLoaded?: (deckId: 'A' | 'B', track: Track) => void;
  public onCrossfaderSettled?: (position: number) => void;

  private constructor() {
    const watchdog = HealthWatchdogService.getInstance();
    watchdog.onDeckStallDetected = (stalledDeck) => {
      if (this.isAutonomousActive && stalledDeck === this.activeDeck) {
        SafetyLogger.log(
          'DECK_RECOVERY',
          'CRITICAL_RECOVERY',
          `Watchdog detected playback freeze on active deck ${stalledDeck}`,
          'Executing emergency deck recovery: triggering immediate transition to standby deck'
        );
        SafetyLogger.recordSessionEvent(
          'DECK_RECOVERED',
          `Recovered from stall on deck ${stalledDeck}`,
          stalledDeck
        );
        this.forceTransition();
      }
    };
    watchdog.start();
  }

  public static getInstance(): AutonomousDJEngine {
    if (!AutonomousDJEngine.instance) {
      AutonomousDJEngine.instance = new AutonomousDJEngine();
    }
    return AutonomousDJEngine.instance;
  }

  public subscribe(listener: AutonomousListener): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const telemetry = this.getTelemetry();
    for (const listener of this.listeners) {
      try {
        listener(telemetry);
      } catch (err) {
        console.error('Error in AutonomousDJ listener:', err);
      }
    }
  }

  public getTelemetry(): AutonomousTelemetry {
    const engine = AudioEngine.getInstance();
    const activeChan = this.activeDeck === 'A' ? engine.deckA : engine.deckB;
    const activeTrack = activeChan.currentTrack ? (this.library.find((t) => t.id === activeChan.currentTrack?.id) || null) : null;

    return {
      state: this.state,
      statusMessage: this.statusMessage,
      activeDeck: this.activeDeck,
      standbyDeck: this.standbyDeck,
      activeTrack,
      preparedTrack: this.preparedTrack,
      decision: this.currentDecision,
      secondsUntilTransition: Math.max(0, parseFloat(this.secondsUntilTransition.toFixed(1))),
      barsUntilTransition: Math.max(0, this.barsUntilTransition),
      transitionProgress: this.transitionProgress,
      isAutonomousActive: this.isAutonomousActive,
      totalAutonomousMixes: this.totalAutonomousMixes
    };
  }

  public setLibrary(tracks: Track[]): void {
    this.library = tracks;
  }

  public setEventProfile(profile: EventProfile): void {
    this.eventProfile = profile;
    const presets = EnergyManager.getProfilePresets();
    if (presets[profile]) {
      this.energyConfig = { ...presets[profile] };
    }
    // If we are currently waiting to transition, recalculate the plan with the new vibe
    if (this.isAutonomousActive && this.state === 'PREPARING_NEXT') {
      this.prepareNextTrack().catch(console.error);
    }
  }

  public setEnergyConfig(config: EnergyConfig): void {
    this.energyConfig = { ...config };
    this.eventProfile = config.profile;
    if (this.isAutonomousActive && this.state === 'PREPARING_NEXT') {
      this.prepareNextTrack().catch(console.error);
    }
  }

  public getEnergyConfig(): EnergyConfig {
    return this.energyConfig;
  }

  /**
   * Start Autonomous AI DJ mode.
   * If music is not currently playing, starts Deck A with the best library track.
   */
  public async start(): Promise<void> {
    if (this.isAutonomousActive) return;

    this.isAutonomousActive = true;
    const engine = AudioEngine.getInstance();

    // Determine currently active deck based on crossfader and playback
    const currentXfader = engine.getCrossfader();
    if (currentXfader > 0.1) {
      this.activeDeck = 'B';
      this.standbyDeck = 'A';
    } else {
      this.activeDeck = 'A';
      this.standbyDeck = 'B';
    }

    const activeChan = this.activeDeck === 'A' ? engine.deckA : engine.deckB;

    // If active deck is not playing, start playing immediately
    if (activeChan.audioElement.paused || activeChan.audioElement.ended || !activeChan.currentTrack) {
      if (!activeChan.currentTrack && this.library.length > 0) {
        const firstTrack = this.library[0];
        await activeChan.loadTrack({
          id: firstTrack.id,
          filename: firstTrack.filename,
          title: firstTrack.title,
          artist: firstTrack.artist,
          duration: firstTrack.duration,
          format: firstTrack.format,
          fileLocation: firstTrack.fileLocation,
          url: firstTrack.url
        });
        this.onTrackLoaded?.(this.activeDeck, firstTrack);
      }
      engine.setCrossfader(this.activeDeck === 'A' ? -1.0 : 1.0, 'smooth');
      await activeChan.play();
    }

    this.setState('PLAYING', `Autonomous AI DJ Online • Active on Deck ${this.activeDeck}`);

    // Start background monitor loop
    this.startPlaybackMonitor();

    // Trigger preparation of next track ahead of time
    await this.prepareNextTrack();
  }

  /**
   * Stop Autonomous AI DJ mode safely without cutting audio.
   */
  public stop(): void {
    this.isAutonomousActive = false;
    this.stopPlaybackMonitor();
    this.setState('IDLE', 'Autonomous AI DJ Standby • Manual DJ control active');
  }

  /**
   * Force AI to initiate the planned transition immediately.
   */
  public async forceTransition(): Promise<void> {
    if (!this.isAutonomousActive) {
      await this.start();
    }
    if (this.state === 'TRANSITIONING') return;

    if (!this.preparedTrack || !this.currentDecision) {
      await this.prepareNextTrack();
    }
    await this.executeTransition();
  }

  private setState(state: AutonomousState, message: string): void {
    this.state = state;
    this.statusMessage = message;
    this.notify();
  }

  /**
   * Step 1 & 2: Choose next track and load into standby deck.
   * Step 3: Analyze compatibility.
   * Step 4: Calculate transition point.
   * Step 5: Synchronize BPM.
   * Step 6: Select transition type.
   */
  private async prepareNextTrack(): Promise<void> {
    if (!this.isAutonomousActive || this.isPreparing || this.library.length === 0) return;
    this.isPreparing = true;

    this.setState('PREPARING_NEXT', `AI Planner evaluating library for Deck ${this.standbyDeck}...`);

    const engine = AudioEngine.getInstance();
    const activeChan = this.activeDeck === 'A' ? engine.deckA : engine.deckB;
    const standbyChan = this.standbyDeck === 'A' ? engine.deckA : engine.deckB;

    const currentTrackObj = activeChan.currentTrack
      ? (this.library.find((t) => t.id === activeChan.currentTrack?.id) || {
          id: activeChan.currentTrack.id,
          title: activeChan.currentTrack.title,
          artist: activeChan.currentTrack.artist,
          bpm: activeChan.currentTrack.bpm || 128,
          duration: activeChan.currentTrack.duration || 180,
          key: '8A',
          genre: 'General',
          energy: 0.85,
          introTime: 4.0,
          outroTime: 165.0,
          filename: activeChan.currentTrack.filename,
          format: activeChan.currentTrack.format,
          fileLocation: activeChan.currentTrack.fileLocation,
          url: activeChan.currentTrack.url,
          filePath: '',
          status: 'analyzed',
          loudness: -8
        } as Track)
      : this.library[0];

    // Exclude current track and search candidates
    let candidatePool = this.library.filter((t) => t.id !== currentTrackObj.id);
    if (candidatePool.length === 0) candidatePool = this.library;

    let loadedSuccessfully = false;
    let chosenTrack: Track | null = null;
    let decision: StructuredAIDecision | null = null;

    // Try candidates in order of compatibility score until one loads successfully
    // (Prevents silence if a candidate file is corrupt/unreachable)
    const elapsedMinutes = Math.max(0, (Date.now() - this.eventStartTime) / 60000);
    const currentTargetEnergy = EnergyManager.getTargetEnergyAtElapsed(this.energyConfig, elapsedMinutes);

    while (candidatePool.length > 0 && !loadedSuccessfully) {
      try {
        decision = AIPlannerService.planNextTrack(
          currentTrackObj,
          candidatePool,
          this.eventProfile,
          this.activeDeck,
          currentTargetEnergy,
          this.energyConfig.allowJumps
        );

        chosenTrack = decision.next_track_details || candidatePool[0];

        // Attempt loading candidate into standby deck
        await standbyChan.loadTrack({
          id: chosenTrack.id,
          filename: chosenTrack.filename,
          title: chosenTrack.title,
          artist: chosenTrack.artist,
          duration: chosenTrack.duration,
          format: chosenTrack.format,
          fileLocation: chosenTrack.fileLocation,
          url: chosenTrack.url
        });

        this.onTrackLoaded?.(this.standbyDeck, chosenTrack);
        loadedSuccessfully = true;
      } catch (loadErr) {
        SafetyLogger.log(
          'DECODER',
          'ERROR',
          `Track load/decode failed for "${chosenTrack?.title || 'Unknown'}": ${String(loadErr)}`,
          'Auto-skipping broken track and selecting next library candidate'
        );
        SafetyLogger.recordSessionEvent(
          'TRACK_RECOVERED',
          `Skipped unplayable track "${chosenTrack?.title || 'Unknown'}", auto-recovered with next candidate`,
          this.standbyDeck,
          chosenTrack?.title
        );
        console.warn(`Autonomous DJ: Track load failed for "${chosenTrack?.title}", skipping to next candidate:`, loadErr);
        // Remove failed track from pool and retry
        candidatePool = candidatePool.filter((t) => t.id !== chosenTrack?.id);
      }
    }

    if (!loadedSuccessfully || !chosenTrack || !decision) {
      // Deterministic emergency fallback
      decision = AIPlannerService.getFallbackDecision(currentTrackObj, this.activeDeck);
      chosenTrack = this.library[0];
      try {
        await standbyChan.loadTrack({
          id: chosenTrack.id,
          filename: chosenTrack.filename,
          title: chosenTrack.title,
          artist: chosenTrack.artist,
          duration: chosenTrack.duration,
          format: chosenTrack.format,
          fileLocation: chosenTrack.fileLocation,
          url: chosenTrack.url
        });
        this.onTrackLoaded?.(this.standbyDeck, chosenTrack);
      } catch (fallbackErr) {
        console.error('Autonomous DJ: Fallback load error:', fallbackErr);
      }
    }

    this.currentDecision = decision;
    this.preparedTrack = chosenTrack;

    // Step 5: Synchronize BPM & Phase
    try {
      engine.syncDecks(this.standbyDeck, this.activeDeck);
    } catch (syncErr) {
      console.warn('Autonomous DJ: BPM sync warning:', syncErr);
    }

    // Step 4: Calculate precise transition trigger point
    const curDur = activeChan.audioElement.duration || currentTrackObj.duration || 180.0;
    const curBpm = (currentTrackObj.bpm || 128.0) * activeChan.playbackRate;
    const transitionDurationSec = decision.transition_bars * 4 * (60.0 / curBpm);

    // Set transition point at outro or at (duration - transitionDuration)
    const outroTime = currentTrackObj.outroTime || (curDur - 10.0);
    this.transitionScheduledTime = Math.max(10.0, outroTime - transitionDurationSec);

    // If track is very short, adapt threshold to leave at least 5 seconds before track end
    if (this.transitionScheduledTime >= curDur - 2.0) {
      this.transitionScheduledTime = Math.max(5.0, curDur - transitionDurationSec - 2.0);
    }

    this.isPreparing = false;
    this.setState(
      'PLAYING',
      `Next Ready: "${chosenTrack.title}" on Deck ${this.standbyDeck} • ${decision.transition_bars}-Bar ${decision.transition_type.toUpperCase().replace('_', ' ')}`
    );
  }

  /**
   * Continuous Playback Monitor (Step 8):
   * Monitors active track playhead, calculates bars/seconds remaining,
   * and triggers the transition automatically at the planned trigger point.
   */
  private startPlaybackMonitor(): void {
    if (this.monitorIntervalId !== null) return;

    this.monitorIntervalId = window.setInterval(() => {
      if (!this.isAutonomousActive) return;

      const engine = AudioEngine.getInstance();
      const activeChan = this.activeDeck === 'A' ? engine.deckA : engine.deckB;
      const el = activeChan.audioElement;

      // If active deck ended unexpectedly or audio stalled, trigger transition immediately
      if (el.ended || (el.currentTime > 0 && el.duration > 0 && el.currentTime >= el.duration - 0.5)) {
        if (this.state !== 'TRANSITIONING') {
          console.warn('Autonomous DJ: Track nearing end, triggering immediate transition');
          this.executeTransition().catch(console.error);
        }
        return;
      }

      if (this.state === 'TRANSITIONING') return;

      const currentTime = el.currentTime;
      const duration = el.duration || 180;
      const remainingSec = Math.max(0, Math.min(duration - currentTime, this.transitionScheduledTime - currentTime));

      const curBpm = (activeChan.currentTrack?.bpm || 128) * activeChan.playbackRate;
      const beatSec = 60.0 / curBpm;
      const barSec = beatSec * 4;
      const remainingBars = Math.ceil(remainingSec / barSec);

      this.secondsUntilTransition = remainingSec;
      this.barsUntilTransition = remainingBars;

      // Update telemetry
      this.notify();

      // Step 7: When playhead reaches the transition trigger point, execute!
      if (currentTime >= this.transitionScheduledTime && currentTime > 5.0) {
        this.executeTransition().catch(console.error);
      }
    }, 150);
  }

  private stopPlaybackMonitor(): void {
    if (this.monitorIntervalId !== null) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }

  /**
   * Step 7: Execute Transition.
   * Runs the transition engine with deterministic fallback to equal-power crossfade if needed.
   */
  private async executeTransition(): Promise<void> {
    if (this.state === 'TRANSITIONING' || !this.isAutonomousActive) return;

    const engine = AudioEngine.getInstance();
    const fromDeck = this.activeDeck;
    const toDeck = this.standbyDeck;
    const decision = this.currentDecision;

    const transitionType = decision ? decision.transition_type : 'smooth_crossfade';
    const transitionBars = (decision ? decision.transition_bars : 16) as TransitionBars;

    this.setState(
      'TRANSITIONING',
      `Auto-Transitioning: Deck ${fromDeck} ➔ Deck ${toDeck} (${transitionBars} Bars: ${transitionType.toUpperCase().replace('_', ' ')})`
    );

    try {
      await engine.startTransition(
        transitionType,
        fromDeck,
        toDeck,
        transitionBars,
        (telemetry: TransitionTelemetry) => {
          this.transitionProgress = telemetry.progress;
          this.statusMessage = telemetry.stepText;
          this.notify();
        },
        () => {
          this.onTransitionComplete();
        },
        (fallbackReason: string) => {
          SafetyLogger.log(
            'TRANSITION',
            'WARN',
            `Advanced transition fallback activated: ${fallbackReason}`,
            'Standard equal-power crossfade armed'
          );
          SafetyLogger.recordSessionEvent(
            'SAFE_FALLBACK_TRIGGERED',
            `Transition fallback: ${fallbackReason}`,
            toDeck
          );
          console.warn('Autonomous DJ: Transition fallback activated:', fallbackReason);
          this.statusMessage = `Safe Fallback: ${fallbackReason} → Equal-Power Crossfade`;
          this.notify();
        }
      );
    } catch (transitionErr) {
      SafetyLogger.log(
        'TRANSITION',
        'CRITICAL_RECOVERY',
        `Transition exception: ${String(transitionErr)}`,
        'Instantly swapped crossfader to standby deck to preserve zero silence'
      );
      console.error('Autonomous DJ: Transition error, falling back to instant crossfade:', transitionErr);
      // Emergency fail-safe: guarantee audio continuity
      engine.setCrossfader(toDeck === 'A' ? -1.0 : 1.0, 'smooth');
      this.onTransitionComplete();
    }
  }

  /**
   * Steps 9 & 10: Transition completed -> PLAYING_NEXT -> Select following track -> Loop indefinitely.
   */
  private onTransitionComplete(): void {
    if (!this.isAutonomousActive) return;

    this.totalAutonomousMixes += 1;
    this.transitionProgress = 1.0;

    // Record previously played track in history
    const engine = AudioEngine.getInstance();
    const outgoingChan = this.activeDeck === 'A' ? engine.deckA : engine.deckB;
    if (outgoingChan.currentTrack) {
      AIPlannerService.recordPlayed(outgoingChan.currentTrack.id, outgoingChan.currentTrack.artist);
    }

    // Swap active and standby decks
    const prevActive = this.activeDeck;
    this.activeDeck = this.standbyDeck;
    this.standbyDeck = prevActive;
    this.onCrossfaderSettled?.(this.activeDeck === 'A' ? -1.0 : 1.0);

    const newActiveChan = this.activeDeck === 'A' ? engine.deckA : engine.deckB;
    const title = newActiveChan.currentTrack?.title || `Deck ${this.activeDeck}`;

    this.setState('PLAYING_NEXT', `Now Playing: "${title}" on Deck ${this.activeDeck} • Mix #${this.totalAutonomousMixes} Complete`);

    // Prepare next track after a brief 1.5s phrase settlement window
    setTimeout(() => {
      if (this.isAutonomousActive) {
        this.prepareNextTrack().catch(console.error);
      }
    }, 1500);
  }
}
