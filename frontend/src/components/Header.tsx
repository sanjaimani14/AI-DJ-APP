import React from 'react';
import { 
  Radio, 
  Clock, 
  Maximize2, 
  Disc3, 
  WifiOff, 
  Speaker 
} from 'lucide-react';

interface HeaderProps {
  eventElapsedSeconds: number;
  totalSongsPlayed: number;
  isLiveEventView: boolean;
  onToggleLiveEventView: () => void;
  audioDevice: string;
  onAudioDeviceChange: (device: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  eventElapsedSeconds,
  totalSongsPlayed,
  isLiveEventView,
  onToggleLiveEventView,
  audioDevice,
  onAudioDeviceChange
}) => {
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const audioDevices = [
    'Default - Speakers (Realtek(R) Audio)',
    'Headphones (Realtek(R) Audio)',
    'External DJ Audio Interface / Mixer (USB)'
  ];

  return (
    <header 
      className="glass-panel"
      style={{
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '2px solid var(--border-medium)',
        background: 'linear-gradient(90deg, #090c13 0%, #111724 50%, #090c13 100%)'
      }}
    >
      {/* Brand & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #00e5ff 0%, #ff007f 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 12px rgba(0, 229, 255, 0.4)'
        }}>
          <Disc3 size={20} color="#000" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ 
              fontSize: '17px', 
              fontWeight: 900, 
              letterSpacing: '1px', 
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(90deg, #ffffff 0%, #00e5ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              AI DJ
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>AUTONOMOUS LIVE DJ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
            <span style={{ color: 'var(--ai-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ai-primary)', display: 'inline-block' }} />
              LOCAL AUDIO ENGINE ACTIVE
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <WifiOff size={10} /> 100% OFFLINE READY
            </span>
          </div>
        </div>
      </div>

      {/* Center Event Clock & Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <Clock size={15} color="var(--deck-a-primary)" />
          <div>
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)' }}>EVENT RUN TIME</div>
            <div style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatTime(eventElapsedSeconds)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <Radio size={15} color="var(--deck-b-primary)" />
          <div>
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)' }}>TRACKS MIXED</div>
            <div style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalSongsPlayed}
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls: Audio Device & Live HUD Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Output Device Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <Speaker size={14} color="var(--text-muted)" />
          <select 
            value={audioDevice}
            onChange={(e) => onAudioDeviceChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              outline: 'none',
              maxWidth: '220px',
              cursor: 'pointer'
            }}
          >
            {audioDevices.map((d) => (
              <option key={d} value={d} style={{ background: '#0e121a', color: '#fff' }}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Live Event Mode Toggle */}
        <button
          onClick={onToggleLiveEventView}
          className="dj-btn"
          style={{
            background: isLiveEventView ? 'var(--ai-primary)' : 'var(--bg-card)',
            color: isLiveEventView ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            gap: '6px'
          }}
          title="Toggle Fullscreen Live Stage Dashboard"
        >
          <Maximize2 size={14} /> LIVE EVENT HUD
        </button>
      </div>
    </header>
  );
};
