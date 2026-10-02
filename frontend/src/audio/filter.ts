// AI DJ - Bi-Directional Resonant DJ Filter Module (Phase 5)
// -1.0 = Full Low-Pass Filter (cutoff down to 80 Hz)
//  0.0 = Neutral / Flat Bypass (20 Hz HPF + 20,000 Hz LPF)
// +1.0 = Full High-Pass Filter (cutoff up to 10,000 Hz)
// Employs parameter smoothing and tuned Q resonance to emulate DJM/Xone club mixer filters.

export class DeckFilter {
  public lowPassNode: BiquadFilterNode;
  public highPassNode: BiquadFilterNode;
  public inputNode: AudioNode;
  public outputNode: AudioNode;

  private audioCtx: AudioContext;
  private currentFilterValue = 0; // -1 to +1

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;

    // 1. High-Pass Filter: when neutral, wide open at 20 Hz
    this.highPassNode = audioCtx.createBiquadFilter();
    this.highPassNode.type = 'highpass';
    this.highPassNode.frequency.setValueAtTime(20, audioCtx.currentTime);
    this.highPassNode.Q.setValueAtTime(0.707, audioCtx.currentTime);

    // 2. Low-Pass Filter: when neutral, wide open at 20,000 Hz
    this.lowPassNode = audioCtx.createBiquadFilter();
    this.lowPassNode.type = 'lowpass';
    this.lowPassNode.frequency.setValueAtTime(20000, audioCtx.currentTime);
    this.lowPassNode.Q.setValueAtTime(0.707, audioCtx.currentTime);

    // Cascade: Input -> HighPass -> LowPass -> Output
    this.highPassNode.connect(this.lowPassNode);

    this.inputNode = this.highPassNode;
    this.outputNode = this.lowPassNode;
  }

  /**
   * Set filter value from -1.0 (Low-Pass) to 0.0 (Neutral) to +1.0 (High-Pass).
   * Parameter smoothing (15ms time constant) prevents zipper noise and pops.
   */
  public setFilter(val: number): void {
    const clamped = Math.max(-1.0, Math.min(1.0, val));
    this.currentFilterValue = clamped;
    const t = this.audioCtx.currentTime;
    const smoothTime = 0.015;

    if (clamped < 0) {
      // Low-Pass mode:
      // High-pass filter stays fully open at 20 Hz
      this.highPassNode.frequency.setTargetAtTime(20, t, smoothTime);
      this.highPassNode.Q.setTargetAtTime(0.707, t, smoothTime);

      // Low-pass filter sweeps down exponentially from 20000 Hz to 80 Hz
      const depth = Math.abs(clamped); // 0 to 1
      const targetFreq = 20000 * Math.pow(80 / 20000, depth);
      const targetQ = 0.707 + depth * 1.5; // Mild resonance peak for club sweep feel

      this.lowPassNode.frequency.setTargetAtTime(targetFreq, t, smoothTime);
      this.lowPassNode.Q.setTargetAtTime(targetQ, t, smoothTime);
    } else if (clamped > 0) {
      // High-Pass mode:
      // Low-pass filter stays fully open at 20,000 Hz
      this.lowPassNode.frequency.setTargetAtTime(20000, t, smoothTime);
      this.lowPassNode.Q.setTargetAtTime(0.707, t, smoothTime);

      // High-pass filter sweeps up exponentially from 20 Hz to 10,000 Hz
      const depth = clamped; // 0 to 1
      const targetFreq = 20 * Math.pow(10000 / 20, depth);
      const targetQ = 0.707 + depth * 1.5; // Mild resonance peak

      this.highPassNode.frequency.setTargetAtTime(targetFreq, t, smoothTime);
      this.highPassNode.Q.setTargetAtTime(targetQ, t, smoothTime);
    } else {
      // Neutral (0.0): completely flat / wide open bypass
      this.highPassNode.frequency.setTargetAtTime(20, t, smoothTime);
      this.highPassNode.Q.setTargetAtTime(0.707, t, smoothTime);
      this.lowPassNode.frequency.setTargetAtTime(20000, t, smoothTime);
      this.lowPassNode.Q.setTargetAtTime(0.707, t, smoothTime);
    }
  }

  public reset(): void {
    this.setFilter(0);
  }

  public getValue(): number {
    return this.currentFilterValue;
  }
}
