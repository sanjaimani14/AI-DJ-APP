// AI DJ - 3-Band Equalizer Node Module (Phase 5)
// Implements LowShelf (250Hz), Peaking (1000Hz), HighShelf (3500Hz) with smooth anti-click parameter automation.

export interface EQState {
  low: number;  // -26 dB to +6 dB
  mid: number;  // -26 dB to +6 dB
  high: number; // -26 dB to +6 dB
}

export class DeckEQ {
  public lowNode: BiquadFilterNode;
  public midNode: BiquadFilterNode;
  public highNode: BiquadFilterNode;
  public inputNode: AudioNode;
  public outputNode: AudioNode;

  private audioCtx: AudioContext;
  private currentLow = 0;
  private currentMid = 0;
  private currentHigh = 0;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;

    // 1. Low Shelf: 250 Hz cutoff (Bass / Kick / Sub)
    this.lowNode = audioCtx.createBiquadFilter();
    this.lowNode.type = 'lowshelf';
    this.lowNode.frequency.setValueAtTime(250, audioCtx.currentTime);
    this.lowNode.gain.setValueAtTime(0, audioCtx.currentTime);

    // 2. Mid Peaking: 1000 Hz center frequency, Q = 1.0 (Vocals / Leads / Snares)
    this.midNode = audioCtx.createBiquadFilter();
    this.midNode.type = 'peaking';
    this.midNode.frequency.setValueAtTime(1000, audioCtx.currentTime);
    this.midNode.Q.setValueAtTime(1.0, audioCtx.currentTime);
    this.midNode.gain.setValueAtTime(0, audioCtx.currentTime);

    // 3. High Shelf: 3500 Hz cutoff (Hi-Hats / Cymbals / Air)
    this.highNode = audioCtx.createBiquadFilter();
    this.highNode.type = 'highshelf';
    this.highNode.frequency.setValueAtTime(3500, audioCtx.currentTime);
    this.highNode.gain.setValueAtTime(0, audioCtx.currentTime);

    // Cascade connection: Input -> Low -> Mid -> High -> Output
    this.lowNode.connect(this.midNode);
    this.midNode.connect(this.highNode);

    this.inputNode = this.lowNode;
    this.outputNode = this.highNode;
  }

  /**
   * Set Low EQ band gain (-26 dB to +6 dB) with anti-click smoothing (15ms time constant).
   */
  public setLow(gainDb: number): void {
    const clamped = Math.max(-26, Math.min(6, gainDb));
    this.currentLow = clamped;
    const t = this.audioCtx.currentTime;
    this.lowNode.gain.setTargetAtTime(clamped, t, 0.015);
  }

  /**
   * Set Mid EQ band gain (-26 dB to +6 dB) with anti-click smoothing (15ms time constant).
   */
  public setMid(gainDb: number): void {
    const clamped = Math.max(-26, Math.min(6, gainDb));
    this.currentMid = clamped;
    const t = this.audioCtx.currentTime;
    this.midNode.gain.setTargetAtTime(clamped, t, 0.015);
  }

  /**
   * Set High EQ band gain (-26 dB to +6 dB) with anti-click smoothing (15ms time constant).
   */
  public setHigh(gainDb: number): void {
    const clamped = Math.max(-26, Math.min(6, gainDb));
    this.currentHigh = clamped;
    const t = this.audioCtx.currentTime;
    this.highNode.gain.setTargetAtTime(clamped, t, 0.015);
  }

  /**
   * Unified setter for any EQ band.
   */
  public setBand(band: 'low' | 'mid' | 'high', gainDb: number): void {
    if (band === 'low') this.setLow(gainDb);
    else if (band === 'mid') this.setMid(gainDb);
    else if (band === 'high') this.setHigh(gainDb);
  }

  /**
   * Reset all EQ bands to neutral (0 dB flat).
   */
  public reset(): void {
    this.setLow(0);
    this.setMid(0);
    this.setHigh(0);
  }

  public getState(): EQState {
    return {
      low: this.currentLow,
      mid: this.currentMid,
      high: this.currentHigh
    };
  }
}
