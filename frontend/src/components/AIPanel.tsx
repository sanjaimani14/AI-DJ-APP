import React, { useState } from 'react';
import type { DJMode, Track, EventProfile } from '../types/dj';
import type { StructuredAIDecision } from '../services/aiPlannerService';
import type { TransitionType, TransitionBars } from '../audio/transitions';
import type { AutonomousState } from '../audio/AutonomousDJEngine';
import { 
  Cpu, 
  Sparkles, 
  Code, 
  Copy, 
  Check, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Square, 
  FastForward, 
  Radio, 
  Disc3 
} from 'lucide-react';

interface AIPanelProps {
  aiStatus: string;
  currentTrack: Track | null;
  nextTrack: Track | null;
  currentBpm: number;
  currentKey: string;
  energyPercent: number;
  transitionStatus: string;
  transitionProgress?: number;
  isTransitioning?: boolean;
  onStartTransition?: (type: TransitionType, bars?: TransitionBars) => void;
  onCancelTransition?: () => void;
  aiMode: DJMode;
  onAIModeChange: (mode: DJMode) => void;

  // PHASE 7 STRUCTURED AI DECISION PROPS
  decision?: StructuredAIDecision | null;
  eventProfile?: EventProfile;
  onEventProfileChange?: (profile: EventProfile) => void;
  onApplyDecision?: (decision: StructuredAIDecision) => void;
  onReplan?: () => void;

