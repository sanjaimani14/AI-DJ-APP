// AI DJ - Automatic DJ Transition Engine HUD (Phase 6)
// Prominently displays:
// CURRENT: Song A
// NEXT: Song B
// TRANSITION: Beat Mix / EQ Bass Swap / Filter / Crossfade / Echo-Out
// BARS: 4 / 8 / 16 / 32 Bars
// BPM: 128 -> 128
// With real-time bar countdown, zero-silence guarantee, and safe fallback indicator.

import React from 'react';
import type { Track } from '../types/dj';
import type { TransitionType, TransitionBars, TransitionTelemetry } from '../audio/transitions';
import { 
  FastForward, 
  Square, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';

interface AutoTransitionPanelProps {
  currentTrack: Track | null;
  nextTrack: Track | null;
  activeDeckId: 'A' | 'B';
  nextDeckId: 'A' | 'B';
  currentBpm: number;
  nextOriginalBpm: number;
  nextSyncedBpm: number;
  selectedType: TransitionType;
  selectedBars: TransitionBars;
  onSelectType: (type: TransitionType) => void;
  onSelectBars: (bars: TransitionBars) => void;
  isTransitioning: boolean;
  telemetry: TransitionTelemetry | null;
  autoTriggerEnabled: boolean;
  onToggleAutoTrigger: () => void;
  onStartTransition: () => void;
  onCancelTransition: () => void;
  fallbackReason: string | null;
}

export const AutoTransitionPanel: React.FC<AutoTransitionPanelProps> = ({
  currentTrack,
  nextTrack,
  activeDeckId,
  nextDeckId,
  currentBpm,
  nextSyncedBpm,
  selectedType,
  selectedBars,
  onSelectType,
  onSelectBars,
  isTransitioning,
  telemetry,
  autoTriggerEnabled,
  onToggleAutoTrigger,
  onStartTransition,
  onCancelTransition,
  fallbackReason
}) => {
  const transitionTypes: { id: TransitionType; label: string; desc: string }[] = [
    { id: 'beat_mix', label: 'Beat Mix', desc: 'Downbeat phase-aligned groove blend' },
    { id: 'eq_bass_swap', label: 'EQ/Bass Swap', desc: 'Clean phrase drop low-end swap' },
    { id: 'smooth_crossfade', label: 'Smooth Crossfade', desc: 'Equal-power constant acoustic blend' },
    { id: 'filter_transition', label: 'Filter Transition', desc: 'High-pass sweep build and release' },
    { id: 'echo_out', label: 'Echo-Out', desc: 'Ambient roll-off & punchy incoming drop' }
  ];

  const barOptions: TransitionBars[] = [4, 8, 16, 32];

  // Calculate duration in seconds for selected bars
  const calculateSeconds = (b: TransitionBars, bpmVal: number) => {
    const validBpm = bpmVal > 0 ? bpmVal : 128;
    return (b * 4 * (60.0 / validBpm)).toFixed(1);
  };

  const getTransitionTitle = (t: TransitionType) => {
    switch (t) {
      case 'beat_mix': return 'Beat Mix';
      case 'eq_bass_swap': return 'EQ/Bass Swap';
      case 'filter_transition': return 'Filter Transition';
      case 'echo_out': return 'Echo-Out';
      case 'smooth_crossfade':
      default: return 'Smooth Crossfade';
    }
  };

  return (
    <div 
      className="glass-panel"
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        border: isTransitioning ? '1px solid var(--ai-primary)' : '1px solid var(--border-medium)',
        background: 'linear-gradient(180deg, rgba(16, 21, 31, 0.96) 0%, rgba(9, 12, 19, 0.98) 100%)',
        boxShadow: isTransitioning ? '0 0 25px rgba(0, 255, 136, 0.2)' : '0 4px 20px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Header / Status Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: isTransitioning ? 'var(--ai-primary)' : 'rgba(0, 229, 255, 0.15)',
            color: isTransitioning ? '#000' : 'var(--deck-a-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--deck-a-primary)'
          }}>
            <FastForward size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.8px', color: '#fff' }}>
                AUTOMATIC DJ TRANSITION ENGINE
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '3px',
                background: isTransitioning ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: isTransitioning ? 'var(--ai-primary)' : 'var(--text-muted)',
                border: isTransitioning ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)'
              }}>
                {isTransitioning ? 'TRANSITION IN PROGRESS' : 'ENGINE READY • PHASE 6'}
              </span>
              {fallbackReason && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'rgba(255, 183, 77, 0.15)',
                  color: '#ffb74d',
                  border: '1px solid #ffb74d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertTriangle size={10} /> SAFE FALLBACK ACTIVE
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Deterministic phrase timing • Zero-silence guarantee • Auto fallback
            </div>
          </div>
        </div>

        {/* Auto Trigger Outro Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleAutoTrigger}
            className="dj-btn"
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: autoTriggerEnabled ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255,255,255,0.06)',
              color: autoTriggerEnabled ? 'var(--ai-primary)' : 'var(--text-muted)',
              border: autoTriggerEnabled ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)'
            }}
            title="Automatically triggers transition when outgoing track reaches outro mix point"
          >
            <ShieldCheck size={14} />
            {autoTriggerEnabled ? 'AUTO-OUTRO: ENABLED' : 'AUTO-OUTRO: OFF'}
          </button>
        </div>
      </div>

      {/* CORE DISPLAY (AS REQUIRED):
          CURRENT: Song A
          NEXT: Song B
          TRANSITION: Beat Mix
          BARS: 16
          BPM: 128 -> 128
      */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px' 
      }}>
        {/* CURRENT TRACK */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          padding: '12px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              CURRENT:
            </span>
            <span style={{ 
              fontSize: '9px', 
              fontWeight: 900, 
              padding: '1px 6px', 
              borderRadius: '3px',
              background: activeDeckId === 'A' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 0, 127, 0.15)',
              color: activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)',
              border: `1px solid ${activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)'}`
            }}>
              DECK {activeDeckId}
            </span>
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 800, 
            color: activeDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {currentTrack ? currentTrack.title : 'No Track Playing'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {currentTrack ? currentTrack.artist : 'Load track onto deck'}
          </div>
        </div>

        {/* NEXT TRACK */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          padding: '12px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              NEXT:
            </span>
            <span style={{ 
              fontSize: '9px', 
              fontWeight: 900, 
              padding: '1px 6px', 
              borderRadius: '3px',
              background: nextDeckId === 'A' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 0, 127, 0.15)',
              color: nextDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)',
              border: `1px solid ${nextDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)'}`
            }}>
              DECK {nextDeckId}
            </span>
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 800, 
            color: nextDeckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {nextTrack ? nextTrack.title : 'Awaiting Next Track'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {nextTrack ? nextTrack.artist : 'Ready to mix in'}
          </div>
        </div>

        {/* TRANSITION TYPE */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          padding: '12px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            TRANSITION:
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>
            {getTransitionTitle(selectedType)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ai-primary)' }}>
            {transitionTypes.find((t) => t.id === selectedType)?.desc}
          </div>
        </div>

        {/* BARS */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          padding: '12px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              BARS:
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              ({calculateSeconds(selectedBars, currentBpm)}s)
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--deck-a-primary)' }}>
            {selectedBars} BARS
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {selectedBars * 4} Total Beats
          </div>
        </div>

        {/* BPM SYNCHRONIZATION */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          padding: '12px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              BPM:
            </span>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--ai-primary)' }}>
              SYNC LOCKED
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#fff' }}>
            {currentBpm.toFixed(1)} → {nextSyncedBpm.toFixed(1)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Zero-drift phase locked
          </div>
        </div>
      </div>

      {/* SELECTORS ROW: Transition Type Buttons & Bars Selector Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px',
        padding: '10px 14px',
        background: 'var(--bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* 1. Transition Type Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            TYPE:
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {transitionTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectType(t.id)}
                disabled={isTransitioning}
                className="dj-btn"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: selectedType === t.id ? 'var(--ai-primary)' : 'rgba(255,255,255,0.06)',
                  color: selectedType === t.id ? '#000' : 'var(--text-secondary)',
                  border: selectedType === t.id ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Bars Selectors: 4, 8, 16, 32 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            LENGTH:
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {barOptions.map((b) => (
              <button
                key={b}
                onClick={() => onSelectBars(b)}
                disabled={isTransitioning}
                className="dj-btn"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  background: selectedBars === b ? 'var(--deck-a-primary)' : 'rgba(255,255,255,0.06)',
                  color: selectedBars === b ? '#000' : 'var(--text-secondary)',
                  border: selectedBars === b ? '1px solid var(--deck-a-primary)' : '1px solid var(--border-subtle)'
                }}
              >
                {b} BARS
              </button>
            ))}
          </div>
        </div>

        {/* 3. Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isTransitioning ? (
            <button
              onClick={onCancelTransition}
              className="dj-btn"
              style={{
                background: '#ff1744',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Square size={14} fill="#fff" /> ABORT TRANSITION
            </button>
          ) : (
            <button
              onClick={onStartTransition}
              className="dj-btn"
              style={{
                background: 'linear-gradient(180deg, #00ff88 0%, #00b359 100%)',
                color: '#000',
                padding: '8px 20px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 16px rgba(0, 255, 136, 0.3)'
              }}
            >
              <FastForward size={14} fill="#000" /> TRIGGER {selectedBars}-BAR {getTransitionTitle(selectedType).toUpperCase()}
            </button>
          )}
        </div>
      </div>

      {/* LIVE PROGRESS & BAR COUNTDOWN OVERLAY DURING TRANSITION */}
      {isTransitioning && telemetry && (
        <div style={{
          background: 'rgba(0, 255, 136, 0.05)',
          padding: '10px 14px',
          borderRadius: '6px',
          border: '1px solid var(--ai-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>
              {telemetry.stepText}
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ai-primary)' }}>
                BAR {telemetry.currentBar} OF {telemetry.totalBars} ({Math.round(telemetry.progress * 100)}%)
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {telemetry.secondsRemaining.toFixed(1)}s left
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '8px', background: '#10151f', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${Math.round(telemetry.progress * 100)}%`, 
                height: '100%', 
                background: telemetry.isFallback 
                  ? 'linear-gradient(90deg, #ffb74d, #ffa726)' 
                  : 'linear-gradient(90deg, var(--deck-a-primary) 0%, var(--ai-primary) 100%)',
                transition: 'width 0.1s linear'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
