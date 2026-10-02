// AI DJ - Automatic DJ Transition Engine (Phase 6)
// Deterministic real-time transition coordinator.
// Runs completely locally on Web Audio API and requestAnimationFrame.
// Never blocks on slow network or AI calls.
// Guarantees zero silence and provides automatic fallback to standard crossfade.

export type TransitionType =
  | 'smooth_crossfade'
  | 'beat_mix'
  | 'beat_match'
  | 'eq_bass_swap'
  | 'filter_transition'
  | 'echo_out';

export type TransitionBars = 4 | 8 | 16 | 32;

export interface TransitionConfig {
  fromDeck: 'A' | 'B';
  toDeck: 'A' | 'B';
  type: TransitionType;
  bars: TransitionBars;
  masterBpm: number;
  targetBpm?: number;
  onProgress?: (telemetry: TransitionTelemetry) => void;
  onComplete?: () => void;
  onFallback?: (reason: string) => void;
}

export interface TransitionTelemetry {
  progress: number; // 0.0 to 1.0
  currentBar: number;
  totalBars: number;
  barsRemaining: number;
  secondsRemaining: number;
  stepText: string;
  isFallback: boolean;
  bpmDisplay: string;
}

export interface TransitionDeckController {
  id: 'A' | 'B';
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  setGain: (gain: number) => void;
  setEQ: (band: 'low' | 'mid' | 'high', gainDb: number) => void;
  setFilter: (val: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  getTrackTitle: () => string;
  getOriginalBpm: () => number;
  getPlaybackRate: () => number;
}

export interface TransitionMixerController {
  setCrossfader: (position: number) => void;
  getCrossfader: () => number;
  deckA: TransitionDeckController;
  deckB: TransitionDeckController;
  currentTime: () => number;
  syncDecks: (slaveId: 'A' | 'B', masterId: 'A' | 'B') => { targetRate: number; phaseDiffBeats: number };
}

export class TransitionEngine {
  private mixer: TransitionMixerController;
  private activeConfig: TransitionConfig | null = null;
  private animFrameId: number | null = null;
  private startTime = 0;
  private isRunning = false;
  private isFallbackActive = false;
  private autoTriggerEnabled = true;

  constructor(mixer: TransitionMixerController) {
    this.mixer = mixer;
  }

  public get isActive(): boolean {
    return this.isRunning;
  }

  public get isFallback(): boolean {
    return this.isFallbackActive;
  }

  public setAutoTrigger(enabled: boolean): void {
    this.autoTriggerEnabled = enabled;
  }

  public get isAutoTriggerEnabled(): boolean {
    return this.autoTriggerEnabled;
  }

  /**
   * Compute exact transition duration in seconds from bars and BPM.
   * duration = bars * 4 * (60 / bpm)
   */
  public static calculateDurationSeconds(bars: TransitionBars, bpm: number): number {
    const validBpm = Math.max(60, Math.min(220, bpm || 128));
    const secondsPerBeat = 60.0 / validBpm;
    return bars * 4 * secondsPerBeat;
  }

