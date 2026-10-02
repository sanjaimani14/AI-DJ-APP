// AI DJ - Real-Time Two-Deck Mixing Engine (Phase 5)
// Built on Web Audio API + HTMLMediaElement streaming
// Implements independent Left and Right deck audio paths, master limiter,
// 3-band EQ, resonant DJ bi-directional filter, channel pre-gain & fader,
// pitch-preserving time stretching, BPM/phase synchronization,
// anti-click soft start/stop gates, smooth parameter ramping,
// and automatic deterministic transitions.

import { DeckEQ } from './eq';
import { DeckFilter } from './filter';
import {
  TransitionEngine,
  type TransitionConfig,
  type TransitionType,
  type TransitionBars,
  type TransitionTelemetry
} from './transitions';

export interface AudioTrackMetadata {
  id: string;
  filename: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  format: string; // MP3, WAV, FLAC, M4A, AAC
  fileLocation: string;
  url: string; // Blob object URL or audio path
  bpm?: number | null;
  introTime?: number;
  file?: File;
}

export type CrossfaderCurve = 'smooth' | 'linear' | 'cut';

export class DeckAudioChannel {
  public id: 'A' | 'B';
  public audioElement: HTMLAudioElement;
  public sourceNode: MediaElementAudioSourceNode | null = null;

  // DSP Node Chain
  public preGainNode: GainNode;       // Channel Pre-fader Gain (0.0 to 2.0)
  public eq: DeckEQ;                  // 3-Band Biquad EQ (Low, Mid, High)
  public filter: DeckFilter;          // Resonant DJ Filter (LPF <-> Neutral <-> HPF)
  public softGateNode: GainNode;      // Anti-click / soft start-stop gate
  public volumeGainNode: GainNode;    // Channel Volume Fader (0.0 to 1.0)
  public crossfadeGainNode: GainNode; // Crossfader attenuation
  public analyserNode: AnalyserNode;  // RMS & Peak level metering

  public currentTrack: AudioTrackMetadata | null = null;
  public isKeyLocked = true;
  public isSynced = false;
  public playbackRate = 1.0;

  private audioCtx: AudioContext;
  private isSourceCreated = false;
  private currentVolume = 0.85;
  private currentGain = 1.0;

  constructor(id: 'A' | 'B', audioCtx: AudioContext, masterInput: AudioNode) {
    this.id = id;
    this.audioCtx = audioCtx;

    // 1. Audio Element with native pitch-preserving time-stretching (Key Lock)
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.crossOrigin = 'anonymous';

    // Enable pitch preservation for time stretching
    this.setKeyLock(true);

    // 2. Pre-Fader Channel Gain (0.0 to 2.0, default 1.0)
    this.preGainNode = audioCtx.createGain();
    this.preGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

    // 3. 3-Band Equalizer (LowShelf, Peaking, HighShelf)
    this.eq = new DeckEQ(audioCtx);

    // 4. Resonant DJ Bi-Directional Filter (-1.0 LPF to +1.0 HPF)
    this.filter = new DeckFilter(audioCtx);

    // 5. Anti-click Soft Gate (25ms micro-ramping on play/stop/pause)
    this.softGateNode = audioCtx.createGain();
    this.softGateNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

    // 6. Post-EQ Channel Volume Fader (0.0 to 1.0)
    this.volumeGainNode = audioCtx.createGain();
    this.volumeGainNode.gain.setValueAtTime(0.85, audioCtx.currentTime);

    // 7. Crossfader Channel Gain
    this.crossfadeGainNode = audioCtx.createGain();
    this.crossfadeGainNode.gain.setValueAtTime(id === 'A' ? 1.0 : 0.0, audioCtx.currentTime);

    // 8. Analyser for Real-Time VU Metering
    this.analyserNode = audioCtx.createAnalyser();
    this.analyserNode.fftSize = 64;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect DSP Chain:
    // sourceNode -> preGainNode -> eq.inputNode -> eq.outputNode -> filter.inputNode -> filter.outputNode -> softGateNode -> volumeGainNode -> crossfadeGainNode -> analyserNode -> masterInput
    this.preGainNode.connect(this.eq.inputNode);
    this.eq.outputNode.connect(this.filter.inputNode);
    this.filter.outputNode.connect(this.softGateNode);
    this.softGateNode.connect(this.volumeGainNode);
    this.volumeGainNode.connect(this.crossfadeGainNode);
    this.crossfadeGainNode.connect(this.analyserNode);
    this.analyserNode.connect(masterInput);
  }

