import React, { useState, useEffect, useRef } from 'react';
import type { DeckState, Track, DJMode, EventProfile } from './types/dj';
import type { TransitionType, TransitionBars, TransitionTelemetry } from './audio/transitions';
import { INITIAL_TRACKS } from './utils/mockData';
import { AudioEngine } from './audio/AudioEngine';
import { AutonomousDJEngine } from './audio/AutonomousDJEngine';
import type { AutonomousTelemetry } from './audio/AutonomousDJEngine';
import { AIPlannerService } from './services/aiPlannerService';
import type { StructuredAIDecision } from './services/aiPlannerService';
import { TopBar } from './components/TopBar';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { AIPanel } from './components/AIPanel';
import { AutoTransitionPanel } from './components/AutoTransitionPanel';
import { BottomSection } from './components/BottomSection';
import { LiveEventPanel } from './components/LiveEventPanel';
import { AnalysisProgressModal } from './components/AnalysisProgressModal';
import { AnalysisService } from './services/analysisService';
import { WaveformDisplay } from './components/WaveformDisplay';
import { EnergyManagerPanel } from './components/EnergyManagerPanel';
import { EnergyManager, type EnergyConfig } from './services/energyManager';
import { LiveEventOverlay } from './components/LiveEventOverlay';
import { EventSetupModal, type EventSetupData } from './components/EventSetupModal';
import { LiveAutonomousConfirmationModal } from './components/LiveAutonomousConfirmationModal';
import { EventSessionLogModal } from './components/EventSessionLogModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { SafetyLogger } from './services/safetyLogger';
import { HealthWatchdogService } from './services/healthWatchdog';