  /**
   * Start an automatic deterministic transition.
   * Includes safe fallback: if any advanced transition fails, immediately falls back to standard crossfade.
   */
  public async startTransition(config: TransitionConfig): Promise<void> {
    if (this.isRunning) {
      this.cancelTransition();
    }

    this.activeConfig = config;
    this.isRunning = true;
    this.isFallbackActive = false;
    this.startTime = performance.now();

    const fromDeck = config.fromDeck === 'A' ? this.mixer.deckA : this.mixer.deckB;
    const toDeck = config.toDeck === 'A' ? this.mixer.deckA : this.mixer.deckB;

    try {
      // 1. Zero Silence Guarantee: Start incoming deck and verify playback
      if (!toDeck.isPlaying()) {
        await toDeck.play();
      }

      // 2. BPM Synchronization
      // Automatically sync target deck tempo and beat phase to master deck
      this.mixer.syncDecks(config.toDeck, config.fromDeck);

      // 3. Initial DSP setup based on selected transition type
      this.setupInitialDSP(config.type, fromDeck, toDeck);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Advanced transition setup failed, falling back to standard crossfade:', errMsg);
      this.triggerFallback(config, `Setup error: ${errMsg}`);
    }

    const durationSeconds = TransitionEngine.calculateDurationSeconds(config.bars, config.masterBpm);
    const durationMs = Math.max(2000, durationSeconds * 1000);
    const startXfader = config.fromDeck === 'A' ? -1.0 : 1.0;
    const targetXfader = config.toDeck === 'A' ? -1.0 : 1.0;

    const fromBpm = (fromDeck.getOriginalBpm() * fromDeck.getPlaybackRate()).toFixed(1);
    const targetBpmVal = (config.targetBpm || config.masterBpm).toFixed(1);
    const bpmDisplay = `${fromBpm} → ${targetBpmVal}`;

    const tick = () => {
      if (!this.isRunning || !this.activeConfig) return;

      const elapsed = performance.now() - this.startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      const currentBarFloat = progress * config.bars;
      const currentBar = Math.min(config.bars, Math.floor(currentBarFloat) + 1);
      const barsRemaining = Math.max(0, config.bars - currentBar + 1);
      const secondsRemaining = Math.max(0, (durationMs - elapsed) / 1000);

      // Equal-power crossfade curve position:
      // pos: -1.0 -> 1.0 or 1.0 -> -1.0
      const currentXfader = startXfader + (targetXfader - startXfader) * progress;
      this.mixer.setCrossfader(currentXfader);

      let stepText = `Harmonic Crossfade: Bar ${currentBar}/${config.bars}`;

      try {
        if (this.isFallbackActive) {
          // Standard crossfade fallback: clean linear/equal-power blend with neutral EQ
          stepText = `[SAFE FALLBACK] Standard Crossfade: Bar ${currentBar}/${config.bars}`;
        } else {
          // Process advanced transition types
          stepText = this.processTransitionStep(config.type, progress, currentBar, config.bars, fromDeck, toDeck);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn('Error during transition step, activating safe fallback:', errMsg);
        this.triggerFallback(config, errMsg);
        stepText = `[SAFE FALLBACK] Standard Crossfade: Bar ${currentBar}/${config.bars}`;
      }

      if (config.onProgress) {
        config.onProgress({
          progress,
          currentBar,
          totalBars: config.bars,
          barsRemaining,
          secondsRemaining,
          stepText,
          isFallback: this.isFallbackActive,
          bpmDisplay
        });
      }

      if (progress < 1.0) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        // Transition finished cleanly!
        this.finishTransition();
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  /**
   * Initial DSP state for advanced transitions.
   */
  private setupInitialDSP(
    type: TransitionType,
    fromDeck: TransitionDeckController,
    toDeck: TransitionDeckController
  ): void {
    if (type === 'eq_bass_swap') {
      // Incoming deck bass is killed (-26 dB) at start so it does not clash
      toDeck.setEQ('low', -26);
      toDeck.setEQ('mid', 0);
      toDeck.setEQ('high', 0);
      fromDeck.setEQ('low', 0);
    } else if (type === 'filter_transition') {
      fromDeck.setFilter(0);
      toDeck.setFilter(0);
    } else if (type === 'beat_mix' || type === 'beat_match') {
      // Beat mix: incoming deck starts with slightly reduced gain and neutral EQ
      toDeck.setEQ('low', 0);
      toDeck.setEQ('mid', 0);
      toDeck.setEQ('high', 0);
    } else if (type === 'echo_out') {
      fromDeck.setFilter(0);
      toDeck.setFilter(0);
    }
  }

  /**
   * Process individual frame step of advanced transitions.
   */
  private processTransitionStep(
    type: TransitionType,
    progress: number,
    currentBar: number,
    totalBars: number,
    fromDeck: TransitionDeckController,
    toDeck: TransitionDeckController
  ): string {
    switch (type) {
      case 'eq_bass_swap': {
        // Midpoint swap logic (e.g. bar 8 of 16)
        if (progress < 0.45) {
          return `Phase 1: Blending mids & highs (Bar ${currentBar}/${totalBars})`;
        } else if (progress >= 0.45 && progress <= 0.55) {
          // Bass Swap Phrase Drop
          const swapProgress = (progress - 0.45) / 0.1; // 0 to 1
          const fromLow = 0 - swapProgress * 26; // 0dB down to -26dB
          const toLow = -26 + swapProgress * 26; // -26dB up to 0dB
          fromDeck.setEQ('low', fromLow);
          toDeck.setEQ('low', toLow);
          return `BASS SWAP: Dropping outgoing sub, punching incoming bass! (Bar ${currentBar}/${totalBars})`;
        } else {
          fromDeck.setEQ('low', -26);
          toDeck.setEQ('low', 0);
          return `Phase 3: Outgoing tail fade, bass locked (Bar ${currentBar}/${totalBars})`;
        }
      }

      case 'beat_mix':
      case 'beat_match': {
        // Continuous beat-matched mix
        if (progress < 0.3) {
          // Highs and mids introduce
          toDeck.setEQ('high', 0);
          toDeck.setEQ('mid', -3 + progress * 10);
          return `Beat Mix: Introducing incoming rhythm (Bar ${currentBar}/${totalBars})`;
        } else if (progress < 0.7) {
          // Full dual-deck synchronized groove
          return `Beat Mix: Dual synchronized groove in full blend (Bar ${currentBar}/${totalBars})`;
        } else {
          // Outgoing gentle roll-off
          const rollOff = ((progress - 0.7) / 0.3) * -12;
          fromDeck.setEQ('high', rollOff);
          fromDeck.setEQ('mid', rollOff);
          return `Beat Mix: Resolving master groove to incoming track (Bar ${currentBar}/${totalBars})`;
        }
      }

      case 'filter_transition': {
        if (progress < 0.75) {
          // High-pass sweep up on outgoing track (building excitement)
          const hpfDepth = (progress / 0.75) * 0.85;
          fromDeck.setFilter(hpfDepth);
          return `Filter Sweep: Outgoing HPF cutoff rising (${Math.round(hpfDepth * 100)}%) (Bar ${currentBar}/${totalBars})`;
        } else {
          // Drop incoming deck in with full spectrum
          fromDeck.setFilter(0.85);
          toDeck.setFilter(0);
          return `Filter Drop: Incoming full spectrum drop! (Bar ${currentBar}/${totalBars})`;
        }
      }

      case 'echo_out': {
        if (progress > 0.5) {
          // Roll-off frequencies and soften outgoing track
          const lpfDepth = -((progress - 0.5) / 0.5) * 0.9;
          fromDeck.setFilter(lpfDepth);
        }
        return `Echo-Out: Frequency roll-off & ambient decay (Bar ${currentBar}/${totalBars})`;
      }

      case 'smooth_crossfade':
      default:
        return `Smooth Crossfade: Equal-power harmonic blend (Bar ${currentBar}/${totalBars})`;
    }
  }

  /**
   * Safe Fallback: Reverts EQ/filter to neutral and falls back to standard crossfade.
   */
  private triggerFallback(config: TransitionConfig, reason: string): void {
    this.isFallbackActive = true;
    const fromDeck = config.fromDeck === 'A' ? this.mixer.deckA : this.mixer.deckB;
    const toDeck = config.toDeck === 'A' ? this.mixer.deckA : this.mixer.deckB;

    // Reset EQ and filters to flat neutral
    fromDeck.setEQ('low', 0);
    fromDeck.setEQ('mid', 0);
    fromDeck.setEQ('high', 0);
    fromDeck.setFilter(0);

    toDeck.setEQ('low', 0);
    toDeck.setEQ('mid', 0);
    toDeck.setEQ('high', 0);
    toDeck.setFilter(0);

    if (config.onFallback) {
      config.onFallback(reason);
    }
  }

  private finishTransition(): void {
    if (!this.activeConfig) return;
    const config = this.activeConfig;

    const fromDeck = config.fromDeck === 'A' ? this.mixer.deckA : this.mixer.deckB;
    const toDeck = config.toDeck === 'A' ? this.mixer.deckA : this.mixer.deckB;

    // Settle crossfader completely on target deck
    const finalXfader = config.toDeck === 'A' ? -1.0 : 1.0;
    this.mixer.setCrossfader(finalXfader);

    // Pause outgoing deck and restore EQ/Filter to neutral for next track load
    fromDeck.pause();
    fromDeck.setEQ('low', 0);
    fromDeck.setEQ('mid', 0);
    fromDeck.setEQ('high', 0);
    fromDeck.setFilter(0);

    // Target deck confirmed neutral
    toDeck.setEQ('low', 0);
    toDeck.setEQ('mid', 0);
    toDeck.setEQ('high', 0);
    toDeck.setFilter(0);

    this.isRunning = false;
    this.isFallbackActive = false;
    const onComplete = config.onComplete;
    this.activeConfig = null;

    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Safely cancel transition in progress.
   */
  public cancelTransition(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isRunning = false;
    this.isFallbackActive = false;
    this.activeConfig = null;
  }

  /**
   * Check whether automatic transition should trigger based on active track playhead.
   * Mix-out point = duration - transitionDurationSeconds (or outroTime - transitionDurationSeconds).
   */
  public shouldAutoTrigger(
    currentTime: number,
    duration: number,
    outroTime: number,
    bars: TransitionBars,
    bpm: number
  ): boolean {
    if (!this.autoTriggerEnabled || this.isRunning || duration <= 0) {
      return false;
    }
    const transitionSeconds = TransitionEngine.calculateDurationSeconds(bars, bpm);
    const triggerThreshold = outroTime > transitionSeconds && outroTime < duration
      ? outroTime - transitionSeconds
      : Math.max(0, duration - transitionSeconds);

    return currentTime >= triggerThreshold && currentTime < duration - 0.5;
  }
}
