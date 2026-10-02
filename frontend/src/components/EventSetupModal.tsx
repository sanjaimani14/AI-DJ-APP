import React, { useState } from 'react';
import type { EventProfile } from '../types/dj';
import { 
  Calendar, 
  Folder, 
  Speaker, 
  X, 
  Check, 
  Disc
} from 'lucide-react';
import { EnergyManager } from '../services/energyManager';

export interface EventSetupData {
  eventName: string;
  eventType: string;
  musicStyle: EventProfile;
  durationMinutes: number;
  targetEnergy: number;
  musicFolder: string;
  outputDevice: string;
}

interface EventSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToConfirmation: (data: EventSetupData) => void;
  initialData: EventSetupData;
  availableDevices: string[];
  loadedTracksCount: number;
  onSelectMusicFolder?: () => void;
}

export const EventSetupModal: React.FC<EventSetupModalProps> = ({
  isOpen,
  onClose,
  onProceedToConfirmation,
  initialData,
  availableDevices,
  loadedTracksCount,
  onSelectMusicFolder
}) => {
  const [formData, setFormData] = useState<EventSetupData>(initialData);

  if (!isOpen) return null;

  const eventTypes = [
    'Club / Nightclub Headline',
    'Festival Mainstage',
    'Private VIP Party',
    'Wedding Celebration',
    'College Fest / Concert',
    'Corporate Gala',
    'Lounge / Sunset Session',
    'Custom Live Show'
  ];

  const musicStyles: { id: EventProfile; label: string; desc: string }[] = [
    { id: 'Party', label: 'Party / Commercial', desc: 'Upbeat commercial dance & club hits' },
    { id: 'High Energy', label: 'High Energy', desc: 'Peak intensity, driving basslines & hype' },
    { id: 'EDM', label: 'EDM / Festival', desc: 'Massive drops, builds & synthesizer anthems' },
    { id: 'Tamil / Kuthu', label: 'Tamil / Kuthu', desc: 'Heavy percussion, dholak folk beats & celebration' },
    { id: 'Chill', label: 'Chill / Deep House', desc: 'Warm melodic grooves, relaxed tempo' },
    { id: 'Romantic', label: 'Romantic / Melodic', desc: 'Emotional acoustics, slow burns & ballads' },
    { id: 'Custom', label: 'Custom Multi-Genre', desc: 'User-curated freeform playlist selection' }
  ];

  const handleStyleChange = (style: EventProfile) => {
    const presets = EnergyManager.getProfilePresets();
    const preset = presets[style];
    setFormData((prev) => ({
      ...prev,
      musicStyle: style,
      targetEnergy: preset ? preset.targetEnergy : prev.targetEnergy,
      durationMinutes: preset ? preset.eventDurationMinutes : prev.durationMinutes
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProceedToConfirmation(formData);
  };

  const currentLevel = EnergyManager.getEnergyLevel(formData.targetEnergy);
  const energyColor = EnergyManager.getEnergyColor(currentLevel);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(3, 5, 9, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 136, 0.35)',
          background: 'linear-gradient(180deg, #0e1420 0%, #080c14 100%)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 136, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--ai-primary) 0%, #00b359 100%)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 255, 136, 0.4)'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '0.5px', margin: 0 }}>
                EVENT SETUP WIZARD
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Configure live show parameters before initiating live autonomous broadcast
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="dj-btn"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. EVENT NAME */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
              EVENT NAME
            </label>
            <input
              type="text"
              required
              value={formData.eventName}
              onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              placeholder="e.g. Saturday Night Mainstage Live"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#060910',
                border: '1px solid var(--border-medium)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>

          {/* 2. EVENT TYPE & MUSIC STYLE (2 columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                EVENT TYPE
              </label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#060910',
                  border: '1px solid var(--border-medium)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type} style={{ background: '#0e121a' }}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                MUSIC STYLE
              </label>
              <select
                value={formData.musicStyle}
                onChange={(e) => handleStyleChange(e.target.value as EventProfile)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#060910',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--ai-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {musicStyles.map((style) => (
                  <option key={style.id} value={style.id} style={{ background: '#0e121a', color: '#fff' }}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. DURATION & TARGET ENERGY SLIDERS */}
          <div style={{
            background: 'rgba(6, 9, 15, 0.7)',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {/* DURATION */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  DURATION
                </span>
                <span style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#00e5ff' }}>
                  {formData.durationMinutes} min ({Math.round(formData.durationMinutes / 60 * 10) / 10} hrs)
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="360"
                step="15"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) })}
                style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>15m</span>
                <span>2h</span>
                <span>4h</span>
                <span>6h</span>
              </div>
            </div>

            {/* TARGET ENERGY */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  TARGET ENERGY
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: `${energyColor}22`,
                  color: energyColor,
                  border: `1px solid ${energyColor}`
                }}>
                  {formData.targetEnergy.toFixed(2)} ({currentLevel})
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={formData.targetEnergy}
                onChange={(e) => setFormData({ ...formData, targetEnergy: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: energyColor, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>LOW (0.35)</span>
                <span>MED (0.55)</span>
                <span>HIGH (0.75)</span>
                <span>PEAK (0.95)</span>
              </div>
            </div>
          </div>

          {/* 4. MUSIC FOLDER */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
              MUSIC FOLDER / LIBRARY REPOSITORY
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#060910',
                border: '1px solid var(--border-medium)',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)'
              }}>
                <Folder size={14} color="var(--deck-a-primary)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formData.musicFolder}
                </span>
              </div>

              <button
                type="button"
                onClick={onSelectMusicFolder}
                className="dj-btn"
                style={{
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                BROWSE
              </button>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Disc size={12} color="var(--ai-primary)" />
              <span>Loaded: <strong style={{ color: '#fff' }}>{loadedTracksCount} analyzed tracks</strong> ready for live mixing</span>
            </div>
          </div>

          {/* 5. OUTPUT DEVICE */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
              AUDIO OUTPUT DEVICE
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={formData.outputDevice}
                onChange={(e) => setFormData({ ...formData, outputDevice: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  paddingLeft: '34px',
                  borderRadius: '8px',
                  background: '#060910',
                  border: '1px solid var(--border-medium)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableDevices.map((dev) => (
                  <option key={dev} value={dev} style={{ background: '#0e121a' }}>
                    {dev}
                  </option>
                ))}
              </select>
              <Speaker size={14} color="var(--deck-a-primary)" style={{ position: 'absolute', left: '12px', top: '13px', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Footer Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="dj-btn"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              CANCEL
            </button>

            <button
              type="submit"
              className="dj-btn glow-ai"
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--ai-primary) 0%, #00b359 100%)',
                border: 'none',
                color: '#000',
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Check size={16} /> SAVE SETUP & PROCEED TO LIVE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