export function App() {
  // Library tracks state
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);

  // Audio Engine Singleton Reference
  const engineRef = useRef<AudioEngine | null>(null);

  // Current Event Info
  const [eventName, setEventName] = useState<string>('Saturday Night Live Set');
  const [isLive] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [tracksPlayed, setTracksPlayed] = useState<number>(0);
  const [outputDevice, setOutputDevice] = useState<string>('Default - Speakers (Realtek(R) Audio)');
  const [aiHealth] = useState<string>('Audio Engine: Active • Online');

  // Phase 10: Event Setup & Live Event Interface State
  const [eventSetupData, setEventSetupData] = useState<EventSetupData>({
    eventName: 'Saturday Night Live Set',
    eventType: 'Club / Nightclub Headline',
    musicStyle: 'Party',
    durationMinutes: 120,
    targetEnergy: 0.88,
    musicFolder: 'g:/DJ APP/library/tracks',
    outputDevice: 'Default - Speakers (Realtek(R) Audio)'
  });
  const [isLiveEventView, setIsLiveEventView] = useState<boolean>(false);
  const [isEventSetupOpen, setIsEventSetupOpen] = useState<boolean>(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);
  const [isSessionLogOpen, setIsSessionLogOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Deck A State
  const [deckA, setDeckA] = useState<DeckState>({
    id: 'A',
    track: INITIAL_TRACKS[0], // Club Beat 128BPM
    isPlaying: false,
    currentTime: 0,
    duration: INITIAL_TRACKS[0].duration,
    playbackRate: 1.0,
    pitchPercent: 0.0,
    bpm: INITIAL_TRACKS[0].bpm || 128,
    keyShift: 0,
    currentKey: INITIAL_TRACKS[0].key,
    isSynced: false,
    isKeyLocked: true,
    loopActive: false,
    loopLength: 4,
    cuePoint: 0,
    hotCues: [0, 4.0, 8.0, 16.0, null, null, null, null],
    volume: 0.85,
    gain: 1.0,
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    filter: 0,
    vuMeterLeft: 0,
    vuMeterRight: 0,
    platterRotation: 0,
    slipMode: false,
    vinylMode: true,
  });

  // Deck B State
  const [deckB, setDeckB] = useState<DeckState>({
    id: 'B',
    track: INITIAL_TRACKS[1], // Harmonic Synths 120BPM
    isPlaying: false,
    currentTime: 0,
    duration: INITIAL_TRACKS[1].duration,
    playbackRate: 1.0,
    pitchPercent: 0.0,
    bpm: INITIAL_TRACKS[1].bpm || 120,
    keyShift: 0,
    currentKey: INITIAL_TRACKS[1].key,
    isSynced: false,
    isKeyLocked: true,
    loopActive: false,
    loopLength: 4,
    cuePoint: 0,
    hotCues: [0, 4.0, 8.0, 16.0, null, null, null, null],
    volume: 0.85,
    gain: 1.0,
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    filter: 0,
    vuMeterLeft: 0,
    vuMeterRight: 0,
    platterRotation: 0,
    slipMode: false,
    vinylMode: true,
  });

  // Mixer State
  const [crossfader, setCrossfader] = useState<number>(0.0); // 0.0 = center / equal power
  const [crossfaderCurve, setCrossfaderCurve] = useState<'smooth' | 'linear' | 'cut'>('smooth');
  const [masterVolume, setMasterVolume] = useState<number>(0.85);

  // AI Panel State
  const [aiMode, setAiMode] = useState<DJMode>('autonomous');
  const [aiStatus, setAiStatus] = useState<string>('Audio Engine: Phase 5 Real-Time DSP Active');
  const [transitionStatus, setTransitionStatus] = useState<string>('Dual Decks Ready for Manual & Automatic DSP Mixing');
  const [transitionProgress, setTransitionProgress] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Phase 6 Transition Engine State
  const [selectedTransitionType, setSelectedTransitionType] = useState<TransitionType>('beat_mix');
  const [selectedBars, setSelectedBars] = useState<TransitionBars>(16);
  const [transitionTelemetry, setTransitionTelemetry] = useState<TransitionTelemetry | null>(null);
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState<boolean>(true);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Phase 7 AI DJ Decision Engine State
  const [eventProfile, setEventProfile] = useState<EventProfile>('Party');
  const [aiDecision, setAiDecision] = useState<StructuredAIDecision | null>(null);

  // Phase 9 AI Energy Management State
  const [energyConfig, setEnergyConfig] = useState<EnergyConfig>(() => EnergyManager.getProfilePresets()['Party']);

  // Phase 8 Autonomous AI DJ Mode State
  const [autonomousTelemetry, setAutonomousTelemetry] = useState<AutonomousTelemetry>(
    AutonomousDJEngine.getInstance().getTelemetry()
  );

  // Analysis Progress UI State (Phase 3)
  const [analysisModal, setAnalysisModal] = useState<{
    isOpen: boolean;
    currentTrackName: string;
    progressPercent: number;
    completedCount: number;
    totalCount: number;
    statusText?: string;
    error?: string | null;
  }>({
    isOpen: false,
    currentTrackName: '',
    progressPercent: 0,
    completedCount: 0,
    totalCount: 0,
    statusText: '',
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load real cached tracks from SQLite Database on mount
  useEffect(() => {
    AnalysisService.checkHealth().then((health) => {
      if (health.isOnline) {
        setAiStatus('Audio Engine: Python Librosa + SQLite Online');
      }
    });

    AnalysisService.getCachedTracks().then((cached) => {
      if (cached && cached.length > 0) {
        setTracks(cached);
        // Find Club Beat for Deck A and Harmonic Synths for Deck B
        const trackA = cached.find((t) => t.filename.includes('Club_Beat')) || cached[0];
        const trackB = cached.find((t) => t.filename.includes('Harmonic_Synths')) || (cached.length > 1 ? cached[1] : cached[0]);
        if (trackA) {
          setDeckA((prev) => ({
            ...prev,
            track: trackA,
            bpm: trackA.bpm || prev.bpm,
            currentKey: trackA.key || prev.currentKey,
            duration: trackA.duration || prev.duration,
            cuePoint: trackA.introTime || 0
          }));
        }
        if (trackB) {
          setDeckB((prev) => ({
            ...prev,
            track: trackB,
            bpm: trackB.bpm || prev.bpm,
            currentKey: trackB.key || prev.currentKey,
            duration: trackB.duration || prev.duration,
            cuePoint: trackB.introTime || 0
          }));
        }
      }
    });
  }, []);

  // Initialize AudioEngine on first render
  useEffect(() => {
    const engine = AudioEngine.getInstance();
    engineRef.current = engine;

    // Load initial tracks into audio engine
    engine.deckA.loadTrack({
      id: INITIAL_TRACKS[0].id,
      filename: INITIAL_TRACKS[0].filename,
      title: INITIAL_TRACKS[0].title,
      artist: INITIAL_TRACKS[0].artist,
      duration: INITIAL_TRACKS[0].duration,
      format: INITIAL_TRACKS[0].format,
      fileLocation: INITIAL_TRACKS[0].fileLocation,
      url: INITIAL_TRACKS[0].url
    }).then(() => {
      setDeckA((prev) => ({
        ...prev,
        duration: engine.deckA.audioElement.duration || INITIAL_TRACKS[0].duration
      }));
    });

    engine.deckB.loadTrack({
      id: INITIAL_TRACKS[1].id,
      filename: INITIAL_TRACKS[1].filename,
      title: INITIAL_TRACKS[1].title,
      artist: INITIAL_TRACKS[1].artist,
      duration: INITIAL_TRACKS[1].duration,
      format: INITIAL_TRACKS[1].format,
      fileLocation: INITIAL_TRACKS[1].fileLocation,
      url: INITIAL_TRACKS[1].url
    }).then(() => {
      setDeckB((prev) => ({
        ...prev,
        duration: engine.deckB.audioElement.duration || INITIAL_TRACKS[1].duration
      }));
    });

    engine.setCrossfader(0.0, 'smooth');
    engine.setMasterVolume(0.85);
  }, []);

  // Real-time synchronization loop: tracks actual audio position & true RMS levels
  useEffect(() => {
    let animId: number;

    const syncLoop = () => {
      const engine = engineRef.current;
      if (engine) {
        // Deck A actual position & real audio level
        const elA = engine.deckA.audioElement;
        const levelA = engine.deckA.getLevel();
        setDeckA((prev) => {
          const isPlaying = !elA.paused && !elA.ended;
          return {
            ...prev,
            isPlaying,
            currentTime: elA.currentTime,
            vuMeterLeft: levelA * prev.volume,
            vuMeterRight: Math.max(0, levelA * prev.volume - 0.04 + Math.random() * 0.08),
            platterRotation: isPlaying ? (prev.platterRotation + 3) % 360 : prev.platterRotation
          };
        });

        // Deck B actual position & real audio level
        const elB = engine.deckB.audioElement;
        const levelB = engine.deckB.getLevel();
        setDeckB((prev) => {
          const isPlaying = !elB.paused && !elB.ended;
          return {
            ...prev,
            isPlaying,
            currentTime: elB.currentTime,
            vuMeterLeft: levelB * prev.volume,
            vuMeterRight: Math.max(0, levelB * prev.volume - 0.04 + Math.random() * 0.08),
            platterRotation: isPlaying ? (prev.platterRotation + 3) % 360 : prev.platterRotation
          };
        });
      }
      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Elapsed Event Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Phase 7 & 9: Deterministic AI DJ Decision Engine & Energy Management Evaluation
  useEffect(() => {
    const activeDeckId = crossfader <= 0 ? 'A' : 'B';
    const activeTrack = activeDeckId === 'A' ? deckA.track : deckB.track;
    if (activeTrack && tracks.length > 0) {
      const currentTargetEnergy = EnergyManager.getTargetEnergyAtElapsed(energyConfig, elapsedSeconds / 60);
      const decision = AIPlannerService.planNextTrack(
        activeTrack,
        tracks,
        eventProfile,
        activeDeckId,
        currentTargetEnergy,
        energyConfig.allowJumps
      );
      setAiDecision(decision);
    }
  }, [crossfader, deckA.track, deckB.track, tracks, eventProfile, energyConfig, elapsedSeconds]);

  // Phase 8: Autonomous Engine Initialization & Telemetry Sync
  useEffect(() => {
    const autoEngine = AutonomousDJEngine.getInstance();
    autoEngine.setLibrary(tracks);
    autoEngine.setEventProfile(eventProfile);

    autoEngine.onTrackLoaded = (deckId, track) => {
      if (deckId === 'A') {
        setDeckA((prev) => ({
          ...prev,
          track,
          bpm: track.bpm || prev.bpm,
          currentKey: track.key,
          duration: track.duration || prev.duration,
          cuePoint: track.introTime || 0
        }));
      } else {
        setDeckB((prev) => ({
          ...prev,
          track,
          bpm: track.bpm || prev.bpm,
          currentKey: track.key,
          duration: track.duration || prev.duration,
          cuePoint: track.introTime || 0
        }));
      }
    };

    autoEngine.onCrossfaderSettled = (pos) => {
      setCrossfader(pos);
    };

    const unsubscribe = autoEngine.subscribe((telemetry) => {
      setAutonomousTelemetry(telemetry);
      if (telemetry.decision) {
        setAiDecision(telemetry.decision);
      }
      if (telemetry.statusMessage) {
        setTransitionStatus(telemetry.statusMessage);
      }
      setIsTransitioning(telemetry.state === 'TRANSITIONING');
      setTransitionProgress(telemetry.transitionProgress);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync Library with Autonomous Engine whenever tracks change
  useEffect(() => {
    AutonomousDJEngine.getInstance().setLibrary(tracks);
  }, [tracks]);

  // Sync Event Profile with Autonomous Engine whenever eventProfile changes
  useEffect(() => {
    AutonomousDJEngine.getInstance().setEventProfile(eventProfile);
  }, [eventProfile]);

  // Deck Controls Handlers with REAL Web Audio calls
  const handlePlayPause = async (deckId: 'A' | 'B') => {
    const engine = engineRef.current;
    if (!engine) return;

    if (deckId === 'A') {
      if (deckA.isPlaying) {
        engine.deckA.pause();
      } else {
        await engine.deckA.play();
        setTracksPlayed((c) => c + (deckA.currentTime < 1 ? 1 : 0));
      }
    } else {
      if (deckB.isPlaying) {
        engine.deckB.pause();
      } else {
        await engine.deckB.play();
        setTracksPlayed((c) => c + (deckB.currentTime < 1 ? 1 : 0));
      }
    }
  };

  const handleStop = (deckId: 'A' | 'B') => {
    const engine = engineRef.current;
    if (!engine) return;

    if (deckId === 'A') {
      engine.deckA.stop();
      setDeckA((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    } else {
      engine.deckB.stop();
      setDeckB((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    }
  };

  const handleCue = (deckId: 'A' | 'B') => {
    const engine = engineRef.current;
    if (!engine) return;

    if (deckId === 'A') {
      engine.deckA.seek(deckA.cuePoint);
      setDeckA((prev) => ({ ...prev, currentTime: prev.cuePoint }));
    } else {
      engine.deckB.seek(deckB.cuePoint);
      setDeckB((prev) => ({ ...prev, currentTime: prev.cuePoint }));
    }
  };

  const handleSeek = (deckId: 'A' | 'B', timeSeconds: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (deckId === 'A') {
      engine.deckA.seek(timeSeconds);
      setDeckA((prev) => ({ ...prev, currentTime: timeSeconds }));
    } else {
      engine.deckB.seek(timeSeconds);
      setDeckB((prev) => ({ ...prev, currentTime: timeSeconds }));
    }
  };

  // Accurate Synchronized Playback & BPM Synchronization
  const handleSync = (deckId: 'A' | 'B') => {
    const engine = engineRef.current;
    if (!engine) return;

    if (deckId === 'A') {
      const res = engine.syncDecks('A', 'B');
      const origBpm = deckA.track?.bpm || 128;
      const targetBpm = origBpm * res.targetRate;
      setDeckA((prev) => ({
        ...prev,
        bpm: targetBpm,
        playbackRate: res.targetRate,
        pitchPercent: (res.targetRate - 1.0) * 100,
        isSynced: true
      }));
    } else {
      const res = engine.syncDecks('B', 'A');
      const origBpm = deckB.track?.bpm || 120;
      const targetBpm = origBpm * res.targetRate;
      setDeckB((prev) => ({
        ...prev,
        bpm: targetBpm,
        playbackRate: res.targetRate,
        pitchPercent: (res.targetRate - 1.0) * 100,
        isSynced: true
      }));
    }
  };

  const handlePitchChange = (deckId: 'A' | 'B', pitchPercent: number) => {
    const engine = engineRef.current;
    const rate = 1.0 + pitchPercent / 100;

    if (deckId === 'A') {
      if (engine) engine.deckA.setPlaybackRate(rate);
      const origBpm = deckA.track?.bpm || 128;
      setDeckA((prev) => ({
        ...prev,
        pitchPercent,
        playbackRate: rate,
        bpm: origBpm * rate
      }));
    } else {
      if (engine) engine.deckB.setPlaybackRate(rate);
      const origBpm = deckB.track?.bpm || 128;
      setDeckB((prev) => ({
        ...prev,
        pitchPercent,
        playbackRate: rate,
        bpm: origBpm * rate
      }));
    }
  };

  const handlePitchBend = (deckId: 'A' | 'B', direction: number) => {
    const engine = engineRef.current;
    const nudge = direction * 0.05;

    if (deckId === 'A') {
      const nudgedRate = deckA.playbackRate + nudge;
      if (engine) engine.deckA.setPlaybackRate(nudgedRate);
      setDeckA((prev) => ({ ...prev, playbackRate: nudgedRate }));
      setTimeout(() => {
        const normalRate = 1.0 + deckA.pitchPercent / 100;
        if (engine) engine.deckA.setPlaybackRate(normalRate);
        setDeckA((prev) => ({ ...prev, playbackRate: normalRate }));
      }, 300);
    } else {
      const nudgedRate = deckB.playbackRate + nudge;
      if (engine) engine.deckB.setPlaybackRate(nudgedRate);
      setDeckB((prev) => ({ ...prev, playbackRate: nudgedRate }));
      setTimeout(() => {
        const normalRate = 1.0 + deckB.pitchPercent / 100;
        if (engine) engine.deckB.setPlaybackRate(normalRate);
        setDeckB((prev) => ({ ...prev, playbackRate: normalRate }));
      }, 300);
    }
  };

  // Load Tracks from Library into real Deck Audio Player
  const handleLoadTrackA = async (track: Track) => {
    AIPlannerService.recordPlayed(track.id, track.artist);
    const engine = engineRef.current;
    if (engine) {
      await engine.deckA.loadTrack({
        id: track.id,
        filename: track.filename,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        format: track.format,
        fileLocation: track.fileLocation,
        url: track.url,
        file: track.file
      });
      setDeckA((prev) => ({
        ...prev,
        track,
        duration: engine.deckA.audioElement.duration || track.duration,
        currentTime: 0,
        bpm: track.bpm || prev.bpm || 128,
        currentKey: track.key,
        cuePoint: track.introTime || 0,
        isPlaying: false
      }));
    }
  };

  const handleLoadTrackB = async (track: Track) => {
    AIPlannerService.recordPlayed(track.id, track.artist);
    const engine = engineRef.current;
    if (engine) {
      await engine.deckB.loadTrack({
        id: track.id,
        filename: track.filename,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        format: track.format,
        fileLocation: track.fileLocation,
        url: track.url,
        file: track.file
      });
      setDeckB((prev) => ({
        ...prev,
        track,
        duration: engine.deckB.audioElement.duration || track.duration,
        currentTime: 0,
        bpm: track.bpm || prev.bpm || 120,
        currentKey: track.key,
        cuePoint: track.introTime || 0,
        isPlaying: false
      }));
    }
  };

  // Channel & Mixer Audio Routing Handlers
  const handleVolumeChangeA = (vol: number) => {
    setDeckA((prev) => ({ ...prev, volume: vol }));
    if (engineRef.current) {
      engineRef.current.deckA.setVolume(vol);
    }
  };

  const handleVolumeChangeB = (vol: number) => {
    setDeckB((prev) => ({ ...prev, volume: vol }));
    if (engineRef.current) {
      engineRef.current.deckB.setVolume(vol);
    }
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    if (engineRef.current) {
      engineRef.current.setMasterVolume(vol);
    }
  };

  const handleCrossfaderChange = (val: number) => {
    setCrossfader(val);
    if (engineRef.current) {
      engineRef.current.setCrossfader(val, crossfaderCurve);
    }
  };

  const handleCrossfaderCurveChange = (curve: 'smooth' | 'linear' | 'cut') => {
    setCrossfaderCurve(curve);
    if (engineRef.current) {
      engineRef.current.setCrossfader(crossfader, curve);
    }
  };

  // Channel Pre-Gain Handlers (0.0 to 2.0)
  const handleGainChangeA = (val: number) => {
    setDeckA((prev) => ({ ...prev, gain: val }));
    if (engineRef.current) engineRef.current.deckA.setGain(val);
  };

  const handleGainChangeB = (val: number) => {
    setDeckB((prev) => ({ ...prev, gain: val }));
    if (engineRef.current) engineRef.current.deckB.setGain(val);
  };

  // 3-Band Biquad EQ Handlers (-26 dB to +6 dB)
  const handleEqChangeA = (band: 'high' | 'mid' | 'low', val: number) => {
    setDeckA((prev) => ({
      ...prev,
      [band === 'high' ? 'eqHigh' : band === 'mid' ? 'eqMid' : 'eqLow']: val
    }));
    if (engineRef.current) engineRef.current.deckA.setEQ(band, val);
  };

  const handleEqChangeB = (band: 'high' | 'mid' | 'low', val: number) => {
    setDeckB((prev) => ({
      ...prev,
      [band === 'high' ? 'eqHigh' : band === 'mid' ? 'eqMid' : 'eqLow']: val
    }));
    if (engineRef.current) engineRef.current.deckB.setEQ(band, val);
  };

  // Bi-Directional Resonant Filter Handlers (-1.0 to +1.0)
  const handleFilterChangeA = (val: number) => {
    setDeckA((prev) => ({ ...prev, filter: val }));
    if (engineRef.current) engineRef.current.deckA.setFilter(val);
  };

  const handleFilterChangeB = (val: number) => {
    setDeckB((prev) => ({ ...prev, filter: val }));
    if (engineRef.current) engineRef.current.deckB.setFilter(val);
  };

  // Pitch-Preserving Key Lock Toggle
  const handleToggleKeyLock = (deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      const next = !deckA.isKeyLocked;
      setDeckA((prev) => ({ ...prev, isKeyLocked: next }));
      if (engineRef.current) engineRef.current.deckA.setKeyLock(next);
    } else {
      const next = !deckB.isKeyLocked;
      setDeckB((prev) => ({ ...prev, isKeyLocked: next }));
      if (engineRef.current) engineRef.current.deckB.setKeyLock(next);
    }
  };

  // Automatic Transitions Engine Coordinator (Phase 6)
  const handleStartTransition = async (
    type: TransitionType = selectedTransitionType,
    bars: TransitionBars = selectedBars
  ) => {
    const engine = engineRef.current;
    if (!engine || isTransitioning) return;

    // Determine fromDeck and toDeck based on crossfader position / active playback
    const fromDeck = crossfader <= 0 ? 'A' : 'B';
    const toDeck = fromDeck === 'A' ? 'B' : 'A';

    setIsTransitioning(true);
    setFallbackReason(null);
    setTransitionProgress(0);
    setTransitionStatus(`Transitioning: ${type.toUpperCase().replace('_', ' ')} (${bars} Bars: Deck ${fromDeck} ➔ Deck ${toDeck})...`);

    await engine.startTransition(
      type,
      fromDeck,
      toDeck,
      bars,
      (telemetry) => {
        setTransitionTelemetry(telemetry);
        setTransitionProgress(telemetry.progress);
        setTransitionStatus(telemetry.stepText);
        setCrossfader(engine.getCrossfader());
      },
      () => {
        setIsTransitioning(false);
        setTransitionProgress(1.0);
        setTransitionTelemetry(null);
        const finalDeck = toDeck;
        setTransitionStatus(`Transition Complete: Active on Deck ${finalDeck}`);
        setCrossfader(finalDeck === 'A' ? -1.0 : 1.0);
        if (finalDeck === 'A') {
          setDeckA((prev) => ({ ...prev, isPlaying: true }));
          setDeckB((prev) => ({ ...prev, isPlaying: false }));
        } else {
          setDeckA((prev) => ({ ...prev, isPlaying: false }));
          setDeckB((prev) => ({ ...prev, isPlaying: true }));
        }
      },
      (reason) => {
        setFallbackReason(reason);
        setTransitionStatus(`Safe Fallback Activated: ${reason} → Standard Crossfade`);
      }
    );
  };

  const handleCancelTransition = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.cancelTransition();
    }
    setIsTransitioning(false);
    setTransitionTelemetry(null);
    setFallbackReason(null);
    setTransitionStatus('Transition cancelled: Manual control resumed');
  };

  // Emergency Stop: haltes audio immediately on Web Audio level
  const handleEmergencyStop = () => {
    AutonomousDJEngine.getInstance().stop();
    const engine = engineRef.current;
    if (engine) {
      engine.deckA.stop();
      engine.deckB.stop();
      engine.setMasterVolume(0);
    }
    setDeckA((prev) => ({ ...prev, isPlaying: false, volume: 0 }));
    setDeckB((prev) => ({ ...prev, isPlaying: false, volume: 0 }));
    setMasterVolume(0);
    SafetyLogger.log('SYSTEM', 'CRITICAL_RECOVERY', 'EMERGENCY STOP manually triggered: all decks stopped, DSP muted, master volume zeroed');
    SafetyLogger.recordSessionEvent('EMERGENCY_STOP', 'System-wide emergency mute and stop engaged by operator');
    alert('⚠️ EMERGENCY STOP ACTIVATED: Both decks stopped and muted. Master output protected.');
  };

  // Phase 11 Intentional Fault Simulation Test Handlers
  const handleSimulateCorruptTrack = async () => {
    SafetyLogger.log('DECODER', 'WARN', 'Intentional Test: Loading corrupted/invalid track URL to verify error trapping');
    SafetyLogger.recordSessionEvent('FAULT_SIMULATED', 'Testing track recovery logic on Deck B');
    try {
      if (engineRef.current) {
        await engineRef.current.deckB.loadTrack({
          id: 'sim-corrupted',
          filename: 'corrupted_track.mp3',
          title: 'Corrupted Track',
          artist: 'Unknown',
          duration: 0,
          format: 'MP3',
          fileLocation: '',
          url: 'https://localhost:9999/non_existent_corrupted_track.mp3'
        });
      }
    } catch (err: any) {
      SafetyLogger.log('DECODER', 'CRITICAL_RECOVERY', `Handled track decode failure: ${err.message}. Triggering automatic fallback track recovery.`);
      // Recover by loading first healthy track in library
      const fallback = tracks.find((t) => t.status !== 'failed') || INITIAL_TRACKS[0];
      if (fallback) {
        await handleLoadTrackB(fallback);
        SafetyLogger.log('DECODER', 'INFO', `Successfully recovered: Loaded fallback track "${fallback.title}" to Deck B`);
        SafetyLogger.recordSessionEvent('TRACK_RECOVERED', `Recovered Deck B with "${fallback.title}"`);
      }
    }
  };

  const handleSimulatePlannerFailure = () => {
    SafetyLogger.log('AI_PLANNER', 'WARN', 'Intentional Test: Simulating unhandled AI planner crash / network partition');
    SafetyLogger.recordSessionEvent('FAULT_SIMULATED', 'Forcing AI DJ decision engine into fallback mode');
    const activeDeckId = crossfader <= 0 ? 'A' : 'B';
    const activeTrack = activeDeckId === 'A' ? deckA.track : deckB.track;
    if (activeTrack) {
      const fallbackDecision = AIPlannerService.getFallbackDecision(
        activeTrack,
        activeDeckId,
        tracks
      );
      setAiDecision(fallbackDecision);
      SafetyLogger.log('AI_PLANNER', 'CRITICAL_RECOVERY', `Local fallback DJ planner activated successfully. Next track: "${fallbackDecision.next_track}" via ${fallbackDecision.transition_type}`);
      SafetyLogger.recordSessionEvent('TRANSITION_PLANNED', `Fallback Planner selected "${fallbackDecision.next_track}" deterministically`);
    }
  };

  const handleSimulateTransitionGlitch = async () => {
    SafetyLogger.log('TRANSITION', 'WARN', 'Intentional Test: Simulating complex transition DSP failure');
    SafetyLogger.recordSessionEvent('FAULT_SIMULATED', 'Testing safe crossfade fallback');
    const fromDeck = crossfader <= 0 ? 'A' : 'B';
    const toDeck = fromDeck === 'A' ? 'B' : 'A';
    SafetyLogger.log('TRANSITION', 'CRITICAL_RECOVERY', 'Advanced transition failed / unavailable: Reverting immediately to safe linear crossfade');
    SafetyLogger.recordSessionEvent('SAFE_FALLBACK_TRIGGERED', `Fading smoothly between Deck ${fromDeck} and Deck ${toDeck}`);
    await handleStartTransition('smooth_crossfade', 8);
  };

  const handleSimulateDeckStall = () => {
    SafetyLogger.log('DECK_RECOVERY', 'WARN', 'Intentional Test: Simulating audio deck playback stall / frozen buffer');
    SafetyLogger.recordSessionEvent('FAULT_SIMULATED', 'Triggering HealthWatchdog deck recovery');
    const activeDeckId = crossfader <= 0 ? 'A' : 'B';
    HealthWatchdogService.getInstance().triggerStallRecovery(activeDeckId);
  };

  // Phase 8 Autonomous AI DJ Mode Handlers
  const handleToggleAutonomous = async () => {
    const autoEngine = AutonomousDJEngine.getInstance();
    if (autonomousTelemetry.isAutonomousActive) {
      autoEngine.stop();
      setAiMode('assist');
      setAiStatus('Autonomous Engine: Stopped • Standby');
    } else {
      autoEngine.setLibrary(tracks);
      autoEngine.setEventProfile(eventProfile);
      setAiMode('autonomous');
      setAiStatus('Autonomous Engine: Active • Online');
      await autoEngine.start();
    }
  };

  const handleForceAutonomousTransition = async () => {
    const autoEngine = AutonomousDJEngine.getInstance();
    await autoEngine.forceTransition();
  };

  // Phase 12 Pro DJ Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs, textareas, etc.
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      // Help / Shortcuts Reference (? or H)
      if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Emergency Stop (Escape)
      if (e.key === 'Escape') {
        handleEmergencyStop();
        return;
      }

      // Space: Toggle Play/Pause on Active Deck
      if (e.code === 'Space') {
        e.preventDefault();
        const activeDeckId = crossfader <= 0 ? 'A' : 'B';
        handlePlayPause(activeDeckId);
        return;
      }

      // Deck A Transport
      if (e.code === 'KeyW') {
        handlePlayPause('A');
        return;
      }
      if (e.code === 'KeyQ') {
        handleCue('A');
        return;
      }
      if (e.code === 'KeyE') {
        handleSync('A');
        return;
      }
      if (e.code === 'BracketLeft') {
        handlePitchBend('A', -0.05);
        return;
      }
      if (e.code === 'BracketRight') {
        handlePitchBend('A', 0.05);
        return;
      }
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (deckA.hotCues[idx] !== null) {
          handleSeek('A', deckA.hotCues[idx]!);
        } else {
          const newCues = [...deckA.hotCues];
          newCues[idx] = deckA.currentTime;
          setDeckA((prev) => ({ ...prev, hotCues: newCues }));
        }
        return;
      }

      // Deck B Transport
      if (e.code === 'KeyP') {
        handlePlayPause('B');
        return;
      }
      if (e.code === 'KeyO') {
        handleCue('B');
        return;
      }
      if (e.code === 'KeyI') {
        handleSync('B');
        return;
      }
      if (e.code === 'Minus') {
        handlePitchBend('B', -0.05);
        return;
      }
      if (e.code === 'Equal') {
        handlePitchBend('B', 0.05);
        return;
      }
      if (['Digit7', 'Digit8', 'Digit9', 'Digit0'].includes(e.code)) {
        const map: Record<string, number> = { Digit7: 0, Digit8: 1, Digit9: 2, Digit0: 3 };
        const idx = map[e.code];
        if (deckB.hotCues[idx] !== null) {
          handleSeek('B', deckB.hotCues[idx]!);
        } else {
          const newCues = [...deckB.hotCues];
          newCues[idx] = deckB.currentTime;
          setDeckB((prev) => ({ ...prev, hotCues: newCues }));
        }
        return;
      }

      // Mixer Crossfader Controls
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const nextPos = Math.max(-1.0, parseFloat((crossfader - 0.1).toFixed(2)));
        handleCrossfaderChange(nextPos);
        return;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const nextPos = Math.min(1.0, parseFloat((crossfader + 0.1).toFixed(2)));
        handleCrossfaderChange(nextPos);
        return;
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleCrossfaderChange(0.0);
        return;
      }

      // Transitions & Modes
      if (e.code === 'KeyT') {
        handleForceAutonomousTransition();
        return;
      }
      if (e.code === 'KeyA') {
        handleToggleAutonomous();
        return;
      }
      if (e.code === 'KeyL') {
        setIsLiveEventView((prev) => !prev);
        return;
      }
      if (e.code === 'KeyS') {
        setIsEventSetupOpen(true);
        return;
      }
      if (e.code === 'KeyD') {
        setIsSessionLogOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [crossfader, deckA, deckB, autonomousTelemetry]);

  // Phase 7 AI Decision Actions
  const handleApplyAIDecision = (decision: StructuredAIDecision) => {
    if (!decision.next_track_details) return;
    if (decision.next_deck === 'A') {
      handleLoadTrackA(decision.next_track_details);
    } else {
      handleLoadTrackB(decision.next_track_details);
    }
    setSelectedTransitionType(decision.transition_type);
    setSelectedBars(decision.transition_bars);
    setTransitionStatus(`AI Strategy Applied: Loaded "${decision.next_track}" to Deck ${decision.next_deck} (${decision.transition_bars}-Bar ${decision.transition_type.replace('_', ' ')})`);
  };

  const handleReplan = () => {
    const activeDeckId = crossfader <= 0 ? 'A' : 'B';
    const activeTrack = activeDeckId === 'A' ? deckA.track : deckB.track;
    if (activeTrack && tracks.length > 0) {
      const currentTargetEnergy = EnergyManager.getTargetEnergyAtElapsed(energyConfig, elapsedSeconds / 60);
      const decision = AIPlannerService.planNextTrack(
        activeTrack,
        tracks,
        eventProfile,
        activeDeckId,
        currentTargetEnergy,
        energyConfig.allowJumps
      );
      setAiDecision(decision);
    }
  };

  // Music File Import with Real Python Analysis & Progress UI (Phase 3)
  const handleImportMusic = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    setAnalysisModal({
      isOpen: true,
      currentTrackName: fileList[0].name,
      progressPercent: 5,
      completedCount: 0,
      totalCount: fileList.length,
      statusText: 'Connecting to Audio Analysis Pipeline...',
      error: null
    });

    const newlyAnalyzed: Track[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const startPercent = Math.round((i / fileList.length) * 100);
      setAnalysisModal((prev) => ({
        ...prev,
        currentTrackName: file.name,
        progressPercent: Math.max(5, startPercent),
        statusText: `Extracting BPM, Key, Beats, Energy & LUFS from ${file.name}...`
      }));

      try {
        const analyzed = await AnalysisService.uploadAndAnalyze(file, false);
        newlyAnalyzed.push(analyzed);
      } catch (err: any) {
        console.error('Audio analysis failed for:', file.name, err);
        // Do not invent values: mark explicitly as failed/unavailable
        newlyAnalyzed.push({
          id: `trk-failed-${Date.now()}-${i}`,
          filename: file.name,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          duration: 0,
          format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
          fileLocation: file.name,
          url: URL.createObjectURL(file),
          bpm: null,
          key: '--',
          musicalKeyName: 'Unavailable',
          energy: null,
          genre: 'Unknown',
          filePath: file.name,
          status: 'failed',
          errorMessage: err.message || 'Analysis failed',
          introTime: 0,
          outroTime: 0,
          loudness: null
        });
      }

      const endPercent = Math.round(((i + 1) / fileList.length) * 100);
      setAnalysisModal((prev) => ({
        ...prev,
        progressPercent: endPercent,
        completedCount: i + 1,
        statusText: `Analysis complete for ${file.name}`
      }));
    }

    setTracks((prev) => {
      const existingNames = new Set(newlyAnalyzed.map((t) => t.filename));
      const filteredPrev = prev.filter((t) => !existingNames.has(t.filename));
      return [...newlyAnalyzed, ...filteredPrev];
    });

    setTimeout(() => {
      setAnalysisModal((prev) => ({ ...prev, isOpen: false }));
    }, 800);
  };

  // Re-analyze a single track (Phase 3 Requirement)
  const handleReanalyzeTrack = async (track: Track) => {
    setAnalysisModal({
      isOpen: true,
      currentTrackName: track.title,
      progressPercent: 35,
      completedCount: 0,
      totalCount: 1,
      statusText: `Re-extracting audio features from ${track.filename}...`,
      error: null
    });

    try {
      const updated = await AnalysisService.reanalyzeTrack(track);
      setAnalysisModal((prev) => ({
        ...prev,
        progressPercent: 100,
        completedCount: 1,
        statusText: `Re-analysis complete: BPM ${updated.bpm} | Key ${updated.key}`
      }));

      setTracks((prev) => prev.map((t) => (t.id === track.id || t.filePath === track.filePath ? updated : t)));

      // If active on Deck A or B, update deck state as well
      if (deckA.track?.id === track.id) {
        setDeckA((prev) => ({
          ...prev,
          track: updated,
          bpm: updated.bpm || prev.bpm,
          currentKey: updated.key || prev.currentKey
        }));
      }
      if (deckB.track?.id === track.id) {
        setDeckB((prev) => ({
          ...prev,
          track: updated,
          bpm: updated.bpm || prev.bpm,
          currentKey: updated.key || prev.currentKey
        }));
      }

      setTimeout(() => {
        setAnalysisModal((prev) => ({ ...prev, isOpen: false }));
      }, 700);
    } catch (err: any) {
      setAnalysisModal((prev) => ({
        ...prev,
        error: `Re-analysis failed: ${err.message}`
      }));
    }
  };

  // Batch Re-analyze all tracks in the library
  const handleReanalyzeAll = async () => {
    if (tracks.length === 0) return;

    setAnalysisModal({
      isOpen: true,
      currentTrackName: tracks[0].title,
      progressPercent: 5,
      completedCount: 0,
      totalCount: tracks.length,
      statusText: 'Starting full library re-analysis...',
      error: null
    });

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const startPercent = Math.round((i / tracks.length) * 100);
      setAnalysisModal((prev) => ({
        ...prev,
        currentTrackName: track.title,
        progressPercent: Math.max(5, startPercent),
        statusText: `Reanalyzing (${i + 1}/${tracks.length}) ${track.title}...`
      }));

      try {
        const updated = await AnalysisService.reanalyzeTrack(track);
        setTracks((prev) => prev.map((t) => (t.id === track.id ? updated : t)));
      } catch (err) {
        console.warn(`Reanalysis failed for ${track.filename}:`, err);
      }

      const endPercent = Math.round(((i + 1) / tracks.length) * 100);
      setAnalysisModal((prev) => ({
        ...prev,
        progressPercent: endPercent,
        completedCount: i + 1
      }));
    }

    setTimeout(() => {
      setAnalysisModal((prev) => ({ ...prev, isOpen: false }));
    }, 700);
  };

  // Remove track from library
  const handleRemoveTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '10px 14px', 
      maxWidth: '1800px', 
      margin: '0 auto',
      gap: '10px'
    }}>
      {/* Hidden file input for music import supporting MP3, WAV, FLAC, M4A, AAC */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
        multiple
        accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
      />

      {/* 1. TOP BAR */}
      <TopBar
        eventName={eventName}
        onEventNameChange={(name) => {
          setEventName(name);
          setEventSetupData((prev) => ({ ...prev, eventName: name }));
        }}
        aiStatus={aiStatus}
        isLive={isLive}
        onOpenEventSetup={() => setIsEventSetupOpen(true)}
        onToggleLiveEventView={() => setIsLiveEventView((prev) => !prev)}
        isLiveEventView={isLiveEventView}
        onOpenSessionLog={() => setIsSessionLogOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* 2. DUAL SYNCED SCROLLING WAVEFORM & BEAT GRID DISPLAY (PHASE 4) */}
      <WaveformDisplay
        deckA={deckA}
        deckB={deckB}
        onSeekA={(time) => handleSeek('A', time)}
        onSeekB={(time) => handleSeek('B', time)}
      />

      {/* 3. DUAL DECKS & CENTER MIXER SECTION */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
        {/* Left Deck (Deck A) */}
        <Deck
          deck={deckA}
          onPlayPause={() => handlePlayPause('A')}
          onStop={() => handleStop('A')}
          onCue={() => handleCue('A')}
          onSeek={(time) => handleSeek('A', time)}
          onSync={() => handleSync('A')}
          onPitchChange={(p) => handlePitchChange('A', p)}
          onPitchBend={(d) => handlePitchBend('A', d)}
          onLoopToggle={() => setDeckA((prev) => ({ ...prev, loopActive: !prev.loopActive }))}
          onLoopLengthChange={(len) => setDeckA((prev) => ({ ...prev, loopLength: len, loopActive: true }))}
          onHotCue={(idx) => {
            if (deckA.hotCues[idx] !== null) {
              handleSeek('A', deckA.hotCues[idx]!);
            } else {
              const newCues = [...deckA.hotCues];
              newCues[idx] = deckA.currentTime;
              setDeckA((prev) => ({ ...prev, hotCues: newCues }));
            }
          }}
          onToggleKeyLock={() => handleToggleKeyLock('A')}
        />

        {/* Center Mixer with Real Audio Gain & Crossfade Routing */}
        <Mixer
          deckA={deckA}
          deckB={deckB}
          crossfader={crossfader}
          crossfaderCurve={crossfaderCurve}
          masterVolume={masterVolume}
          onVolumeChangeA={handleVolumeChangeA}
          onVolumeChangeB={handleVolumeChangeB}
          onEqChangeA={handleEqChangeA}
          onEqChangeB={handleEqChangeB}
          onFilterChangeA={handleFilterChangeA}
          onFilterChangeB={handleFilterChangeB}
          onGainChangeA={handleGainChangeA}
          onGainChangeB={handleGainChangeB}
          onCrossfaderChange={handleCrossfaderChange}
          onCrossfaderCurveChange={handleCrossfaderCurveChange}
          onMasterVolumeChange={handleMasterVolumeChange}
        />

        {/* Right Deck (Deck B) */}
        <Deck
          deck={deckB}
          onPlayPause={() => handlePlayPause('B')}
          onStop={() => handleStop('B')}
          onCue={() => handleCue('B')}
          onSeek={(time) => handleSeek('B', time)}
          onSync={() => handleSync('B')}
          onPitchChange={(p) => handlePitchChange('B', p)}
          onPitchBend={(d) => handlePitchBend('B', d)}
          onLoopToggle={() => setDeckB((prev) => ({ ...prev, loopActive: !prev.loopActive }))}
          onLoopLengthChange={(len) => setDeckB((prev) => ({ ...prev, loopLength: len, loopActive: true }))}
          onHotCue={(idx) => {
            if (deckB.hotCues[idx] !== null) {
              handleSeek('B', deckB.hotCues[idx]!);
            } else {
              const newCues = [...deckB.hotCues];
              newCues[idx] = deckB.currentTime;
              setDeckB((prev) => ({ ...prev, hotCues: newCues }));
            }
          }}
          onToggleKeyLock={() => handleToggleKeyLock('B')}
        />
      </div>

      {/* 3. AI PANEL (PHASE 7 & 8 DECISION ENGINE & AUTONOMOUS MODE) */}
      <AIPanel
        aiStatus={aiStatus}
        currentTrack={crossfader <= 0 ? deckA.track : deckB.track}
        nextTrack={aiDecision?.next_track_details || (crossfader <= 0 ? deckB.track : deckA.track)}
        currentBpm={crossfader <= 0 ? deckA.bpm : deckB.bpm}
        currentKey={crossfader <= 0 ? deckA.currentKey : deckB.currentKey}
        energyPercent={Math.round((crossfader <= 0 ? (deckA.track?.energy ?? 0.85) : (deckB.track?.energy ?? 0.85)) * 100)}
        transitionStatus={transitionStatus}
        transitionProgress={transitionProgress}
        isTransitioning={isTransitioning}
        onStartTransition={(t, bars) => handleStartTransition(t || selectedTransitionType, bars || selectedBars)}
        onCancelTransition={handleCancelTransition}
        aiMode={aiMode}
        onAIModeChange={(m) => {
          setAiMode(m);
          if (m === 'autonomous') {
            if (!autonomousTelemetry.isAutonomousActive) handleToggleAutonomous();
          } else {
            if (autonomousTelemetry.isAutonomousActive) handleToggleAutonomous();
          }
        }}
        decision={aiDecision}
        eventProfile={eventProfile}
        onEventProfileChange={(prof) => {
          setEventProfile(prof);
          const presets = EnergyManager.getProfilePresets();
          const newCfg = presets[prof] ? { ...presets[prof] } : { ...energyConfig, profile: prof };
          setEnergyConfig(newCfg);
          AutonomousDJEngine.getInstance().setEnergyConfig(newCfg);

          const activeDeckId = crossfader <= 0 ? 'A' : 'B';
          const activeTrack = activeDeckId === 'A' ? deckA.track : deckB.track;
          if (activeTrack && tracks.length > 0) {
            const currentTargetEnergy = EnergyManager.getTargetEnergyAtElapsed(newCfg, elapsedSeconds / 60);
            const dec = AIPlannerService.planNextTrack(
              activeTrack,
              tracks,
              prof,
              activeDeckId,
              currentTargetEnergy,
              newCfg.allowJumps
            );
            setAiDecision(dec);
          }
        }}
        onApplyDecision={handleApplyAIDecision}
        onReplan={handleReplan}
        autonomousState={autonomousTelemetry.state}
        isAutonomousActive={autonomousTelemetry.isAutonomousActive}
        onToggleAutonomous={handleToggleAutonomous}
        onForceAutonomousTransition={handleForceAutonomousTransition}
        secondsUntilTransition={autonomousTelemetry.secondsUntilTransition}
        barsUntilTransition={autonomousTelemetry.barsUntilTransition}
        autonomousMixCount={autonomousTelemetry.totalAutonomousMixes}
      />

      {/* 3b. PHASE 9 — AI ENERGY MANAGEMENT PANEL */}
      <EnergyManagerPanel
        currentTrackEnergy={crossfader <= 0 ? (deckA.track?.energy ?? 0.85) : (deckB.track?.energy ?? 0.85)}
        elapsedSeconds={elapsedSeconds}
        tracks={tracks}
        config={energyConfig}
        onConfigChange={(newCfg) => {
          setEnergyConfig(newCfg);
          setEventProfile(newCfg.profile);
          AutonomousDJEngine.getInstance().setEnergyConfig(newCfg);
        }}
        onProfileSelect={(prof) => {
          setEventProfile(prof);
          const presets = EnergyManager.getProfilePresets();
          const newCfg = presets[prof] ? { ...presets[prof] } : { ...energyConfig, profile: prof };
          setEnergyConfig(newCfg);
          AutonomousDJEngine.getInstance().setEnergyConfig(newCfg);
        }}
      />

      {/* 4. PHASE 6 AUTOMATIC DJ TRANSITION ENGINE HUD */}
      <AutoTransitionPanel
        currentTrack={crossfader <= 0 ? deckA.track : deckB.track}
        nextTrack={crossfader <= 0 ? deckB.track : deckA.track}
        activeDeckId={crossfader <= 0 ? 'A' : 'B'}
        nextDeckId={crossfader <= 0 ? 'B' : 'A'}
        currentBpm={crossfader <= 0 ? deckA.bpm : deckB.bpm}
        nextOriginalBpm={crossfader <= 0 ? (deckB.track?.bpm || 120) : (deckA.track?.bpm || 128)}
        nextSyncedBpm={crossfader <= 0 ? deckA.bpm : deckB.bpm}
        selectedType={selectedTransitionType}
        selectedBars={selectedBars}
        onSelectType={setSelectedTransitionType}
        onSelectBars={setSelectedBars}
        isTransitioning={isTransitioning}
        telemetry={transitionTelemetry}
        autoTriggerEnabled={autoTriggerEnabled}
        onToggleAutoTrigger={() => {
          setAutoTriggerEnabled((prev) => {
            const next = !prev;
            if (engineRef.current) engineRef.current.transitionEngine.setAutoTrigger(next);
            return next;
          });
        }}
        onStartTransition={() => handleStartTransition(selectedTransitionType, selectedBars)}
        onCancelTransition={handleCancelTransition}
        fallbackReason={fallbackReason}
      />

      {/* 5. BOTTOM SECTION: Music Library, Playlist, Search, Add/Remove Music */}
      <BottomSection
        tracks={tracks}
        onLoadDeckA={handleLoadTrackA}
        onLoadDeckB={handleLoadTrackB}
        onImportMusic={handleImportMusic}
        onRemoveTrack={handleRemoveTrack}
        onReanalyzeTrack={handleReanalyzeTrack}
        onReanalyzeAll={handleReanalyzeAll}
        currentDeckATrackId={deckA.track?.id}
        currentDeckBTrackId={deckB.track?.id}
      />

      {/* 5. LIVE EVENT PANEL */}
      <LiveEventPanel
        isLive={isLive}
        elapsedSeconds={elapsedSeconds}
        tracksPlayed={tracksPlayed}
        outputDevice={outputDevice}
        onOutputDeviceChange={(dev) => {
          setOutputDevice(dev);
          setEventSetupData((prev) => ({ ...prev, outputDevice: dev }));
        }}
        aiHealth={aiHealth}
        onEmergencyStop={handleEmergencyStop}
        onOpenLiveEvent={() => setIsLiveEventView(true)}
        onOpenSetup={() => setIsEventSetupOpen(true)}
      />

      {/* 6. PHASE 10: DEDICATED SIMPLIFIED LIVE EVENT STAGE HUD */}
      <LiveEventOverlay
        isOpen={isLiveEventView}
        onClose={() => setIsLiveEventView(false)}
        setupData={eventSetupData}
        onOpenSetup={() => {
          setIsLiveEventView(false);
          setIsEventSetupOpen(true);
        }}
        deckA={deckA}
        deckB={deckB}
        crossfader={crossfader}
        aiDecision={aiDecision}
        autonomousTelemetry={autonomousTelemetry}
        isAutonomousActive={autonomousTelemetry.isAutonomousActive}
        onStartAIDJ={() => {
          if (!autonomousTelemetry.isAutonomousActive) {
            setIsConfirmationOpen(true);
          }
        }}
        onPause={() => {
          const activeDeckId = crossfader <= 0 ? 'A' : 'B';
          handlePlayPause(activeDeckId);
        }}
        onNext={handleForceAutonomousTransition}
        onStop={() => {
          AutonomousDJEngine.getInstance().stop();
          if (engineRef.current) {
            engineRef.current.deckA.pause();
            engineRef.current.deckB.pause();
          }
          setDeckA((prev) => ({ ...prev, isPlaying: false }));
          setDeckB((prev) => ({ ...prev, isPlaying: false }));
        }}
        onEmergencyStop={handleEmergencyStop}
        eventElapsedSeconds={elapsedSeconds}
        tracksPlayed={tracksPlayed}
        outputDevice={outputDevice}
        onOutputDeviceChange={(dev) => {
          setOutputDevice(dev);
          setEventSetupData((prev) => ({ ...prev, outputDevice: dev }));
        }}
        audioContext={engineRef.current?.audioCtx}
        onOpenSessionLog={() => setIsSessionLogOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* 7. PHASE 10: EVENT SETUP WIZARD MODAL */}
      <EventSetupModal
        isOpen={isEventSetupOpen}
        onClose={() => setIsEventSetupOpen(false)}
        initialData={eventSetupData}
        availableDevices={[
          'Default - Speakers (Realtek(R) Audio)',
          'Headphones (Realtek(R) Audio Output)',
          'USB DJ Controller / External Audio Interface',
          'Virtual Audio Cable / Direct Live Stream'
        ]}
        loadedTracksCount={tracks.length}
        onSelectMusicFolder={handleImportMusic}
        onProceedToConfirmation={(data) => {
          setEventSetupData(data);
          setEventName(data.eventName);
          setOutputDevice(data.outputDevice);
          setEventProfile(data.musicStyle);
          setIsEventSetupOpen(false);
          setIsConfirmationOpen(true);
        }}
      />

      {/* 8. PHASE 10: LIVE AUTONOMOUS CONFIRMATION MODAL */}
      <LiveAutonomousConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        setupData={eventSetupData}
        tracksCount={tracks.length}
        onConfirmGoLive={async () => {
          setIsConfirmationOpen(false);
          const autoEngine = AutonomousDJEngine.getInstance();
          autoEngine.setLibrary(tracks);
          autoEngine.setEventProfile(eventSetupData.musicStyle);
          const presets = EnergyManager.getProfilePresets();
          const targetCfg = presets[eventSetupData.musicStyle] || {
            profile: eventSetupData.musicStyle,
            startEnergy: 0.60,
            targetEnergy: eventSetupData.targetEnergy,
            eventDurationMinutes: eventSetupData.durationMinutes,
            peakTimeMinutes: Math.round(eventSetupData.durationMinutes * 0.65),
            allowJumps: false
          };
          setEnergyConfig(targetCfg);
          autoEngine.setEnergyConfig(targetCfg);
          setAiMode('autonomous');
          setAiStatus('Autonomous Engine: Live Broadcast Active');
          await autoEngine.start();
          setIsLiveEventView(true);
        }}
      />

      {/* 9. PHASE 3 ANALYSIS PROGRESS MODAL */}
      <AnalysisProgressModal
        isOpen={analysisModal.isOpen}
        currentTrackName={analysisModal.currentTrackName}
        progressPercent={analysisModal.progressPercent}
        completedCount={analysisModal.completedCount}
        totalCount={analysisModal.totalCount}
        statusText={analysisModal.statusText}
        error={analysisModal.error}
        onClose={() => setAnalysisModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 10. PHASE 11: EVENT SESSION LOG & SAFETY DIAGNOSTICS MODAL */}
      <EventSessionLogModal
        isOpen={isSessionLogOpen}
        onClose={() => setIsSessionLogOpen(false)}
        onSimulateCorruptTrack={handleSimulateCorruptTrack}
        onSimulatePlannerFailure={handleSimulatePlannerFailure}
        onSimulateTransitionGlitch={handleSimulateTransitionGlitch}
        onSimulateDeckStall={handleSimulateDeckStall}
      />

      {/* 11. PHASE 12: DJ KEYBOARD SHORTCUTS REFERENCE MODAL */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default App;
