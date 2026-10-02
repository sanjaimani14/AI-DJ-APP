/**
 * frontend/src/components/AnalysisProgressModal.tsx
 * Phase 3 Analysis Progress UI conforming to the exact specification:
 * 
 * ANALYZING
 * ██████████░░ 72%
 */

import React from 'react';
import { Activity, Disc3, CheckCircle, AlertCircle } from 'lucide-react';

interface AnalysisProgressModalProps {
  isOpen: boolean;
  currentTrackName: string;
  progressPercent: number; // 0 to 100
  completedCount: number;
  totalCount: number;
  statusText?: string;
  error?: string | null;
  onClose?: () => void;
}

export const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({
  isOpen,
  currentTrackName,
  progressPercent,
  completedCount,
  totalCount,
  statusText = 'Extracting BPM, Musical Key, Energy & Loudness...',
  error,
  onClose
}) => {
  if (!isOpen) return null;

  // Generate ASCII block progress bar: 20 characters wide
  // Example: ██████████░░ 72%
  const totalBlocks = 20;
  const clampedPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const filledBlocks = Math.round((clampedPercent / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const blockString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  const isDone = clampedPercent >= 100 && !error;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '540px',
          background: 'linear-gradient(180deg, #0d121f 0%, #070a12 100%)',
          border: '1px solid var(--border-medium)',
          borderRadius: '12px',
          padding: '24px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 229, 255, 0.12)',
              border: '1px solid var(--deck-a-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {error ? (
                <AlertCircle size={18} color="#ff3b5c" />
              ) : isDone ? (
                <CheckCircle size={18} color="var(--ai-primary)" />
              ) : (
                <Disc3 size={18} color="var(--deck-a-primary)" className="spin-animation" />
              )}
            </div>
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '2px',
                color: error ? '#ff3b5c' : isDone ? 'var(--ai-primary)' : 'var(--deck-a-primary)',
                fontFamily: 'var(--font-mono)'
              }}>
                {error ? 'ANALYSIS ERROR' : isDone ? 'ANALYSIS COMPLETE' : 'ANALYZING'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrackName || 'Processing Audio Pipeline...'}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle)'
          }}>
            {completedCount} / {totalCount} TRACKS
          </div>
        </div>

        {/* ASCII Block Visualizer - Specification Match:
            ANALYZING
            ██████████░░ 72%
        */}
        <div style={{
          background: '#04070d',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '2px',
            color: error ? '#ff3b5c' : isDone ? 'var(--ai-primary)' : 'var(--deck-a-primary)',
            textShadow: error ? '0 0 10px rgba(255, 59, 92, 0.6)' : '0 0 12px rgba(0, 229, 255, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{blockString}</span>
            <span style={{ fontSize: '20px', color: '#fff', marginLeft: '12px' }}>{clampedPercent}%</span>
          </div>

          {/* Smooth animated progress line */}
          <div style={{
            width: '100%',
            height: '4px',
            background: '#131b2c',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '2px'
          }}>
            <div style={{
              width: `${clampedPercent}%`,
              height: '100%',
              background: error 
                ? '#ff3b5c' 
                : isDone 
                ? 'linear-gradient(90deg, var(--deck-a-primary) 0%, var(--ai-primary) 100%)' 
                : 'linear-gradient(90deg, var(--deck-a-primary) 0%, #a855f7 100%)',
              transition: 'width 0.2s ease-out'
            }} />
          </div>
        </div>

        {/* Live Audio Telemetry Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>FEATURE:</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>BPM & BEATS</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>HARMONIC:</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>KEY & CAMELOT</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>DYNAMICS:</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>ENERGY & LUFS</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>STORAGE:</div>
            <div style={{ color: 'var(--ai-primary)', fontWeight: 700 }}>SQLITE CACHE</div>
          </div>
        </div>

        {/* Status Subtitle & Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '11px', 
            color: error ? '#ff5252' : 'var(--text-muted)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px' 
          }}>
            <Activity size={12} color={error ? '#ff5252' : 'var(--deck-a-primary)'} />
            {error || statusText}
          </div>

          {(isDone || error) && onClose && (
            <button
              onClick={onClose}
              className="dj-btn"
              style={{
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                border: '1px solid var(--border-medium)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
