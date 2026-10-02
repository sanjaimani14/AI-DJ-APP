import React, { useState, useEffect } from 'react';
import type { DeckState } from '../types/dj';
import type { StructuredAIDecision } from '../services/aiPlannerService';
import type { AutonomousTelemetry } from '../audio/AutonomousDJEngine';
import type { EventSetupData } from './EventSetupModal';
import { SystemTelemetryService, type SystemHealthMetrics } from '../services/systemTelemetry';
import { EnergyManager } from '../services/energyManager';
import { 
  Play, 
  Pause, 
  FastForward, 
  Square, 
  ShieldAlert, 
  Minimize2, 
  Speaker, 
  Clock, 
  Disc, 
  Zap, 
  Cpu, 
  Activity, 
  Settings, 
  AlertTriangle, 
  Volume2, 
  Layers,
  FileText,
  Keyboard
} from 'lucide-react';

interface LiveEventOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  setupData: EventSetupData;
  onOpenSetup: () => void;
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number;
  aiDecision: StructuredAIDecision | null;
  autonomousTelemetry: AutonomousTelemetry;
  isAutonomousActive: boolean;
  onStartAIDJ: () => void;
  onPause: () => void;
  onNext: () => void;
  onStop: () => void;
  onEmergencyStop: () => void;
  eventElapsedSeconds: number;
  tracksPlayed: number;
  outputDevice: string;
  onOutputDeviceChange: (dev: string) => void;
  audioContext?: AudioContext | null;
  onOpenSessionLog?: () => void;
  onOpenShortcuts?: () => void;
}

