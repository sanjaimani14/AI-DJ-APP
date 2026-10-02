import React from 'react';
import { 
  Clock, 
  Disc, 
  Speaker, 
  HeartPulse, 
  ShieldAlert,
  Radio,
  Sliders
} from 'lucide-react';

interface LiveEventPanelProps {
  isLive: boolean;
  elapsedSeconds: number;
  tracksPlayed: number;
  outputDevice: string;
  onOutputDeviceChange: (dev: string) => void;
  aiHealth: string;
  onEmergencyStop: () => void;
  onOpenLiveEvent?: () => void;
  onOpenSetup?: () => void;
}

export const LiveEventPanel: React.FC<LiveEventPanelProps> = ({
  isLive,
  elapsedSeconds,
  tracksPlayed,
  outputDevice,
  onOutputDeviceChange,
  aiHealth,
  onEmergencyStop,
  onOpenLiveEvent,
  onOpenSetup
}) => {
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const outputDevices = [
    'Default - Speakers (Realtek(R) Audio)',
    'Headphones (Realtek(R) Audio Output)',
    'USB DJ Controller / External Audio Interface',
    'Virtual Audio Cable / Direct Live Stream'
  ];

  return (
    <div 
      className="glass-panel"
      style={{
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(90deg, #111722 0%, #0d121b 100%)',
        border: '1px solid var(--border-medium)',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      {/* 1. LIVE Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isLive ? 'rgba(255, 23, 68, 0.15)' : 'rgba(255,255,255,0.06)',
          border: isLive ? '1px solid #ff1744' : '1px solid var(--border-subtle)',
          padding: '4px 10px',
          borderRadius: '6px'
        }}>
          <span 
            className={isLive ? 'animate-danger-pulse' : ''}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isLive ? '#ff1744' : 'var(--text-muted)',
              display: 'inline-block'
            }} 
          />
          <span style={{ fontSize: '11px', fontWeight: 900, color: isLive ? '#ff3344' : 'var(--text-muted)' }}>
            {isLive ? 'LIVE EVENT ACTIVE' : 'EVENT STANDBY'}
          </span>
        </div>
      </div>

      {/* 2. Elapsed Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={16} color="var(--deck-a-primary)" />
        <div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
            ELAPSED TIME
          </span>
          <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fff' }}>
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* 3. Tracks Played */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Disc size={16} color="var(--deck-b-primary)" />
        <div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
            TRACKS PLAYED
          </span>
          <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fff' }}>
            {tracksPlayed}
          </span>
        </div>
      </div>

      {/* 4. Current Output Device */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Speaker size={16} color="var(--ai-primary)" />
        <div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
            OUTPUT DEVICE
          </span>
          <select
            value={outputDevice}
            onChange={(e) => onOutputDeviceChange(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '11px',
              padding: '3px 6px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '220px'
            }}
          >
            {outputDevices.map((dev) => (
              <option key={dev} value={dev} style={{ background: '#0e121a', color: '#fff' }}>
                {dev}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. AI Health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <HeartPulse size={16} color="var(--ai-primary)" />
        <div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
            AI HEALTH
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ai-primary)' }}>
            {aiHealth}
          </span>
        </div>
      </div>

      {/* 6. EVENT SETUP, LIVE HUD & EMERGENCY CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenSetup && (
          <button
            onClick={onOpenSetup}
            className="dj-btn"
            style={{
              height: '42px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '0 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Configure Event Name, Type, Music Style, Duration, Energy, Output"
          >
            <Sliders size={14} color="var(--deck-a-primary)" /> EVENT SETUP
          </button>
        )}

        {onOpenLiveEvent && (
          <button
            onClick={onOpenLiveEvent}
            className="dj-btn glow-ai"
            style={{
              height: '42px',
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 179, 89, 0.3) 100%)',
              border: '1px solid var(--ai-primary)',
              color: 'var(--ai-primary)',
              padding: '0 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
            title="Launch Full Dedicated Simplified LIVE EVENT Interface"
          >
            <Radio size={14} /> LIVE STAGE HUD
          </button>
        )}

        <button
          onClick={onEmergencyStop}
          className="dj-btn animate-danger-pulse"
          style={{
            height: '42px',
            background: 'linear-gradient(180deg, #ff1744 0%, #b70024 100%)',
            color: '#ffffff',
            border: '2px solid #ff5252',
            padding: '0 18px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '1px',
            boxShadow: '0 0 16px rgba(255, 23, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          title="Instant Emergency Stop (Zero-Silence Audio Fallback Protection)"
        >
          <ShieldAlert size={18} /> EMERGENCY STOP
        </button>
      </div>
    </div>
  );
};