  public initSourceNode(): void {
    if (!this.isSourceCreated) {
      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.preGainNode);
        this.isSourceCreated = true;
      } catch (err) {
        console.warn(`Deck ${this.id} source node already connected or audio context issue:`, err);
      }
    }
  }

  public async loadTrack(track: AudioTrackMetadata): Promise<void> {
    this.currentTrack = track;
    this.audioElement.src = track.url;
    this.audioElement.load();
    this.initSourceNode();

    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        this.audioElement.removeEventListener('loadedmetadata', onLoaded);
        this.audioElement.removeEventListener('error', onError);
        clearTimeout(timeoutId);
      };

      const onLoaded = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (this.audioElement.duration && !isNaN(this.audioElement.duration)) {
          track.duration = this.audioElement.duration;
        }
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        const errDetails = this.audioElement.error
          ? `MediaError code ${this.audioElement.error.code}: ${this.audioElement.error.message || 'Decode/Network failure'}`
          : 'Unknown media load error';
        reject(new Error(`Failed to decode track "${track.title}": ${errDetails}`));
      };

      // 4000ms failsafe timeout for missing/unreachable files
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Timeout loading track "${track.title}" after 4000ms`));
      }, 4000);

      this.audioElement.addEventListener('loadedmetadata', onLoaded);
      this.audioElement.addEventListener('error', onError);
    });
  }

  /**
   * Click/Pop-Free Play: micro-ramps gain up over 25ms.
   */
  public async play(): Promise<void> {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    this.initSourceNode();

    const t = this.audioCtx.currentTime;
    // Set soft gate to near-zero and ramp up smoothly to 1.0
    this.softGateNode.gain.cancelScheduledValues(t);
    this.softGateNode.gain.setValueAtTime(0.001, t);
    this.softGateNode.gain.exponentialRampToValueAtTime(1.0, t + 0.025);

    await this.audioElement.play();
  }

  /**
   * Click/Pop-Free Pause: micro-ramps gain down to 0 over 25ms before pausing.
   */
  public pause(): void {
    const t = this.audioCtx.currentTime;
    this.softGateNode.gain.cancelScheduledValues(t);
    this.softGateNode.gain.setValueAtTime(Math.max(0.001, this.softGateNode.gain.value), t);
    this.softGateNode.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    setTimeout(() => {
      this.audioElement.pause();
      this.softGateNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }, 28);
  }

  /**
   * Click/Pop-Free Stop: micro-ramps down, pauses, and resets position to 0.
   */
  public stop(): void {
    const t = this.audioCtx.currentTime;
    this.softGateNode.gain.cancelScheduledValues(t);
    this.softGateNode.gain.setValueAtTime(Math.max(0.001, this.softGateNode.gain.value), t);
    this.softGateNode.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    setTimeout(() => {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.softGateNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }, 28);
  }

  /**
   * Pop-free seek: quick micro-fade down -> reposition -> quick micro-fade up.
   */
  public seek(seconds: number): void {
    if (!this.audioElement.duration || isNaN(this.audioElement.duration)) return;
    const target = Math.max(0, Math.min(this.audioElement.duration, seconds));

    if (!this.audioElement.paused) {
      const t = this.audioCtx.currentTime;
      this.softGateNode.gain.cancelScheduledValues(t);
      this.softGateNode.gain.setValueAtTime(1.0, t);
      this.softGateNode.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

      setTimeout(() => {
        this.audioElement.currentTime = target;
        const t2 = this.audioCtx.currentTime;
        this.softGateNode.gain.setValueAtTime(0.001, t2);
        this.softGateNode.gain.exponentialRampToValueAtTime(1.0, t2 + 0.015);
      }, 16);
    } else {
      this.audioElement.currentTime = target;
    }
  }

  /**
   * Channel Pre-Fader Gain (0.0 to 2.0).
   * Parameter smoothed (15ms).
   */
  public setGain(gain: number): void {
    const clamped = Math.max(0, Math.min(2.0, gain));
    this.currentGain = clamped;
    this.preGainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.015);
  }

  public getGain(): number {
    return this.currentGain;
  }

  /**
   * Channel Post-EQ Volume Fader (0.0 to 1.0).
   * Parameter smoothed (15ms).
   */
  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1.0, vol));
    this.currentVolume = clamped;
    this.volumeGainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.015);
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  /**
   * 3-Band EQ Control.
   */
  public setEQ(band: 'low' | 'mid' | 'high', gainDb: number): void {
    this.eq.setBand(band, gainDb);
  }

  public resetEQ(): void {
    this.eq.reset();
  }

  /**
   * Resonant DJ Filter Control (-1.0 LPF to +1.0 HPF).
   */
  public setFilter(val: number): void {
    this.filter.setFilter(val);
  }

  public resetFilter(): void {
    this.filter.reset();
  }

  /**
   * Tempo / Playback Rate Adjustment (0.5x to 2.0x).
   */
  public setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    this.playbackRate = clamped;
    this.audioElement.playbackRate = clamped;
  }

  /**
   * Key Lock: Pitch-preserving time stretching.
   * Uses HTML5 preservesPitch (supported in modern Chromium, Gecko, WebKit).
   */
  public setKeyLock(locked: boolean): void {
    this.isKeyLocked = locked;
    const el = this.audioElement as HTMLAudioElement & {
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    el.preservesPitch = locked;
    el.mozPreservesPitch = locked;
    el.webkitPreservesPitch = locked;
  }

  /**
   * Calculate real-time RMS audio level (0.0 to 1.0).
   */
  public getLevel(): number {
    if (this.audioElement.paused || this.audioElement.ended) {
      return 0;
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = (data[i] - 128) / 128;
      sum += norm * norm;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1.0, rms * 3.5);
  }
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public audioCtx: AudioContext;

  // Master DSP Bus
  public masterSumGain: GainNode;
  public masterLimiter: DynamicsCompressorNode;
  public masterGain: GainNode;
  public masterAnalyser: AnalyserNode;

  // Decks
  public deckA: DeckAudioChannel;
  public deckB: DeckAudioChannel;

  // Transitions Engine
  public transitionEngine: TransitionEngine;

  private crossfaderPosition = 0; // -1 (Deck A) to +1 (Deck B)
  private crossfaderCurve: CrossfaderCurve = 'smooth';
  private masterVolume = 0.85;

  private constructor() {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // 1. Master Summing Node
    this.masterSumGain = this.audioCtx.createGain();
    this.masterSumGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

    // 2. Master Brickwall Limiter to reduce digital clipping risk
    this.masterLimiter = this.audioCtx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.audioCtx.currentTime); // -1 dBFS threshold
    this.masterLimiter.knee.setValueAtTime(3.0, this.audioCtx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, this.audioCtx.currentTime); // 20:1 hard limiting
    this.masterLimiter.attack.setValueAtTime(0.003, this.audioCtx.currentTime); // 3ms fast transient clamp
    this.masterLimiter.release.setValueAtTime(0.08, this.audioCtx.currentTime); // 80ms recovery

    // 3. Master Output Gain Node
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);

    // 4. Master Analyser Node
    this.masterAnalyser = this.audioCtx.createAnalyser();
    this.masterAnalyser.fftSize = 64;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    // Route: masterSumGain -> masterLimiter -> masterGain -> masterAnalyser -> destination
    this.masterSumGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.audioCtx.destination);

    // Create Left (A) and Right (B) Deck Channels
    this.deckA = new DeckAudioChannel('A', this.audioCtx, this.masterSumGain);
    this.deckB = new DeckAudioChannel('B', this.audioCtx, this.masterSumGain);

    // Initialize Transition Engine with mixer interface
    this.transitionEngine = new TransitionEngine({
      setCrossfader: (pos) => this.setCrossfader(pos),
      getCrossfader: () => this.crossfaderPosition,
      currentTime: () => this.audioCtx.currentTime,
      syncDecks: (slaveId, masterId) => this.syncDecks(slaveId, masterId),
      deckA: {
        id: 'A',
        play: () => this.deckA.play(),
        pause: () => this.deckA.pause(),
        seek: (s) => this.deckA.seek(s),
        setVolume: (v) => this.deckA.setVolume(v),
        setGain: (g) => this.deckA.setGain(g),
        setEQ: (band, v) => this.deckA.setEQ(band, v),
        setFilter: (f) => this.deckA.setFilter(f),
        setPlaybackRate: (r) => this.deckA.setPlaybackRate(r),
        getCurrentTime: () => this.deckA.audioElement.currentTime,
        getDuration: () => this.deckA.audioElement.duration || 0,
        isPlaying: () => !this.deckA.audioElement.paused && !this.deckA.audioElement.ended,
        getTrackTitle: () => this.deckA.currentTrack?.title || 'Deck A Track',
        getOriginalBpm: () => this.deckA.currentTrack?.bpm || 128,
        getPlaybackRate: () => this.deckA.playbackRate
      },
      deckB: {
        id: 'B',
        play: () => this.deckB.play(),
        pause: () => this.deckB.pause(),
        seek: (s) => this.deckB.seek(s),
        setVolume: (v) => this.deckB.setVolume(v),
        setGain: (g) => this.deckB.setGain(g),
        setEQ: (band, v) => this.deckB.setEQ(band, v),
        setFilter: (f) => this.deckB.setFilter(f),
        setPlaybackRate: (r) => this.deckB.setPlaybackRate(r),
        getCurrentTime: () => this.deckB.audioElement.currentTime,
        getDuration: () => this.deckB.audioElement.duration || 0,
        isPlaying: () => !this.deckB.audioElement.paused && !this.deckB.audioElement.ended,
        getTrackTitle: () => this.deckB.currentTrack?.title || 'Deck B Track',
        getOriginalBpm: () => this.deckB.currentTrack?.bpm || 120,
        getPlaybackRate: () => this.deckB.playbackRate
      }
    });

    this.updateCrossfaderRouting();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async ensureRunning(): Promise<void> {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /**
   * Safe Master Volume (0.0 to 1.0) with anti-click smoothing & limiter protection.
   */
  public setMasterVolume(vol: number): void {
    if (isNaN(vol) || !isFinite(vol)) {
      console.warn('AudioEngine: Received invalid non-finite master volume, falling back to 0.85');
      vol = 0.85;
    }
    const clamped = Math.max(0, Math.min(1.0, vol));
    this.masterVolume = clamped;
    const t = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setTargetAtTime(clamped, t, 0.015);
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Crossfader Position (-1.0 to +1.0) with selectable curve.
   */
  public setCrossfader(position: number, curve: CrossfaderCurve = this.crossfaderCurve): void {
    this.crossfaderPosition = Math.max(-1.0, Math.min(1.0, position));
    this.crossfaderCurve = curve;
    this.updateCrossfaderRouting();
  }

  public getCrossfader(): number {
    return this.crossfaderPosition;
  }

  private updateCrossfaderRouting(): void {
    const pos = this.crossfaderPosition; // -1 to +1
    let gainA = 1.0;
    let gainB = 1.0;

    if (this.crossfaderCurve === 'linear') {
      // Linear crossfade: constant sum (gainA + gainB = 1.0)
      gainA = (1 - pos) / 2;
      gainB = (1 + pos) / 2;
    } else if (this.crossfaderCurve === 'cut') {
      // Scratch / Sharp Cut curve
      gainA = pos > 0.85 ? (1 - pos) / 0.15 : 1.0;
      gainB = pos < -0.85 ? (pos + 1) / 0.15 : 1.0;
    } else {
      // Smooth Equal-Power crossfade curve (constant acoustic power sum of squares = 1.0)
      // pos: -1 -> angle: 0 (A=1, B=0)
      // pos:  0 -> angle: PI/4 (A=0.707, B=0.707)
      // pos: +1 -> angle: PI/2 (A=0, B=1)
      const angle = ((pos + 1) / 2) * (Math.PI / 2);
      gainA = Math.cos(angle);
      gainB = Math.sin(angle);
    }

    const t = this.audioCtx.currentTime;
    this.deckA.crossfadeGainNode.gain.setTargetAtTime(gainA, t, 0.015);
    this.deckB.crossfadeGainNode.gain.setTargetAtTime(gainB, t, 0.015);
  }

  /**
   * Synchronize slave deck to master deck (BPM tempo match and beat phase lock).
   * @param slaveId 'A' | 'B'
   * @param masterId 'A' | 'B'
   */
  public syncDecks(slaveId: 'A' | 'B', masterId: 'A' | 'B'): { targetRate: number; phaseDiffBeats: number } {
    const slave = slaveId === 'A' ? this.deckA : this.deckB;
    const master = masterId === 'A' ? this.deckA : this.deckB;

    const masterBpm = (master.currentTrack?.bpm || 128) * master.playbackRate;
    const slaveOrigBpm = slave.currentTrack?.bpm || 128;

    // 1. Calculate required tempo adjustment
    const targetRate = Math.max(0.5, Math.min(2.0, masterBpm / slaveOrigBpm));
    slave.setPlaybackRate(targetRate);

    // 2. Accurate synchronized playback: Beat Phase Alignment
    const beatIntervalMaster = 60.0 / masterBpm;
    const masterCurrentTime = master.audioElement.currentTime;
    const masterIntro = master.currentTrack?.introTime || 0;
    const elapsedBeatsMaster = (masterCurrentTime - masterIntro) / beatIntervalMaster;
    const phaseMaster = ((elapsedBeatsMaster % 1) + 1) % 1; // 0.0 to 1.0

    const beatIntervalSlave = 60.0 / (slaveOrigBpm * targetRate);
    const slaveCurrentTime = slave.audioElement.currentTime;
    const slaveIntro = slave.currentTrack?.introTime || 0;
    const elapsedBeatsSlave = (slaveCurrentTime - slaveIntro) / beatIntervalSlave;
    const phaseSlave = ((elapsedBeatsSlave % 1) + 1) % 1;

    let phaseDiff = phaseMaster - phaseSlave;
    if (phaseDiff > 0.5) phaseDiff -= 1.0;
    if (phaseDiff < -0.5) phaseDiff += 1.0;

    // If slave is playing and phase offset is noticeable (> 0.05 beats), align playhead
    if (!slave.audioElement.paused && Math.abs(phaseDiff) > 0.05) {
      const timeAdjustment = phaseDiff * beatIntervalSlave;
      const newTime = Math.max(0, slave.audioElement.currentTime + timeAdjustment);
      slave.seek(newTime);
    }

    slave.isSynced = true;
    return { targetRate, phaseDiffBeats: phaseDiff };
  }

  /**
   * Start an automatic deterministic transition between decks (Phase 6).
   * @param type 'smooth_crossfade' | 'beat_mix' | 'eq_bass_swap' | 'filter_transition' | 'echo_out'
   * @param fromDeck Outgoing deck
   * @param toDeck Incoming deck
   * @param bars Beat bars: 4 | 8 | 16 | 32
   * @param onProgress Real-time telemetry callback
   * @param onComplete Completion callback
   * @param onFallback Fallback triggered callback
   */
  public async startTransition(
    type: TransitionType,
    fromDeck: 'A' | 'B',
    toDeck: 'A' | 'B',
    bars: TransitionBars = 16,
    onProgress?: (telemetry: TransitionTelemetry) => void,
    onComplete?: () => void,
    onFallback?: (reason: string) => void
  ): Promise<void> {
    const fromChannel = fromDeck === 'A' ? this.deckA : this.deckB;
    const toChannel = toDeck === 'A' ? this.deckA : this.deckB;
    const masterBpm = (fromChannel.currentTrack?.bpm || 128) * fromChannel.playbackRate;
    const targetBpm = (toChannel.currentTrack?.bpm || 128) * toChannel.playbackRate;

    const config: TransitionConfig = {
      fromDeck,
      toDeck,
      type,
      bars,
      masterBpm,
      targetBpm,
      onProgress,
      onComplete,
      onFallback
    };
    await this.transitionEngine.startTransition(config);
  }

  /**
   * Cancel an in-progress transition safely.
   */
  public cancelTransition(): void {
    this.transitionEngine.cancelTransition();
  }

  /**
   * Master stereo VU level metering (0.0 to 1.0).
   */
  public getMasterLevel(): number {
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = (data[i] - 128) / 128;
      sum += norm * norm;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1.0, rms * 3.5);
  }
}
