import React from 'react';
import type { DeckState } from '../types/dj';
import { Knob } from './Knob';
import { VUMeter } from './VUMeter';
import { Headphones, Volume2 } from 'lucide-react';

interface MixerProps {
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number; // -1.0 (full Deck A) to +1.0 (full Deck B)
  crossfaderCurve: 'smooth' | 'linear' | 'cut';
  masterVolume: number; // 0 to 1
  onVolumeChangeA: (val: number) => void;
  onVolumeChangeB: (val: number) => void;
  onEqChangeA: (band: 'high' | 'mid' | 'low', val: number) => void;
  onEqChangeB: (band: 'high' | 'mid' | 'low', val: number) => void;
  onFilterChangeA: (val: number) => void;
  onFilterChangeB: (val: number) => void;
  onGainChangeA: (val: number) => void;
  onGainChangeB: (val: number) => void;
  onCrossfaderChange: (val: number) => void;
  onCrossfaderCurveChange: (curve: 'smooth' | 'linear' | 'cut') => void;
  onMasterVolumeChange: (val: number) => void;
}

export const Mixer: React.FC<MixerProps> = ({
  deckA,
  deckB,
  crossfader,
  crossfaderCurve,
  masterVolume,
  onVolumeChangeA,
  onVolumeChangeB,
  onEqChangeA,
  onEqChangeB,
  onFilterChangeA,
  onFilterChangeB,
  onGainChangeA,
  onGainChangeB,
  onCrossfaderChange,
  onCrossfaderCurveChange,
  onMasterVolumeChange
}) => {
  // Master VU level composite
  const masterLeft = Math.min(1.0, (deckA.vuMeterLeft * (1 - Math.max(0, crossfader)) + deckB.vuMeterLeft * (1 + Math.min(0, crossfader))) * masterVolume);
  const masterRight = Math.min(1.0, (deckA.vuMeterRight * (1 - Math.max(0, crossfader)) + deckB.vuMeterRight * (1 + Math.min(0, crossfader))) * masterVolume);

  return (
    <div 
      className="glass-panel"
      style={{ 
        width: '320px', 
        padding: '16px 12px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        border: '1px solid var(--border-medium)',
        background: 'linear-gradient(180deg, #10151f 0%, #090c13 100%)'
      }}
    >
      {/* Master Section Top Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-surface)', 
        padding: '8px 12px', 
        borderRadius: '6px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Volume2 size={16} color="var(--ai-primary)" />
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>MASTER OUT</span>
        </div>

        {/* Master Output VU Meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <VUMeter levelLeft={masterLeft} levelRight={masterRight} height={32} segments={8} />
          <Knob 
            value={parseFloat((masterVolume * 10).toFixed(1))}
            min={0}
            max={10}
            defaultValue={8}
            label="MASTER"
            size={36}
            accentColor="var(--ai-primary)"
            onChange={(v) => onMasterVolumeChange(v / 10)}
          />
        </div>
      </div>

      {/* 2-Channel EQ & Filter Strips */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {/* Channel A Strip */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--deck-a-primary)' }}>CH 1</span>
          
          <Knob 
            value={deckA.gain} 
            min={0} 
            max={2} 
            defaultValue={1.0}
            label="GAIN" 
            size={34} 
            accentColor="var(--deck-a-primary)"
            onChange={onGainChangeA} 
          />
          <Knob 
            value={deckA.eqHigh} 
            min={-26} 
            max={6} 
            defaultValue={0}
            label="HI" 
            unit="dB" 
            size={34} 
            accentColor="var(--deck-a-primary)"
            onChange={(v) => onEqChangeA('high', v)} 
          />
          <Knob 
            value={deckA.eqMid} 
            min={-26} 
            max={6} 
            defaultValue={0}
            label="MID" 
            unit="dB" 
            size={34} 
            accentColor="var(--deck-a-primary)"
            onChange={(v) => onEqChangeA('mid', v)} 
          />
          <Knob 
            value={deckA.eqLow} 
            min={-26} 
            max={6} 
            defaultValue={0}
            label="LOW" 
            unit="dB" 
            size={34} 
            accentColor="var(--deck-a-primary)"
            onChange={(v) => onEqChangeA('low', v)} 
          />
          <Knob 
            value={deckA.filter} 
            min={-1} 
            max={1} 
            defaultValue={0}
            label="FILTER" 
            size={34} 
            accentColor="var(--deck-a-primary)"
            onChange={onFilterChangeA} 
          />
        </div>

        {/* Center Level Meters & Indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
            <VUMeter levelLeft={deckA.vuMeterLeft} levelRight={deckA.vuMeterRight} height={150} />
            <VUMeter levelLeft={deckB.vuMeterLeft} levelRight={deckB.vuMeterRight} height={150} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              className="dj-btn"
              style={{
                background: 'rgba(0, 229, 255, 0.15)',
                color: 'var(--deck-a-primary)',
                padding: '4px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                border: '1px solid var(--deck-a-primary)'
              }}
              title="Cue / Headphone Monitor Deck A"
            >
              <Headphones size={12} /> CUE
            </button>
            <button
              className="dj-btn"
              style={{
                background: 'rgba(255, 0, 127, 0.15)',
                color: 'var(--deck-b-primary)',
                padding: '4px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                border: '1px solid var(--deck-b-primary)'
              }}
              title="Cue / Headphone Monitor Deck B"
            >
              <Headphones size={12} /> CUE
            </button>
          </div>
        </div>

        {/* Channel B Strip */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--deck-b-primary)' }}>CH 2</span>
          
          <Knob 
            value={deckB.gain} 
            min={0} 
            max={2} 
            defaultValue={1.0}
            label="GAIN" 
            size={34} 
            accentColor="var(--deck-b-primary)"
            onChange={onGainChangeB} 
          />
          <Knob 
            value={deckB.eqHigh} 
            min={-26} 
            max={6} 
            defaultValue={0}
            label="HI" 
            unit="dB" 
            size={34} 
            accentColor="var(--deck-b-primary)"
            onChange={(v) => onEqChangeB('high', v)} 
          />
          <Knob 
            value={deckB.eqMid} 
            min={-26} 
            max={6} 
            defaultValue={0}
            label="MID" 
            unit="dB" 
            size={34} 
            accentColor="var(--deck-b-primary)"
            onChange={(v) => onEqChangeB('mid', v)} 
          />
          <Knob 
            value={deckB.eqLow} 
            min={-26} 
            max={6} 
            defaultValue={0}
            label="LOW" 
            unit="dB" 
            size={34} 
            accentColor="var(--deck-b-primary)"
            onChange={(v) => onEqChangeB('low', v)} 
          />
          <Knob 
            value={deckB.filter} 
            min={-1} 
            max={1} 
            defaultValue={0}
            label="FILTER" 
            size={34} 
            accentColor="var(--deck-b-primary)"
            onChange={onFilterChangeB} 
          />
        </div>
      </div>

      {/* Vertical Channel Volume Faders */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 20px', marginTop: '6px' }}>
        {/* Channel A Fader */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {Math.round(deckA.volume * 100)}%
          </div>
          <div className="fader-track">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={deckA.volume}
              onChange={(e) => onVolumeChangeA(parseFloat(e.target.value))}
              style={{
                position: 'absolute',
                width: '130px',
                height: '30px',
                transform: 'rotate(-90deg)',
                opacity: 0,
                cursor: 'ns-resize'
              }}
            />
            <div 
              className="fader-cap"
              style={{
                top: `${(1 - deckA.volume) * 110}px`,
                pointerEvents: 'none',
                borderColor: 'var(--deck-a-primary)'
              }}
            />
          </div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--deck-a-primary)' }}>VOL A</span>
        </div>

        {/* Channel B Fader */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {Math.round(deckB.volume * 100)}%
          </div>
          <div className="fader-track">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={deckB.volume}
              onChange={(e) => onVolumeChangeB(parseFloat(e.target.value))}
              style={{
                position: 'absolute',
                width: '130px',
                height: '30px',
                transform: 'rotate(-90deg)',
                opacity: 0,
                cursor: 'ns-resize'
              }}
            />
            <div 
              className="fader-cap"
              style={{
                top: `${(1 - deckB.volume) * 110}px`,
                pointerEvents: 'none',
                borderColor: 'var(--deck-b-primary)'
              }}
            />
          </div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--deck-b-primary)' }}>VOL B</span>
        </div>
      </div>

      {/* Horizontal Crossfader Section */}
      <div style={{ 
        background: 'var(--bg-surface)', 
        padding: '10px', 
        borderRadius: '6px', 
        border: '1px solid var(--border-medium)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--deck-a-primary)' }}>DECK A</span>
          
          {/* Curve Selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['smooth', 'linear', 'cut'] as const).map((c) => (
              <button
                key={c}
                onClick={() => onCrossfaderCurveChange(c)}
                className="dj-btn"
                style={{
                  background: crossfaderCurve === c ? 'var(--bg-card-hover)' : 'transparent',
                  color: crossfaderCurve === c ? '#fff' : 'var(--text-muted)',
                  border: crossfaderCurve === c ? '1px solid var(--border-medium)' : 'none',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontSize: '8px',
                  textTransform: 'uppercase'
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--deck-b-primary)' }}>DECK B</span>
        </div>

        {/* Crossfader Track */}
        <div style={{ 
          width: '100%', 
          height: '24px', 
          background: '#07090e', 
          borderRadius: '4px', 
          border: '1px solid #1a2230',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* Center Zero Detent */}
          <div style={{ position: 'absolute', left: '50%', width: '1px', height: '100%', background: 'rgba(255,255,255,0.2)' }} />
          
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'ew-resize',
              zIndex: 2
            }}
          />

          {/* Crossfader visual slider knob */}
          <div
            style={{
              position: 'absolute',
              width: '32px',
              height: '20px',
              background: 'linear-gradient(180deg, #44546d 0%, #1e2531 100%)',
              border: '1px solid #6b82a6',
              borderRadius: '3px',
              left: `calc(${((crossfader + 1) / 2) * 100}% - 16px)`,
              pointerEvents: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ width: '2px', height: '12px', background: '#fff' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
