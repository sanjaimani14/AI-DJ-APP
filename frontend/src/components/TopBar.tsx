import React, { useState } from 'react';
import { 
  Disc3, 
  Settings, 
  Minus, 
  Square, 
  X, 
  Calendar,
  Radio,
  Sliders,
  FileText,
  Keyboard
} from 'lucide-react';

interface TopBarProps {
  eventName: string;
  onEventNameChange: (name: string) => void;
  aiStatus: string;
  isLive: boolean;
  onOpenEventSetup?: () => void;
  onToggleLiveEventView?: () => void;
  isLiveEventView?: boolean;
  onOpenSessionLog?: () => void;
  onOpenShortcuts?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  eventName,
  onEventNameChange,
  aiStatus,
  isLive,
  onOpenEventSetup,
  onToggleLiveEventView,
  isLiveEventView = false,
  onOpenSessionLog,
  onOpenShortcuts,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [tempEventName, setTempEventName] = useState(eventName);

  const handleEventNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEventNameChange(tempEventName || 'Saturday Night Live Set');
    setIsEditingEvent(false);
  };

  return (
    <>
      <header 
        className="glass-panel"
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          background: 'linear-gradient(90deg, #090c13 0%, #101622 50%, #090c13 100%)',
          borderBottom: '1px solid var(--border-medium)',
          minHeight: '52px'
        }}
      >
        {/* Brand & AI DJ Logo */}
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
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 900, 
                letterSpacing: '1px', 
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(90deg, #ffffff 0%, #00e5ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                AI DJ
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>
                AUTONOMOUS LIVE DJ
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Desktop Professional Mixing Suite • Windows Local Edition
            </div>
          </div>
        </div>

        {/* Center: Current Event Name & AI Status & LIVE Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Current Event Name */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--bg-surface)', 
            padding: '5px 12px', 
            borderRadius: '6px', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <Calendar size={14} color="var(--deck-a-primary)" />
            {isEditingEvent ? (
              <form onSubmit={handleEventNameSubmit}>
                <input
                  type="text"
                  value={tempEventName}
                  onChange={(e) => setTempEventName(e.target.value)}
                  onBlur={() => setIsEditingEvent(false)}
                  autoFocus
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--deck-a-primary)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    outline: 'none',
                    padding: '2px 4px',
                    borderRadius: '3px'
                  }}
                />
              </form>
            ) : (
              <div 
                onClick={() => setIsEditingEvent(true)}
                style={{ cursor: 'pointer' }}
                title="Click to rename current event"
              >
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
                  CURRENT EVENT
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {eventName}
                </span>
              </div>
            )}
          </div>

          {/* AI Status Badge */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'var(--bg-surface)', 
            padding: '5px 12px', 
            borderRadius: '6px', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ai-primary)', boxShadow: '0 0 6px var(--ai-primary)' }} />
            <div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                AI STATUS
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ai-primary)', fontFamily: 'var(--font-mono)' }}>
                {aiStatus}
              </span>
            </div>
          </div>

          {/* LIVE Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isLive ? 'rgba(255, 23, 68, 0.15)' : 'rgba(255,255,255,0.05)',
            border: isLive ? '1px solid #ff1744' : '1px solid var(--border-subtle)',
            padding: '5px 10px',
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
            <span style={{
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '1px',
              color: isLive ? '#ff3344' : 'var(--text-muted)'
            }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Right: Event Setup, Live Event Mode, Settings and Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Event Setup Button */}
          {onOpenEventSetup && (
            <button
              onClick={onOpenEventSetup}
              className="dj-btn"
              style={{
                background: 'var(--bg-surface)',
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
              title="Open Live Event Setup Wizard (Event Name, Type, Music Style, Duration, Energy, Output)"
            >
              <Sliders size={13} color="var(--deck-a-primary)" /> EVENT SETUP
            </button>
          )}

          {/* LIVE EVENT MODE Fullscreen HUD Toggle */}
          {onToggleLiveEventView && (
            <button
              onClick={onToggleLiveEventView}
              className={`dj-btn ${isLiveEventView ? 'glow-danger' : 'glow-ai'}`}
              style={{
                background: isLiveEventView 
                  ? 'linear-gradient(135deg, #ff1744 0%, #b70024 100%)' 
                  : 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 179, 89, 0.3) 100%)',
                border: isLiveEventView ? '1px solid #ff5252' : '1px solid var(--ai-primary)',
                color: isLiveEventView ? '#fff' : 'var(--ai-primary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
              title="Toggle Dedicated Simplified LIVE EVENT Mode Stage HUD"
            >
              <Radio size={14} className={isLiveEventView ? 'animate-danger-pulse' : ''} />
              {isLiveEventView ? 'EXIT LIVE HUD' : 'LIVE EVENT MODE'}
            </button>
          )}

          {/* Event Session Log & Safety Diagnostics Button */}
          {onOpenSessionLog && (
            <button
              onClick={onOpenSessionLog}
              className="dj-btn"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
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
              title="Open Session Log, Fallback Audit Trail & Safety Diagnostics"
            >
              <FileText size={13} /> EVENT LOG
            </button>
          )}

          {/* Keyboard Shortcuts Button */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="dj-btn"
              style={{
                background: 'var(--bg-surface)',
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
              <Keyboard size={13} color="var(--neon-cyan)" /> SHORTCUTS
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="dj-btn"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: showSettings ? 'var(--deck-a-primary)' : 'var(--text-secondary)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              gap: '6px'
            }}
            title="Application Settings"
          >
            <Settings size={14} /> SETTINGS
          </button>

          {/* Window action controls: Minimize, Maximize, Close */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--bg-surface)', 
            borderRadius: '6px', 
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden' 
          }}>
            <button
              onClick={() => alert('Minimize window (Tauri desktop action)')}
              className="dj-btn"
              style={{ padding: '6px 10px', background: 'transparent', color: 'var(--text-muted)' }}
              title="Minimize"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={() => alert('Maximize / Restore window (Tauri desktop action)')}
              className="dj-btn"
              style={{ padding: '6px 10px', background: 'transparent', color: 'var(--text-muted)' }}
              title="Maximize"
            >
              <Square size={11} />
            </button>
            <button
              onClick={() => alert('Close Application (Tauri desktop action)')}
              className="dj-btn"
              style={{ padding: '6px 10px', background: 'transparent', color: '#ff5252' }}
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal (Placeholder for Audio/Hardware settings) */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: '20px',
          width: '320px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '8px',
          padding: '16px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 800, fontSize: '12px' }}>AUDIO & SYSTEM SETTINGS</span>
            <button 
              onClick={() => setShowSettings(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
                PRIMARY AUDIO DRIVER
              </label>
              <div style={{ background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: '#fff' }}>
                Windows Audio (WASAPI Default)
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
                SAMPLE RATE & BUFFER
              </label>
              <div style={{ background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: '#fff' }}>
                48,000 Hz • 256 samples (5.3ms latency)
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              Phase 1 Interface Foundation: Hardware routing configurations will bind in Phase 5.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
