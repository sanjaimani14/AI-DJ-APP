import React from 'react';
import type { EventSetupData } from './EventSetupModal';
import { 
  Play, 
  ShieldCheck, 
  Radio, 
  X 
} from 'lucide-react';
import { EnergyManager } from '../services/energyManager';

interface LiveAutonomousConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmGoLive: () => void;
  setupData: EventSetupData;
  tracksCount: number;
}

export const LiveAutonomousConfirmationModal: React.FC<LiveAutonomousConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmGoLive,
  setupData,
  tracksCount
}) => {
  if (!isOpen) return null;

  const currentLevel = EnergyManager.getEnergyLevel(setupData.targetEnergy);
  const energyColor = EnergyManager.getEnergyColor(currentLevel);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(2, 4, 8, 0.92)',
      backdropFilter: 'blur(10px)',
      zIndex: 10001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        className="glass-panel glow-ai"
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '16px',
          border: '2px solid var(--ai-primary)',
          background: 'linear-gradient(180deg, #0e1624 0%, #060a12 100%)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 255, 136, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(90deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 229, 255, 0.05) 100%)',
          borderBottom: '1px solid rgba(0, 255, 136, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#00ff88',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 255, 136, 0.5)'
            }}>
              <Radio size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '0.6px' }}>
                CONFIRM LIVE AUTONOMOUS START
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--ai-primary)', fontWeight: 700 }}>
                Ready to initiate live audience broadcast
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="dj-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Event Summary Card */}
          <div style={{
            background: 'rgba(5, 8, 14, 0.8)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>EVENT</span>
              <span style={{ fontSize: '13px', color: '#fff', fontWeight: 900 }}>{setupData.eventName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>EVENT TYPE</span>
              <span style={{ fontSize: '12px', color: 'var(--deck-a-primary)', fontWeight: 800 }}>{setupData.eventType}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>MUSIC STYLE / PROFILE</span>
              <span style={{ fontSize: '12px', color: 'var(--ai-primary)', fontWeight: 800 }}>{setupData.musicStyle}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>TARGET ENERGY</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${energyColor}22`,
                color: energyColor,
                border: `1px solid ${energyColor}`
              }}>
                {setupData.targetEnergy.toFixed(2)} ({currentLevel})
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>SET DURATION</span>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {setupData.durationMinutes} Minutes ({Math.round(setupData.durationMinutes / 60 * 10) / 10} Hours)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>ANALYZED TRACKS</span>
              <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {tracksCount} Tracks Ready in Library
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>OUTPUT DEVICE</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {setupData.outputDevice}
              </span>
            </div>
          </div>

          {/* Safety Assurances Checklist */}
          <div style={{
            background: 'rgba(0, 255, 136, 0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ai-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={15} /> LIVE BROADCAST SAFETY PROTOCOLS ENGAGED:
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00ff88' }} />
              <span><strong>Zero Silence Guarantee:</strong> Dual decks armed; background track staging prevents gaps.</span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00ff88' }} />
              <span><strong>Non-Blocking AI Engine:</strong> DSP runs independently on real-time audio threads.</span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00ff88' }} />
              <span><strong>Emergency Controls:</strong> Instant Emergency Stop and Manual Override are active on stage HUD.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              onClick={onClose}
              className="dj-btn"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              BACK TO SETUP
            </button>

            <button
              onClick={onConfirmGoLive}
              className="dj-btn glow-ai"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00ff88 0%, #009951 100%)',
                border: 'none',
                color: '#000',
                fontSize: '13px',
                fontWeight: 900,
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(0, 255, 136, 0.5)'
              }}
            >
              <Play size={16} fill="#000" /> CONFIRM & GO LIVE NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
