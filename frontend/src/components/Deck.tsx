import React, { useState } from 'react';
import type { DeckState } from '../types/dj';
import { 
  Play, 
  Pause, 
  Square, 
  Disc,
  Repeat, 
  Lock, 
  Unlock, 
  ChevronsLeft, 
  ChevronsRight
} from 'lucide-react';
import { DeckOverviewWaveform } from './DeckOverviewWaveform';

interface DeckProps {
  deck: DeckState;
  onPlayPause: () => void;
  onStop: () => void;
  onCue: () => void;
  onSeek: (timeSeconds: number) => void;
  onSync: () => void;
  onPitchChange: (pitchPercent: number) => void;
  onPitchBend: (direction: number) => void;
  onLoopToggle: () => void;
  onLoopLengthChange: (length: number) => void;
  onHotCue: (index: number) => void;
  onToggleKeyLock: () => void;
}

export const Deck: React.FC<DeckProps> = ({
  deck,
  onPlayPause,
  onStop,
  onCue,
  onSeek,
  onSync,
  onPitchChange,
  onPitchBend,
  onLoopToggle,
  onLoopLengthChange,
  onHotCue,
  onToggleKeyLock
}) => {
  const isA = deck.id === 'A';
  const primaryColor = isA ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)';
  const [showRemaining, setShowRemaining] = useState(false);

  // Time format MM:SS.ms
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00.00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const remainingTime = Math.max(0, deck.duration - deck.currentTime);
  const timeDisplay = showRemaining ? `-${formatTime(remainingTime)}` : formatTime(deck.currentTime);

  const loopSizes = [0.25, 0.5, 1, 2, 4, 8, 16];

  return (
    <div 
      className="glass-panel" 
      style={{ 
        flex: 1, 
        padding: '14px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        borderTop: `3px solid ${primaryColor}`,
        position: 'relative'
      }}
    >
      {/* 1. Track Title & Artist & Time Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              background: primaryColor, 
              color: '#000', 
              fontWeight: 900, 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '4px',
              fontFamily: 'var(--font-display)'
            }}>
              DECK {deck.id}
            </span>
            <span style={{ 
              fontSize: '10px', 
              color: 'var(--text-muted)', 
              fontWeight: 700, 
              textTransform: 'uppercase' 
            }}>
              {deck.track ? deck.track.format || 'AUDIO' : 'EMPTY DECK'}
            </span>
          </div>

          <h2 style={{ 
            fontSize: '16px', 
            fontWeight: 800, 
            marginTop: '4px', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            maxWidth: '280px',
            color: deck.track ? '#fff' : 'var(--text-muted)'
          }}>
            {deck.track ? deck.track.title : 'No Track Loaded'}
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {deck.track ? deck.track.artist : 'Select track below and click LOAD'}
          </div>
        </div>

        {/* Time, Key, BPM placeholders */}
        <div style={{ textAlign: 'right' }}>
          <div 
            onClick={() => setShowRemaining(!showRemaining)}
            style={{ 
              fontSize: '22px', 
              fontWeight: 800, 
              fontFamily: 'var(--font-mono)', 
              color: deck.isPlaying ? primaryColor : 'var(--text-primary)',
              cursor: 'pointer',
              letterSpacing: '1px'
            }}
            title="Click to toggle Elapsed / Remaining"
          >
            {deck.track ? timeDisplay : '00:00.00'}
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px' }}>
            <span 
              className={`key-badge ${deck.track ? `key-${parseInt(deck.track.key) || 1}` : ''}`}
              style={!deck.track ? { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' } : undefined}
              title="Musical Key (Camelot notation)"
            >
              KEY: {deck.track ? deck.currentKey : '--'}
            </span>
            <button 
              onClick={onToggleKeyLock}
              className="dj-btn"
              style={{
                background: deck.isKeyLocked ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.06)',
                color: deck.isKeyLocked ? primaryColor : 'var(--text-muted)',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '9px'
              }}
              title="Master Tempo / Key Lock"
            >
              {deck.isKeyLocked ? <Lock size={10} /> : <Unlock size={10} />} MT
            </button>
          </div>
        </div>
      </div>

      {/* 2. TRACK OVERVIEW WAVEFORM WITH DOWNBEATS, INTRO/OUTRO & HOT CUES */}
      <DeckOverviewWaveform 
        deck={deck} 
        primaryColor={primaryColor} 
        onSeek={onSeek} 
      />

      {/* 3. Platter & BPM / Tempo Section */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Jog Wheel Platter */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            style={{
              width: '136px',
              height: '136px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #18202d 0%, #0d121b 55%, #05070a 100%)',
              border: `3px solid #232c3d`,
              boxShadow: deck.isPlaying ? `0 0 16px ${isA ? 'var(--deck-a-glow)' : 'var(--deck-b-glow)'}` : '0 4px 10px rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              position: 'relative'
            }}
          >
            {/* Center Label */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primaryColor} 0%, #000000 90%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 900
            }}>
              <Disc size={16} color="#fff" />
              <span>{deck.id}</span>
            </div>
            {/* Platter Marker */}
            <div style={{
              position: 'absolute',
              top: '4px',
              width: '3px',
              height: '12px',
              background: '#ffffff',
              borderRadius: '2px',
              boxShadow: '0 0 4px #ffffff',
              transform: `rotate(${deck.platterRotation}deg)`,
              transformOrigin: '50% 64px'
            }} />
          </div>
        </div>

        {/* Center Deck Metrics & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {/* BPM display */}
          <div style={{ 
            background: 'var(--bg-surface)', 
            padding: '6px 10px', 
            borderRadius: '6px', 
            border: '1px solid var(--border-medium)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>TRACK BPM</div>
              <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {deck.track && deck.track.bpm !== null ? deck.track.bpm.toFixed(1) : '---.-'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '8px', color: primaryColor, fontWeight: 700 }}>ACTIVE BPM</div>
              <div style={{ 
                fontSize: '18px', 
                fontFamily: 'var(--font-mono)', 
                fontWeight: 800, 
                color: primaryColor,
                lineHeight: 1
              }}>
                {deck.track ? deck.bpm.toFixed(2) : '---.--'}
              </div>
            </div>
          </div>

          {/* Pitch Bend / Nudge */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => onPitchBend(-1)}
              className="dj-btn"
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '9px'
              }}
              title="Pitch Bend Nudge -"
            >
              <ChevronsLeft size={12} /> NUDGE -
            </button>
            <button 
              onClick={() => onPitchBend(1)}
              className="dj-btn"
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '9px'
              }}
              title="Pitch Bend Nudge +"
            >
              NUDGE + <ChevronsRight size={12} />
            </button>
          </div>

          {/* Loop Controls */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                LOOP CONTROLS
              </span>
              <button 
                onClick={onLoopToggle}
                className="dj-btn"
                style={{
                  background: deck.loopActive ? primaryColor : 'var(--bg-surface)',
                  color: deck.loopActive ? '#000' : 'var(--text-secondary)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '8px',
                  fontWeight: 800
                }}
              >
                <Repeat size={9} style={{ marginRight: '3px' }} />
                {deck.loopActive ? 'LOOP ON' : 'LOOP OFF'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {loopSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => onLoopLengthChange(size)}
                  className="dj-btn"
                  style={{
                    background: deck.loopLength === size && deck.loopActive ? primaryColor : 'var(--bg-card)',
                    color: deck.loopLength === size && deck.loopActive ? '#000' : 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '3px 0',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {size >= 1 ? `${size}` : `1/${Math.round(1 / size)}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pitch Slider (Tempo Fader) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {deck.pitchPercent >= 0 ? `+${deck.pitchPercent.toFixed(1)}%` : `${deck.pitchPercent.toFixed(1)}%`}
          </div>
          <div 
            style={{ 
              width: '8px', 
              height: '110px', 
              background: '#090c12', 
              borderRadius: '4px', 
              border: '1px solid #1e2634',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ position: 'absolute', top: '50%', width: '12px', height: '1px', background: 'rgba(255,255,255,0.4)' }} />
            <input 
              type="range" 
              min="-8" 
              max="8" 
              step="0.05"
              value={deck.pitchPercent}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              style={{
                position: 'absolute',
                width: '110px',
                height: '24px',
                transform: 'rotate(-90deg)',
                opacity: 0,
                cursor: 'ns-resize'
              }}
              title="Tempo / Pitch Fader (+/- 8%)"
            />
            <div 
              style={{
                position: 'absolute',
                width: '24px',
                height: '12px',
                background: 'linear-gradient(180deg, #445368 0%, #1e2531 100%)',
                border: '1px solid #5a6e8c',
                borderRadius: '3px',
                top: `${((8 - deck.pitchPercent) / 16) * 98}px`,
                pointerEvents: 'none'
              }}
            />
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>TEMPO</div>
        </div>
      </div>

      {/* Hot Cues Pads (1-8) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            HOT CUE PADS (CLICK TO SET / JUMP)
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const hasCue = deck.hotCues[num - 1] !== null;
            return (
              <button
                key={num}
                onClick={() => onHotCue(num - 1)}
                className="dj-btn"
                style={{
                  height: '24px',
                  background: hasCue ? primaryColor : 'var(--bg-surface)',
                  color: hasCue ? '#000' : 'var(--text-muted)',
                  border: `1px solid ${hasCue ? primaryColor : 'var(--border-subtle)'}`,
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)'
                }}
                title={hasCue ? `Jump to Cue ${num} (${formatTime(deck.hotCues[num - 1]!)})` : `Set Cue ${num}`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Transport Controls: SYNC, CUE, STOP, PLAY/PAUSE */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button
          onClick={onSync}
          className="dj-btn"
          style={{
            flex: 0.9,
            height: '42px',
            background: deck.isSynced ? primaryColor : 'var(--bg-surface)',
            color: deck.isSynced ? '#000' : 'var(--text-primary)',
            border: `1px solid ${deck.isSynced ? primaryColor : 'var(--border-medium)'}`,
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800
          }}
          title="Beat & Tempo Sync"
        >
          SYNC
        </button>

        <button
          onClick={onCue}
          className="dj-btn"
          style={{
            flex: 1.1,
            height: '42px',
            background: 'linear-gradient(180deg, #ff9100 0%, #b26500 100%)',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 900,
            boxShadow: '0 0 10px rgba(255, 145, 0, 0.4)'
          }}
          title="Cue (Return to cue point)"
        >
          CUE
        </button>

        <button
          onClick={onStop}
          className="dj-btn"
          style={{
            flex: 1,
            height: '42px',
            background: 'var(--bg-card)',
            color: '#ff5252',
            border: '1px solid rgba(255, 82, 82, 0.4)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            gap: '4px'
          }}
          title="Stop playback and rewind to start"
        >
          <Square size={13} fill="currentColor" /> STOP
        </button>

        <button
          onClick={onPlayPause}
          className="dj-btn"
          style={{
            flex: 1.6,
            height: '42px',
            background: deck.isPlaying 
              ? 'linear-gradient(180deg, #00e676 0%, #009647 100%)' 
              : 'linear-gradient(180deg, #2a3444 0%, #151b24 100%)',
            color: deck.isPlaying ? '#000' : '#ffffff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '1px',
            boxShadow: deck.isPlaying ? '0 0 14px rgba(0, 230, 118, 0.5)' : 'none',
            display: 'flex',
            gap: '6px'
          }}
        >
          {deck.isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          {deck.isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
      </div>
    </div>
  );
};