export const LiveEventOverlay: React.FC<LiveEventOverlayProps> = ({
  isOpen,
  onClose,
  setupData,
  onOpenSetup,
  deckA,
  deckB,
  crossfader,
  aiDecision,
  autonomousTelemetry,
  isAutonomousActive,
  onStartAIDJ,
  onPause,
  onNext,
  onStop,
  onEmergencyStop,
  eventElapsedSeconds,
  tracksPlayed,
  outputDevice,
  onOutputDeviceChange,
  audioContext,
  onOpenSessionLog,
  onOpenShortcuts
}) => {
  const [telemetry, setTelemetry] = useState<SystemHealthMetrics>(() => SystemTelemetryService.getMetrics(audioContext));
  const [emergencyAlertActive, setEmergencyAlertActive] = useState<boolean>(false);

  // Poll system telemetry (CPU & Memory) every 1 second
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTelemetry(SystemTelemetryService.getMetrics(audioContext));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, audioContext]);

  if (!isOpen) return null;

  // Determine currently active deck and track
  const activeDeckId = crossfader <= 0 ? 'A' : 'B';
  const activeDeck = activeDeckId === 'A' ? deckA : deckB;
  const standbyDeck = activeDeckId === 'A' ? deckB : deckA;
  const currentTrack = activeDeck.track;
  const nextTrack = aiDecision?.next_track_details || standbyDeck.track;

  // Energy classifications
  const currentEnergyVal = currentTrack?.energy ?? 0.85;
  const currentEnergyLevel = EnergyManager.getEnergyLevel(currentEnergyVal);
  const currentEnergyColor = EnergyManager.getEnergyColor(currentEnergyLevel);

  const nextEnergyVal = nextTrack?.energy ?? 0.82;
  const nextEnergyLevel = EnergyManager.getEnergyLevel(nextEnergyVal);
  const nextEnergyColor = EnergyManager.getEnergyColor(nextEnergyLevel);

  // Clock formatters
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTrackTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const handleEmergencyTrigger = () => {
    setEmergencyAlertActive(true);
    onEmergencyStop();
  };

  const availableDevices = [
    'Default - Speakers (Realtek(R) Audio)',
    'Headphones (Realtek(R) Audio Output)',
    'USB DJ Controller / External Audio Interface',
    'Virtual Audio Cable / Direct Live Stream'
  ];

  // Set Duration calculations
  const totalDurationSecs = Math.max(1, setupData.durationMinutes * 60);
  const eventProgressPercent = Math.min(100, Math.round((eventElapsedSeconds / totalDurationSecs) * 100));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#04070d',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 20px',
      overflow: 'hidden',
      color: '#f0f4fc',
      fontFamily: 'var(--font-body)'
    }}>
      {/* 1. TOP BAR: LARGE LIVE INDICATOR, EVENT PROFILE, SYSTEM METRICS & EXIT */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'linear-gradient(90deg, #090e18 0%, #111724 50%, #090e18 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Large Pulsing LIVE Indicator & Event Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* LARGE LIVE INDICATOR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: isAutonomousActive || activeDeck.isPlaying 
              ? 'linear-gradient(135deg, #ff1744 0%, #b70024 100%)' 
              : 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 900,
            fontSize: '15px',
            letterSpacing: '1.5px',
            boxShadow: isAutonomousActive || activeDeck.isPlaying ? '0 0 25px rgba(255, 23, 68, 0.6)' : 'none',
            border: isAutonomousActive || activeDeck.isPlaying ? '1px solid #ff5252' : '1px solid var(--border-subtle)'
          }}>
            <span 
              className={isAutonomousActive || activeDeck.isPlaying ? 'animate-danger-pulse' : ''}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#fff',
                display: 'inline-block',
                boxShadow: '0 0 8px #fff'
              }} 
            />
            {isAutonomousActive ? 'LIVE ON AIR • AUTONOMOUS' : activeDeck.isPlaying ? 'LIVE ON AIR • MANUAL' : 'LIVE EVENT STANDBY'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>
                {setupData.eventName}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 229, 255, 0.15)',
                color: 'var(--deck-a-primary)',
                border: '1px solid var(--deck-a-primary)'
              }}>
                {setupData.eventType}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 255, 136, 0.15)',
                color: 'var(--ai-primary)',
                border: '1px solid var(--ai-primary)'
              }}>
                STYLE: {setupData.musicStyle.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Target Set Duration: {setupData.durationMinutes} min • Set Progress: {eventProgressPercent}%
            </div>
          </div>
        </div>

        {/* Center: System Telemetry Strip (AI Health, Audio Health, CPU, Memory, Output Device) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* AI HEALTH */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Activity size={14} color="var(--ai-primary)" />
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)' }}>AI HEALTH</div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ai-primary)' }}>
                {isAutonomousActive ? 'Autonomous State: ' + autonomousTelemetry.state : 'AI Standby'}
              </div>
            </div>
          </div>

          {/* AUDIO HEALTH */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Volume2 size={14} color="var(--deck-a-primary)" />
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)' }}>AUDIO HEALTH</div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#00e5ff' }}>
                DSP 48kHz • Limiter Active
              </div>
            </div>
          </div>

          {/* CPU USAGE */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Cpu size={14} color={telemetry.cpuUsagePercent > 70 ? '#ff1744' : '#00ff88'} />
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)' }}>CPU LOAD</div>
              <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: telemetry.cpuUsagePercent > 70 ? '#ff1744' : '#fff' }}>
                {telemetry.cpuUsagePercent}% DSP
              </div>
            </div>
          </div>

          {/* MEMORY USAGE */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Layers size={14} color="#ff9100" />
            <div>
              <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)' }}>MEMORY</div>
              <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                {telemetry.memoryUsageMb} MB / {telemetry.memoryTotalMb} MB
              </div>
            </div>
          </div>

          {/* OUTPUT DEVICE SELECTOR */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Speaker size={14} color="var(--deck-b-primary)" />
            <select
              value={outputDevice}
              onChange={(e) => onOutputDeviceChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '180px'
              }}
            >
              {availableDevices.map((dev) => (
                <option key={dev} value={dev} style={{ background: '#0e121a' }}>
                  {dev}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Session Log, Setup & Exit Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenSessionLog && (
            <button
              onClick={onOpenSessionLog}
              className="dj-btn"
              style={{
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid var(--deck-a-primary)',
                color: 'var(--deck-a-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Open Live Event Session Log & Safety Diagnostics"
            >
              <FileText size={14} /> EVENT LOG & SAFETY
            </button>
          )}

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="dj-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="DJ Keyboard Shortcuts Reference (? or H)"
            >
              <Keyboard size={14} color="var(--neon-cyan)" /> SHORTCUTS
            </button>
          )}

          <button
            onClick={onOpenSetup}
            className="dj-btn"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Settings size={14} /> SETUP
          </button>

          <button
            onClick={onClose}
            className="dj-btn"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Exit Live Event Fullscreen Mode"
          >
            <Minimize2 size={14} /> EXIT TO CONSOLE
          </button>
        </div>
      </div>

      {/* 2. STATS & EVENT TIMER STRIP (Massive Readout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1fr',
        gap: '14px',
        marginBottom: '14px'
      }}>
        {/* EVENT TIMER */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 20, 32, 0.9) 0%, rgba(8, 12, 18, 0.95) 100%)',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(0, 229, 255, 0.15)',
              color: 'var(--deck-a-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                EVENT ELAPSED TIME
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                {formatTime(eventElapsedSeconds)}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>
              SET PROGRESS
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--deck-a-primary)' }}>
              {eventProgressPercent}% ({setupData.durationMinutes}m)
            </div>
          </div>
        </div>

        {/* TRACKS PLAYED */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 20, 32, 0.9) 0%, rgba(8, 12, 18, 0.95) 100%)',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(255, 0, 127, 0.15)',
            color: 'var(--deck-b-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Disc size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
              TRACKS PLAYED
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#fff' }}>
              {tracksPlayed} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SONGS MIXED</span>
            </div>
          </div>
        </div>

        {/* LIVE STAGE MODE / STATE */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 20, 32, 0.9) 0%, rgba(8, 12, 18, 0.95) 100%)',
          padding: '12px 18px',
          borderRadius: '10px',
          border: isAutonomousActive ? '1px solid var(--ai-primary)' : '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: isAutonomousActive ? '0 0 20px rgba(0, 255, 136, 0.15)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: isAutonomousActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: isAutonomousActive ? 'var(--ai-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                AI DJ STATE MACHINE
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: isAutonomousActive ? 'var(--ai-primary)' : '#fff' }}>
                {autonomousTelemetry.state}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '4px',
            background: isAutonomousActive ? 'var(--ai-primary)' : 'rgba(255,255,255,0.1)',
            color: isAutonomousActive ? '#000' : 'var(--text-muted)'
          }}>
            {isAutonomousActive ? 'AUTONOMOUS ACTIVE' : 'MANUAL CONTROL'}
          </div>
        </div>
      </div>

      {/* 3. MAIN SPLIT SCREEN: CURRENT SONG vs NEXT SONG */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.25fr 1fr',
        gap: '16px',
        flex: 1,
        minHeight: 0
      }}>
        {/* CURRENT SONG PLAYING - MASSIVE VISUAL DISPLAY */}
        <div style={{
          background: 'linear-gradient(145deg, #0d1320 0%, #161e30 100%)',
          borderRadius: '14px',
          border: `2px solid ${activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)'}`,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: `0 0 35px ${activeDeckId === 'A' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 0, 127, 0.2)'}`
        }}>
          {/* Header row */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 900,
                color: activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                CURRENT SONG PLAYING • DECK {activeDeckId}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: activeDeck.isPlaying ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 23, 68, 0.2)',
                color: activeDeck.isPlaying ? '#00ff88' : '#ff3344',
                border: activeDeck.isPlaying ? '1px solid #00ff88' : '1px solid #ff3344'
              }}>
                {activeDeck.isPlaying ? 'PLAYING NOW' : 'PAUSED'}
              </span>
            </div>

            {/* Song Title & Artist */}
            <h1 style={{
              fontSize: '34px',
              fontWeight: 900,
              color: '#fff',
              marginTop: '10px',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentTrack ? currentTrack.title : 'NO TRACK LOADED'}
            </h1>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentTrack ? currentTrack.artist : 'Select a track from library'}
            </h2>
          </div>

          {/* MASSIVE METRICS ROW: BPM, KEY, ENERGY */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px',
            background: 'rgba(4, 7, 12, 0.7)',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            margin: '14px 0'
          }}>
            {/* BPM */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                LIVE BPM
              </div>
              <div style={{
                fontSize: '44px',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: 'var(--deck-a-primary)',
                lineHeight: 1
              }}>
                {activeDeck.bpm.toFixed(1)}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#00e5ff', marginTop: '4px' }}>
                SYNC LOCKED
              </div>
            </div>

            {/* KEY */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                MUSICAL KEY
              </div>
              <div style={{
                fontSize: '44px',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
                lineHeight: 1
              }}>
                {activeDeck.currentKey}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                {currentTrack?.musicalKeyName || 'Harmonic Scale'}
              </div>
            </div>

            {/* ENERGY */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                ENERGY TIER
              </div>
              <div style={{
                fontSize: '44px',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: currentEnergyColor,
                lineHeight: 1
              }}>
                {currentEnergyVal.toFixed(2)}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '3px',
                  background: `${currentEnergyColor}22`,
                  color: currentEnergyColor,
                  border: `1px solid ${currentEnergyColor}`
                }}>
                  {currentEnergyLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Track Playback Timeline & Audio Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>{formatTrackTime(activeDeck.currentTime)}</span>
              <span>{formatTrackTime(activeDeck.duration || 180)}</span>
            </div>

            <div style={{
              width: '100%',
              height: '10px',
              background: '#04060a',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{
                width: `${Math.min(100, (activeDeck.currentTime / Math.max(1, activeDeck.duration)) * 100)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)'}, var(--ai-primary))`,
                boxShadow: `0 0 10px ${activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)'}`
              }} />
            </div>
          </div>
        </div>

        {/* NEXT SONG (UP NEXT IN AUTONOMOUS QUEUE) */}
        <div style={{
          background: 'linear-gradient(145deg, #101624 0%, #1c182c 100%)',
          borderRadius: '14px',
          border: '2px solid var(--deck-b-primary)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 0 35px rgba(255, 0, 127, 0.15)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 900,
                color: 'var(--deck-b-primary)',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                UP NEXT • AUTONOMOUS QUEUE (DECK {standbyDeck.id})
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 900,
                background: 'rgba(0, 255, 136, 0.2)',
                color: 'var(--ai-primary)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--ai-primary)'
              }}>
                MATCH {aiDecision ? aiDecision.match_percent : 96}%
              </span>
            </div>

            {/* Next Track Title & Artist */}
            <h2 style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#fff',
              marginTop: '10px',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {nextTrack ? nextTrack.title : 'AI evaluating library...'}
            </h2>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {nextTrack ? nextTrack.artist : 'Harmonic Key & Energy Matching'}
            </h3>
          </div>

          {/* PLANNED TRANSITION HUD CARD */}
          <div style={{
            background: 'rgba(4, 7, 12, 0.7)',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            margin: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                PLANNED TRANSITION
              </span>
              <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--deck-b-primary)' }}>
                {aiDecision ? `${aiDecision.transition_bars} BARS` : '16 BARS'}
              </span>
            </div>

            <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>
              {aiDecision 
                ? aiDecision.transition_type.toUpperCase().replace('_', ' ') 
                : '16-BAR BEAT-MATCHED CROSSFADE'}
            </div>

            {/* Time / Bars until Transition */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--ai-primary)',
              fontWeight: 800
            }}>
              <span>
                Triggering in: <strong>{autonomousTelemetry.barsUntilTransition} bars</strong> (~{autonomousTelemetry.secondsUntilTransition}s)
              </span>
              <span>Next Energy: <strong style={{ color: nextEnergyColor }}>{nextEnergyVal.toFixed(2)} ({nextEnergyLevel})</strong></span>
            </div>

            {/* Transition Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: '#04060a',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              marginTop: '4px'
            }}>
              <div style={{
                width: `${Math.round(autonomousTelemetry.transitionProgress * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--deck-b-primary) 0%, var(--ai-primary) 100%)',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.6)'
              }} />
            </div>
          </div>

          {/* Quick info row: Target BPM and Harmonic alignment */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Target BPM: <strong style={{ color: '#fff' }}>{nextTrack?.bpm || activeDeck.bpm} BPM</strong></span>
            <span>Key Match: <strong style={{ color: 'var(--ai-primary)' }}>{nextTrack?.key || '--'}</strong> ({nextTrack?.musicalKeyName || 'Harmonic'})</span>
          </div>
        </div>
      </div>

      {/* 4. HUGE LIVE EVENT TRANSPORT & EMERGENCY CONTROLS (Requirements: START AI DJ, PAUSE, NEXT, STOP, EMERGENCY STOP) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1.2fr 1fr 2.5fr',
        gap: '14px',
        marginTop: '14px',
        minHeight: '74px'
      }}>
        {/* 1. START AI DJ */}
        <button
          onClick={onStartAIDJ}
          className={`dj-btn ${isAutonomousActive ? 'glow-ai' : ''}`}
          style={{
            background: isAutonomousActive 
              ? 'linear-gradient(180deg, #00ff88 0%, #009951 100%)' 
              : 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
            color: isAutonomousActive ? '#000' : 'var(--ai-primary)',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 900,
            letterSpacing: '0.5px',
            border: '2px solid var(--ai-primary)',
            boxShadow: isAutonomousActive ? '0 0 25px rgba(0, 255, 136, 0.4)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}
          title="Start Continuous Autonomous Live AI DJ Mode"
        >
          <Play size={22} fill="currentColor" />
          <span>{isAutonomousActive ? 'AI DJ ACTIVE' : 'START AI DJ'}</span>
        </button>

        {/* 2. PAUSE */}
        <button
          onClick={onPause}
          className="dj-btn"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 145, 0, 0.15) 0%, rgba(200, 100, 0, 0.25) 100%)',
            color: '#ff9100',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 900,
            border: '2px solid #ff9100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          title="Pause current audio playback safely"
        >
          <Pause size={20} />
          <span>PAUSE</span>
        </button>

        {/* 3. NEXT */}
        <button
          onClick={onNext}
          className="dj-btn"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 150, 255, 0.25) 100%)',
            color: 'var(--deck-a-primary)',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 900,
            border: '2px solid var(--deck-a-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          title="Force immediate transition to next planned track"
        >
          <FastForward size={20} />
          <span>NEXT</span>
        </button>

        {/* 4. STOP */}
        <button
          onClick={onStop}
          className="dj-btn"
          style={{
            background: 'linear-gradient(180deg, #18202e 0%, #0d121b 100%)',
            color: 'var(--text-secondary)',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 900,
            border: '2px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          title="Stop playback cleanly"
        >
          <Square size={18} fill="currentColor" />
          <span>STOP</span>
        </button>

        {/* 5. EMERGENCY STOP (EXTREMELY OBVIOUS) */}
        <button
          onClick={handleEmergencyTrigger}
          className="dj-btn animate-danger-pulse"
          style={{
            background: 'repeating-linear-gradient(45deg, #b70024, #b70024 15px, #ff1744 15px, #ff1744 30px)',
            color: '#ffffff',
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '1px',
            border: '3px solid #ff5252',
            boxShadow: '0 0 35px rgba(255, 23, 68, 0.8), inset 0 0 15px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)'
          }}
          title="🚨 INSTANT EMERGENCY STOP: Immediate zero-silence mute of both decks and master output"
        >
          <ShieldAlert size={28} />
          <span>EMERGENCY STOP</span>
        </button>
      </div>

      {/* Emergency notification overlay if triggered */}
      {emergencyAlertActive && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 23, 68, 0.95)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 900,
          fontSize: '14px',
          boxShadow: '0 0 40px rgba(255, 23, 68, 0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 10002
        }}>
          <AlertTriangle size={20} />
          <span>EMERGENCY STOP ACTIVATED: ALL AUDIO MUTED & DECKS HALTED</span>
          <button
            onClick={() => setEmergencyAlertActive(false)}
            style={{
              background: '#000',
              border: 'none',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: '12px'
            }}
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
};
