import React from 'react';
import type { DJMode, EventProfile, AIDecision } from '../types/dj';
import { 
  Cpu, 
  Play, 
  Square, 
  FastForward, 
  ShieldAlert 
} from 'lucide-react';

interface AIDecisionCenterProps {
  djMode: DJMode;
  eventProfile: EventProfile;
  aiDecision: AIDecision;
  isAutonomousActive: boolean;
  onDJModeChange: (mode: DJMode) => void;
  onEventProfileChange: (profile: EventProfile) => void;
  onToggleAutonomous: () => void;
  onEmergencyStop: () => void;
  onForceTransition: () => void;
}

export const AIDecisionCenter: React.FC<AIDecisionCenterProps> = ({
  djMode,
  eventProfile,
  aiDecision,
  isAutonomousActive,
  onDJModeChange,
  onEventProfileChange,
  onToggleAutonomous,
  onEmergencyStop,
  onForceTransition
}) => {
  const profiles: EventProfile[] = [
    'Party',
    'EDM',
    'Tamil / Kuthu',
    'High Energy',
    'Chill',
    'Romantic',
    'Custom'
  ];

  const getTransitionLabel = (type: string) => {
    switch (type) {
      case 'beat_match': return '16-Bar Beat-Matched Phrase Mix';
      case 'eq_bass_swap': return 'EQ Bass Swap Transition';
      case 'filter_transition': return 'High-Pass Filter Sweep Transition';
      case 'echo_out': return 'Echo-Out Reverb Drop';
      default: return 'Smooth Harmonic Crossfade';
    }
  };

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        border: isAutonomousActive ? '1px solid var(--ai-primary)' : '1px solid var(--border-medium)',
        background: isAutonomousActive ? 'linear-gradient(180deg, rgba(0, 255, 136, 0.05) 0%, rgba(14, 18, 26, 0.95) 100%)' : undefined,
        boxShadow: isAutonomousActive ? '0 0 24px rgba(0, 255, 136, 0.15)' : undefined
      }}
    >
      {/* Top AI Header & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: isAutonomousActive ? 'var(--ai-primary)' : 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAutonomousActive ? '#000' : 'var(--text-muted)'
          }}>
            <Cpu size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.8px', color: 'var(--text-primary)' }}>
                AI AUTONOMOUS ENGINE
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '3px',
                background: isAutonomousActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.08)',
                color: isAutonomousActive ? 'var(--ai-primary)' : 'var(--text-muted)',
                border: isAutonomousActive ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)'
              }}>
                {isAutonomousActive ? 'ONLINE & ACTIVE' : 'STANDBY'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Deterministic real-time DJ planner & harmonic mixer
            </div>
          </div>
        </div>

        {/* Operating Modes */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          {(['autonomous', 'assist', 'manual'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onDJModeChange(m)}
              className="dj-btn"
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 800,
                background: djMode === m ? (m === 'autonomous' ? 'var(--ai-primary)' : 'var(--deck-a-primary)') : 'transparent',
                color: djMode === m ? '#000' : 'var(--text-secondary)'
              }}
            >
              {m === 'autonomous' ? '⚡ AUTONOMOUS AI' : m === 'assist' ? 'AI ASSIST' : 'MANUAL DJ'}
            </button>
          ))}
        </div>
      </div>

      {/* Event Profile Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          EVENT STYLE:
        </span>
        {profiles.map((p) => (
          <button
            key={p}
            onClick={() => onEventProfileChange(p)}
            className="dj-btn"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: eventProfile === p ? 'var(--bg-card-hover)' : 'var(--bg-surface)',
              color: eventProfile === p ? '#fff' : 'var(--text-secondary)',
              border: eventProfile === p ? '1px solid var(--deck-a-primary)' : '1px solid var(--border-subtle)'
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Main Real-Time AI Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Next Track Recommendation Card */}
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
              NEXT UP (AI SELECTED)
            </span>
            <span style={{ fontSize: '10px', color: 'var(--ai-primary)', fontWeight: 800 }}>
              {Math.round(aiDecision.confidenceScore * 100)}% MATCH SCORE
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {aiDecision.nextTrack ? aiDecision.nextTrack.title : 'Scanning library for optimal track...'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {aiDecision.nextTrack ? aiDecision.nextTrack.artist : 'AI evaluating energy progression'}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span className={`key-badge key-${aiDecision.nextTrack ? parseInt(aiDecision.nextTrack.key) || 1 : 1}`}>
              {aiDecision.nextTrack?.key || '--'}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {aiDecision.targetBpm.toFixed(1)} BPM
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ai-primary)', fontFamily: 'var(--font-mono)' }}>
              ENERGY: {Math.round(aiDecision.targetEnergy * 100)}%
            </span>
          </div>
        </div>

        {/* Transition Execution Strategy Card */}
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
            <span style={{ fontSize: '10px', color: 'var(--deck-a-primary)', fontFamily: 'var(--font-mono)' }}>
              IN {aiDecision.transitionBarsRemaining} BARS
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
            {getTransitionLabel(aiDecision.transitionType)}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {aiDecision.statusMessage}
          </div>

          {/* Transition Progress Bar */}
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: '#141923', 
            borderRadius: '3px', 
            overflow: 'hidden', 
            marginTop: '4px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: `${aiDecision.transitionProgress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--deck-a-primary) 0%, var(--ai-primary) 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Energy Management Gauge */}
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
              CROWD ENERGY CURVE
            </span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ai-primary)' }}>
              TARGET: {Math.round(aiDecision.targetEnergy * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {Math.round(aiDecision.currentEnergy * 100)}%
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {aiDecision.currentEnergy > 0.85 ? 'PEAK INTENSITY' : aiDecision.currentEnergy > 0.65 ? 'HIGH ENERGY' : 'MEDIUM VIBE'}
            </span>
          </div>

          {/* Energy Curve Mini Graph */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '24px', marginTop: '2px' }}>
            {[0.4, 0.55, 0.68, 0.82, 0.95, 0.88, 0.92, 0.85].map((val, idx) => (
              <div 
                key={idx}
                style={{
                  flex: 1,
                  height: `${val * 100}%`,
                  background: idx === 4 ? 'var(--ai-primary)' : 'rgba(255,255,255,0.15)',
                  borderRadius: '2px'
                }}
                title={`Phase ${idx + 1}: ${Math.round(val * 100)}%`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Action Buttons: START AI DJ, FORCE TRANSITION, EMERGENCY STOP */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
        {/* BIG START AI DJ BUTTON */}
        <button
          onClick={onToggleAutonomous}
          className={`dj-btn ${isAutonomousActive ? 'glow-ai' : ''}`}
          style={{
            flex: 2,
            height: '52px',
            background: isAutonomousActive 
              ? 'linear-gradient(180deg, #00ff88 0%, #009951 100%)' 
              : 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
            color: isAutonomousActive ? '#000' : 'var(--ai-primary)',
            border: `2px solid ${isAutonomousActive ? '#00ff88' : 'var(--ai-primary)'}`,
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 900,
            letterSpacing: '1px',
            display: 'flex',
            gap: '8px'
          }}
        >
          {isAutonomousActive ? <Square size={18} fill="#000" /> : <Play size={18} fill="currentColor" />}
          {isAutonomousActive ? 'AUTONOMOUS AI DJ ENGAGED' : 'START AUTONOMOUS AI DJ'}
        </button>

        {/* FORCE TRANSITION / MIX NEXT NOW */}
        <button
          onClick={onForceTransition}
          className="dj-btn"
          style={{
            flex: 1,
            height: '52px',
            background: 'var(--bg-card)',
            color: 'var(--deck-a-primary)',
            border: '1px solid var(--deck-a-primary)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            gap: '6px'
          }}
          title="Force AI to initiate transition immediately"
        >
          <FastForward size={16} /> MIX NEXT NOW
        </button>

        {/* EMERGENCY STOP BUTTON */}
        <button
          onClick={onEmergencyStop}
          className="dj-btn animate-danger-pulse"
          style={{
            flex: 1,
            height: '52px',
            background: 'linear-gradient(180deg, #ff1744 0%, #b70024 100%)',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '0.8px',
            boxShadow: '0 0 16px rgba(255, 23, 68, 0.4)',
            border: '2px solid #ff5252',
            display: 'flex',
            gap: '6px'
          }}
          title="Instant Emergency Stop & Audio Safe Protection"
        >
          <ShieldAlert size={18} /> EMERGENCY STOP
        </button>
      </div>
    </div>
  );
};
