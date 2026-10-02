export type TransitionType = 
  | 'smooth_crossfade'
  | 'beat_match'
  | 'eq_bass_swap'
  | 'filter_transition'
  | 'echo_out';

export type EventProfile = 
  | 'Chill'
  | 'Party'
  | 'High Energy'
  | 'EDM'
  | 'Tamil / Kuthu'
  | 'Tamil/Kuthu'
  | 'Romantic'
  | 'Custom';

export type DJMode = 'autonomous' | 'assist' | 'manual';

export interface BeatMarker {
  time: number;
  isDownbeat: boolean;
  bar: number;
  beat: number; // 1, 2, 3, 4
}

export interface BeatGridData {
  bpm: number;
  beatInterval: number;
  firstBeat: number;
  downbeatPhase: number;
  totalBeats: number;
  beats: BeatMarker[];
}

export interface WaveformData {
  overview: number[]; // 800 normalized amplitude points for full-track scrub display
  low?: number[];     // Bass band (20 - 250 Hz)
  mid?: number[];     // Mid band (250 - 2500 Hz)
  high?: number[];    // High band (2500 - 16000 Hz)
  fps?: number;       // Frames per second of audio
  duration?: number;
}

export interface Track {
  id: string;
  filename: string;
  title: string;
  artist: string;
  duration: number; // in seconds (null or 0 if unavailable)
  format: string; // MP3, WAV, FLAC, M4A, AAC
  fileLocation: string;
  url: string; // audio playback url
  file?: File;
  bpm: number | null; // calculated BPM or null if unavailable
  tempoConfidence?: number | null;
  key: string; // e.g., "8A", "9B", or "--" if unavailable
  musicalKeyName: string; // e.g., "A Minor", "G Major", or "Unavailable"
  keyConfidence?: number | null;
  energy: number | null; // 0.0 to 1.0 or null if unavailable
  genre: string;
  filePath: string;
  status: 'analyzed' | 'analyzing' | 'unprocessed' | 'failed' | 'unavailable';
  errorMessage?: string | null;
  introTime: number; // seconds
  outroTime: number; // seconds
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  loudness: number | null; // LUFS
  beatPositions?: number[];
  beatConfidence?: number | null;
  waveformPeaks?: number[]; // normalized 0..1 peak heights
  waveform?: WaveformData;
  beatGrid?: BeatGridData;
  cached?: boolean;
}

export interface DeckState {
  id: 'A' | 'B';
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // 1.0 = normal
  pitchPercent: number; // -8% to +8%
  bpm: number;
  keyShift: number; // semitones
  currentKey: string;
  isSynced: boolean;
  isKeyLocked: boolean;
  loopActive: boolean;
  loopLength: number; // in beats: 0.25, 0.5, 1, 2, 4, 8, 16, 32
  cuePoint: number;
  hotCues: (number | null)[]; // 8 hot cue positions
  volume: number; // 0.0 to 1.0
  gain: number; // 0.0 to 2.0
  eqHigh: number; // -26 to +6 dB
  eqMid: number;
  eqLow: number;
  filter: number; // -1.0 (LPF) to 0 (neutral) to +1.0 (HPF)
  vuMeterLeft: number; // 0 to 1
  vuMeterRight: number;
  platterRotation: number; // degrees
  slipMode: boolean;
  vinylMode: boolean;
}

export interface AIDecision {
  state: 'analyzing' | 'tracking' | 'transition_planned' | 'transitioning' | 'idle';
  statusMessage: string;
  nextTrack: Track | null;
  targetBpm: number;
  targetEnergy: number;
  currentEnergy: number;
  transitionType: TransitionType;
  transitionBarsRemaining: number;
  transitionProgress: number; // 0.0 to 1.0
  recommendedAction: string;
  confidenceScore: number;
}