  // PHASE 8 AUTONOMOUS AI DJ PROPS
  autonomousState?: AutonomousState;
  isAutonomousActive?: boolean;
  onToggleAutonomous?: () => void;
  onForceAutonomousTransition?: () => void;
  secondsUntilTransition?: number;
  barsUntilTransition?: number;
  autonomousMixCount?: number;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  aiStatus: _aiStatus,
  currentTrack,
  nextTrack,
  currentBpm,
  currentKey: _currentKey,
  energyPercent,
  transitionStatus: _transitionStatus,
  transitionProgress = 0,
  isTransitioning = false,
  onStartTransition,
  onCancelTransition,
  aiMode,
  onAIModeChange,
  decision,
  eventProfile = 'Party',
  onEventProfileChange,
  onApplyDecision,
  onReplan,
  autonomousState = 'IDLE',
  isAutonomousActive = false,
  onToggleAutonomous,
  onForceAutonomousTransition,
  secondsUntilTransition = 0,
  barsUntilTransition = 0,
  autonomousMixCount = 0
}) => {
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const profiles: EventProfile[] = [
    'Party',
    'High Energy',
    'EDM',
    'Tamil / Kuthu',
    'Chill',
    'Romantic',
    'Custom'
  ];

  const getTransitionLabel = (type: string) => {
    switch (type) {
      case 'eq_bass_swap': return 'EQ Bass Swap (Phase Inverted)';
      case 'filter_transition': return 'High-Pass Resonant Filter Sweep';
      case 'beat_mix':
      case 'beat_match': return '16-Bar Beat-Matched Phrase Mix';
      case 'echo_out': return 'Echo-Out Reverb Tail Drop';
      case 'smooth_crossfade':
      default: return 'Smooth Equal-Power Crossfade';
    }
  };

  // Structured root format required by user prompt
  const structuredJsonFormat = decision ? {
    next_track: decision.next_track,
    transition_type: decision.transition_type,
    transition_bars: decision.transition_bars,
    target_bpm: decision.target_bpm,
    target_energy: decision.target_energy
  } : {
    next_track: nextTrack ? nextTrack.title : 'Scanning library...',
    transition_type: 'smooth_crossfade',
    transition_bars: 16,
    target_bpm: Math.round(currentBpm),
    target_energy: 0.82
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(decision || structuredJsonFormat, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div 
      className="glass-panel"
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: isAutonomousActive ? '1px solid var(--ai-primary)' : '1px solid rgba(0, 255, 136, 0.25)',
        background: isAutonomousActive
          ? 'linear-gradient(180deg, rgba(0, 255, 136, 0.05) 0%, rgba(9, 13, 20, 0.99) 100%)'
          : 'linear-gradient(180deg, rgba(14, 20, 30, 0.97) 0%, rgba(9, 13, 20, 0.99) 100%)',
        boxShadow: isAutonomousActive
          ? '0 0 28px rgba(0, 255, 136, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          : '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* 1. TOP HEADER & OPERATING MODE SELECTOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: isAutonomousActive 
              ? 'linear-gradient(135deg, var(--ai-primary) 0%, #00b359 100%)' 
              : 'var(--bg-surface)',
            color: isAutonomousActive ? '#000' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isAutonomousActive ? '0 0 20px rgba(0, 255, 136, 0.5)' : 'none'
          }}>
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '1px', color: '#fff' }}>
                PHASE 8 — FULL AUTONOMOUS AI DJ
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: isAutonomousActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: isAutonomousActive ? 'var(--ai-primary)' : 'var(--text-muted)',
                border: isAutonomousActive ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)',
                letterSpacing: '0.6px'
              }}>
                {isAutonomousActive ? `AUTONOMOUS AI DJ ACTIVE • MIX #${autonomousMixCount}` : 'AI STANDBY'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Non-blocking continuous state machine • Zero audience silence • Library ➔ Analysis ➔ AI Planner ➔ Transition ➔ Audio Engine
            </div>
          </div>
        </div>

        {/* Action Controls & AI Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* BIG TOGGLE AUTONOMOUS BUTTON */}
          {onToggleAutonomous && (
            <button
              onClick={onToggleAutonomous}
              className={`dj-btn ${isAutonomousActive ? 'glow-ai' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.5px',
                background: isAutonomousActive 
                  ? 'linear-gradient(180deg, #00ff88 0%, #009951 100%)' 
                  : 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
                color: isAutonomousActive ? '#000' : 'var(--ai-primary)',
                border: `2px solid ${isAutonomousActive ? '#00ff88' : 'var(--ai-primary)'}`,
                borderRadius: '6px',
                boxShadow: isAutonomousActive ? '0 0 16px rgba(0, 255, 136, 0.4)' : 'none'
              }}
              title="Toggle Full Autonomous AI DJ Mode (Plays, Prepares, Transitions indefinitely)"
            >
              {isAutonomousActive ? <Square size={13} fill="#000" /> : <Play size={13} fill="currentColor" />}
              {isAutonomousActive ? 'STOP AUTONOMOUS AI DJ' : 'START AUTONOMOUS AI DJ'}
            </button>
          )}

          {/* FORCE TRANSITION / MIX NEXT NOW */}
          {onForceAutonomousTransition && (
            <button
              onClick={onForceAutonomousTransition}
              disabled={autonomousState === 'TRANSITIONING'}
              className="dj-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                fontSize: '11px',
                fontWeight: 800,
                background: 'var(--bg-surface)',
                color: 'var(--deck-a-primary)',
                border: '1px solid var(--deck-a-primary)',
                borderRadius: '6px'
              }}
              title="Trigger the next planned transition immediately"
            >
              <FastForward size={14} />
              MIX NEXT NOW
            </button>
          )}

          {onReplan && (
            <button
              onClick={onReplan}
              className="dj-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                fontSize: '11px',
                fontWeight: 800,
                background: 'var(--bg-surface)',
                color: 'var(--ai-primary)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px'
              }}
              title="Force deterministic re-evaluation of all candidate tracks"
            >
              <RefreshCw size={12} />
              RE-PLAN
            </button>
          )}

          {/* Operating Mode Selector */}
          <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            {(['autonomous', 'assist', 'manual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onAIModeChange(m)}
                className="dj-btn"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: aiMode === m ? (m === 'autonomous' ? 'var(--ai-primary)' : 'var(--deck-a-primary)') : 'transparent',
                  color: aiMode === m ? '#000' : 'var(--text-secondary)'
                }}
              >
                {m === 'autonomous' ? '⚡ AUTO' : m === 'assist' ? 'ASSIST' : 'MANUAL'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CONTINUOUS AUTONOMOUS STATE MACHINE HUD */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '10px 14px',
        borderRadius: '8px',
        border: isAutonomousActive ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color={isAutonomousActive ? 'var(--ai-primary)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.8px', color: '#fff' }}>
              AUTONOMOUS CONTINUOUS STATE MACHINE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAutonomousActive && (
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: autonomousState === 'TRANSITIONING' ? '#ffd700' : 'var(--ai-primary)',
                fontWeight: 900
              }}>
                {autonomousState === 'TRANSITIONING' 
                  ? '🔥 BLENDING AUDIO: TRANSITION ACTIVE' 
                  : `⏳ MIX TRIGGER IN ${secondsUntilTransition.toFixed(1)}s (${barsUntilTransition} BARS)`}
              </span>
            )}
          </div>
        </div>

        {/* 5-Step Continuous State Pipeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', padding: '2px 0' }}>
          {[
            { id: 'IDLE', label: 'IDLE', desc: 'Standby' },
            { id: 'PLAYING', label: 'PLAYING', desc: 'Monitoring Playback' },
            { id: 'PREPARING_NEXT', label: 'PREPARING_NEXT', desc: 'Pre-cue & Sync' },
            { id: 'TRANSITIONING', label: 'TRANSITIONING', desc: 'Executing Blend' },
            { id: 'PLAYING_NEXT', label: 'PLAYING_NEXT', desc: 'Handover Loop' }
          ].map((s, idx, arr) => {
            const isCurrent = autonomousState === s.id;
            return (
              <React.Fragment key={s.id}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: isCurrent ? 'rgba(0, 255, 136, 0.2)' : 'var(--bg-surface)',
                  border: isCurrent ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)',
                  color: isCurrent ? 'var(--ai-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '105px',
                  boxShadow: isCurrent ? '0 0 14px rgba(0, 255, 136, 0.35)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isCurrent && <Disc3 size={11} className="animate-spin" />}
                    <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.6px' }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: '8px', color: isCurrent ? '#fff' : 'var(--text-muted)' }}>{s.desc}</span>
                </div>
                {idx < arr.length - 1 && (
                  <span style={{ color: isCurrent ? 'var(--ai-primary)' : 'var(--text-muted)', fontSize: '12px' }}>➔</span>
                )}
                {idx === arr.length - 1 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }} title="Loops continuously indefinitely">↺</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. EVENT STYLE SELECTOR PILLS */}
      {onEventProfileChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} color="var(--ai-primary)" /> EVENT STYLE:
          </span>
          {profiles.map((p) => {
            const isSelected = eventProfile === p;
            return (
              <button
                key={p}
                onClick={() => onEventProfileChange(p)}
                className="dj-btn"
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: isSelected ? 'rgba(0, 255, 136, 0.2)' : 'var(--bg-surface)',
                  color: isSelected ? 'var(--ai-primary)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease'
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. MAIN AI DECISION TELEMETRY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Card 1: Currently Playing Track Info */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              CURRENT TRACK (PLAYING)
            </span>
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: 'var(--deck-a-primary)'
            }}>
              {decision?.active_deck ? `DECK ${decision.active_deck}` : 'ACTIVE DECK'}
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack ? currentTrack.title : 'No track loaded'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {currentTrack ? currentTrack.artist : 'Playback idle'}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span className={`key-badge key-${currentTrack ? parseInt(currentTrack.key) || 1 : 1}`}>
              {currentTrack?.key || '--'}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {currentBpm.toFixed(1)} BPM
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ENERGY: {Math.round(energyPercent)}%
            </span>
          </div>
        </div>

        {/* Card 2: AI Selected Next Track & Compatibility Score */}
        <div style={{
          background: 'rgba(0, 255, 136, 0.04)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 136, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ai-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> NEXT TRACK (AI PREPARED)
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              color: 'var(--ai-primary)',
              background: 'rgba(0, 255, 136, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(0, 255, 136, 0.4)'
            }}>
              {decision ? `${decision.match_percent}% MATCH` : '88% MATCH'}
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {decision ? decision.next_track : (nextTrack ? nextTrack.title : 'Evaluating next candidate...')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {decision?.next_track_details?.artist || nextTrack?.artist || 'AI evaluating Camelot & energy curves'}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span className={`key-badge key-${decision?.next_track_details ? parseInt(decision.next_track_details.key) || 1 : 1}`}>
              {decision?.next_track_details?.key || nextTrack?.key || '--'}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              TARGET: {decision ? decision.target_bpm.toFixed(1) : currentBpm.toFixed(1)} BPM
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ai-primary)', fontFamily: 'var(--font-mono)' }}>
              ENERGY: {decision ? Math.round(decision.target_energy * 100) : 82}%
            </span>
          </div>
        </div>

        {/* Card 3: Transition Strategy & Timing */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              TRANSITION STRATEGY
            </span>
            <span style={{ fontSize: '10px', color: 'var(--deck-b-primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
              {decision ? `${decision.transition_bars} BARS` : '16 BARS'}
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
            {getTransitionLabel(decision?.transition_type || 'eq_bass_swap')}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {decision?.transition_timing ? (
              <span>Start at <strong>{decision.transition_timing.mix_out_start_seconds}s</strong> • Duration: <strong>{decision.transition_timing.transition_duration_seconds}s</strong></span>
            ) : (
              <span>Automated phrase alignment on upcoming outro</span>
            )}
          </div>

          {/* Transition Progress Bar */}
          <div style={{ width: '100%', height: '5px', background: '#192230', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${Math.round(transitionProgress * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--deck-a-primary) 0%, var(--ai-primary) 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Card 4: Compatibility Scoring Matrix */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              SCORING BREAKDOWN
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              COMPATIBILITY
            </span>
          </div>

          {decision?.score_breakdown ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Camelot Key:</span>
                <span style={{ color: 'var(--ai-primary)', fontWeight: 800 }}>{Math.round(decision.score_breakdown.key_compatibility * 100)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>BPM Alignment:</span>
                <span style={{ color: '#fff', fontWeight: 800 }}>{Math.round(decision.score_breakdown.bpm_compatibility * 100)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Energy Match:</span>
                <span style={{ color: '#fff', fontWeight: 800 }}>{Math.round(decision.score_breakdown.energy_compatibility * 100)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Genre Flow:</span>
                <span style={{ color: '#fff', fontWeight: 800 }}>{Math.round(decision.score_breakdown.genre_compatibility * 100)}%</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Deterministic scoring ready. Select track to inspect matrix.
            </div>
          )}
        </div>
      </div>

      {/* 5. AI REASONING EXPLANATION LOG */}
      {decision?.reasoning && decision.reasoning.length > 0 && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '10px 14px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ai-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={12} /> AI DECISION RATIONALE:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {decision.reasoning.map((r, idx) => (
              <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--ai-primary)', fontSize: '12px' }}>•</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. STRUCTURED AI DECISION JSON INSPECTOR (MODAL / COLLAPSIBLE) */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '6px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden'
      }}>
        <div 
          onClick={() => setShowJsonInspector((prev) => !prev)}
          style={{
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={14} color="var(--ai-primary)" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>
              STRUCTURED AI DECISION FORMAT JSON (PHASE 7 & 8 PROTOCOL)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {showJsonInspector ? 'Hide Schema' : 'Inspect JSON Schema'}
            </span>
            {showJsonInspector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {showJsonInspector && (
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', background: '#0a0d14' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Deterministic output strictly adhering to prompt specification:
              </span>
              <button
                onClick={handleCopyJson}
                className="dj-btn"
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: copiedJson ? 'var(--ai-primary)' : 'var(--bg-surface)',
                  color: copiedJson ? '#000' : 'var(--text-secondary)'
                }}
              >
                {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                {copiedJson ? 'COPIED!' : 'COPY JSON'}
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '10px',
              borderRadius: '4px',
              background: '#05070a',
              color: '#00ff88',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              overflowX: 'auto',
              border: '1px solid var(--border-subtle)'
            }}>
              {JSON.stringify(structuredJsonFormat, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 7. QUICK ACTION BUTTONS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '2px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {decision && onApplyDecision && (
            <button
              onClick={() => onApplyDecision(decision)}
              className="dj-btn glow-ai"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 179, 89, 0.3) 100%)',
                color: 'var(--ai-primary)',
                border: '1px solid var(--ai-primary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Load AI recommended track onto standby deck & sync parameters"
            >
              <CheckCircle2 size={14} />
              LOAD NEXT TRACK TO DECK {decision.next_deck}
            </button>
          )}

          {decision && onStartTransition && (
            <button
              onClick={() => onStartTransition(decision.transition_type, decision.transition_bars)}
              disabled={isTransitioning}
              className="dj-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 150, 255, 0.3) 100%)',
                color: 'var(--deck-a-primary)',
                border: '1px solid var(--deck-a-primary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Execute planned transition now"
            >
              <Zap size={14} />
              EXECUTE {decision.transition_bars}-BAR {decision.transition_type.toUpperCase()}
            </button>
          )}
        </div>

        {isTransitioning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
            <span style={{ fontSize: '10px', color: 'var(--ai-primary)', fontWeight: 800 }}>
              MIXING: {Math.round(transitionProgress * 100)}%
            </span>
            <button
              onClick={onCancelTransition}
              className="dj-btn"
              style={{
                background: '#ff1744',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 800
              }}
            >
              ABORT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
