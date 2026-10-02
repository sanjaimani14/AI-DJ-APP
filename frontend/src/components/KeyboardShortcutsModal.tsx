import React from 'react';
import { 
  Keyboard, 
  X, 
  Disc, 
  Sliders, 
  Zap,
  CornerDownLeft
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keyCombo: string;
  description: string;
  badge?: string;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const deckAShortcuts: ShortcutItem[] = [
    { keyCombo: 'W', description: 'Play / Pause Deck A', badge: 'Transport' },
    { keyCombo: 'Q', description: 'Cue / Jump to Cue Point Deck A', badge: 'Cue' },
    { keyCombo: 'E', description: 'Tempo & Beat Sync Deck A', badge: 'Sync' },
    { keyCombo: '[ / ]', description: 'Pitch Bend Deck A (Down / Up)', badge: 'Pitch' },
    { keyCombo: '1, 2, 3, 4', description: 'Trigger Hot Cues 1–4 Deck A', badge: 'Hot Cue' },
  ];

  const deckBShortcuts: ShortcutItem[] = [
    { keyCombo: 'P', description: 'Play / Pause Deck B', badge: 'Transport' },
    { keyCombo: 'O', description: 'Cue / Jump to Cue Point Deck B', badge: 'Cue' },
    { keyCombo: 'I', description: 'Tempo & Beat Sync Deck B', badge: 'Sync' },
    { keyCombo: '- / =', description: 'Pitch Bend Deck B (Down / Up)', badge: 'Pitch' },
    { keyCombo: '7, 8, 9, 0', description: 'Trigger Hot Cues 1–4 Deck B', badge: 'Hot Cue' },
  ];

  const mixerShortcuts: ShortcutItem[] = [
    { keyCombo: 'Space', description: 'Toggle Play/Pause on Active Deck', badge: 'Global' },
    { keyCombo: '← / →', description: 'Nudge Crossfader Left / Right (±10%)', badge: 'Mixer' },
    { keyCombo: '↓', description: 'Center Crossfader (Equal Power 0.0)', badge: 'Mixer' },
    { keyCombo: 'T', description: 'Execute Automatic DJ Transition', badge: 'Auto-Mix' },
  ];

  const systemShortcuts: ShortcutItem[] = [
    { keyCombo: 'A', description: 'Toggle Autonomous AI DJ Mode', badge: 'AI Engine' },
    { keyCombo: 'L', description: 'Toggle Dedicated Live Stage HUD', badge: 'Live Mode' },
    { keyCombo: 'S', description: 'Open Event Setup Wizard', badge: 'Setup' },
    { keyCombo: 'D', description: 'Open Event Session Log & Diagnostics', badge: 'Audit' },
    { keyCombo: '? / H', description: 'Open / Close this Shortcuts Reference', badge: 'Help' },
    { keyCombo: 'Esc', description: 'EMERGENCY STOP (Instant Deck Pause & Mute)', badge: 'Safety' },
  ];

  const renderSection = (title: string, icon: React.ReactNode, items: ShortcutItem[], accentColor: string) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius: '8px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ color: accentColor }}>{icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
          {title}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              borderRadius: '4px',
              background: 'rgba(0, 0, 0, 0.25)',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <kbd style={{
                background: 'linear-gradient(180deg, #2b3345 0%, #171d2b 100%)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 2px 0 rgba(0,0,0,0.5)',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                minWidth: '24px',
                textAlign: 'center'
              }}>
                {item.keyCombo}
              </kbd>
              <span style={{ color: 'var(--text-secondary)' }}>{item.description}</span>
            </div>

            {item.badge && (
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '3px',
                background: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}33`,
                textTransform: 'uppercase'
              }}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 7, 14, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #101522 0%, #090c13 100%)',
          border: '1px solid var(--border-medium)',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 240, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.12)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--neon-cyan)'
            }}>
              <Keyboard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                DJ Hardware & Keyboard Shortcuts
                <span style={{ fontSize: '10px', background: 'rgba(0, 240, 255, 0.15)', color: 'var(--neon-cyan)', padding: '2px 6px', borderRadius: '4px' }}>
                  PRO DJ MODE
                </span>
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Zero-latency tactile controls for real-time live performance
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close shortcuts modal"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Grid */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '12px'
        }}>
          {renderSection('Deck A (Left)', <Disc size={15} />, deckAShortcuts, 'var(--neon-cyan)')}
          {renderSection('Deck B (Right)', <Disc size={15} />, deckBShortcuts, 'var(--neon-magenta)')}
          {renderSection('Mixer & Transitions', <Sliders size={15} />, mixerShortcuts, '#10b981')}
          {renderSection('AI, Live HUD & Safety', <Zap size={15} />, systemShortcuts, '#f59e0b')}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-light)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CornerDownLeft size={13} style={{ color: 'var(--neon-cyan)' }} />
            <span>Shortcuts are active across both Main Studio and Live Stage HUD</span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'var(--neon-cyan)',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};
