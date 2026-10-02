/**
 * frontend/src/components/DeckOverviewWaveform.tsx
 * Phase 4 Full Track Overview Waveform for Decks
 * Displays the entire track duration (0:00 to end) with:
 * - Real 800-point amplitude overview envelope
 * - Current playback position playhead
 * - Shaded Intro and Outro zones with labels
 * - Beat grid downbeats and beat markers
 * - Hot Cue and Cue point indicators
 * - Interactive click & drag seeking
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type { DeckState } from '../types/dj';
import { Music2 } from 'lucide-react';

interface DeckOverviewWaveformProps {
  deck: DeckState;
  primaryColor: string;
  onSeek: (timeSeconds: number) => void;
}

export const DeckOverviewWaveform: React.FC<DeckOverviewWaveformProps> = ({
  deck,
  primaryColor,
  onSeek
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  const seekFromClientX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !deck.track || !deck.duration) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * deck.duration);
  }, [deck.track, deck.duration, onSeek]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deck.track) return;
    isDraggingRef.current = true;
    seekFromClientX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !deck.track) return;
    seekFromClientX(e.clientX);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Render overview waveform onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;
    const track = deck.track;

    // Dark background
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, width, height);

    if (!track) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.font = '700 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO TRACK LOADED', width / 2, midY + 4);
      return;
    }

    const duration = deck.duration || track.duration || 1;
    const progress = Math.max(0, Math.min(1, deck.currentTime / duration));
    const playheadX = progress * width;

    // 1. Shaded Intro & Outro Zones
    const introEnd = track.introEnd || track.introTime || 0;
    const outroStart = track.outroStart || track.outroTime || duration;

    // Intro zone
    if (introEnd > 0) {
      const introW = (introEnd / duration) * width;
      ctx.fillStyle = 'rgba(0, 229, 255, 0.09)';
      ctx.fillRect(0, 0, introW, height);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.fillRect(introW - 1, 0, 1.5, height);
      ctx.font = '800 8px JetBrains Mono, monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'right';
      ctx.fillText('INTRO', introW - 3, 10);
    }

    // Outro zone
    if (outroStart < duration) {
      const outroX = (outroStart / duration) * width;
      ctx.fillStyle = 'rgba(255, 59, 92, 0.09)';
      ctx.fillRect(outroX, 0, width - outroX, height);
      ctx.fillStyle = 'rgba(255, 59, 92, 0.5)';
      ctx.fillRect(outroX - 1, 0, 1.5, height);
      ctx.font = '800 8px JetBrains Mono, monospace';
      ctx.fillStyle = '#ff3b5c';
      ctx.textAlign = 'left';
      ctx.fillText('OUTRO', outroX + 3, 10);
    }

    // 2. Overview Peaks (800 points)
    const peaks = track.waveform?.overview || track.waveformPeaks || [];
    const totalPeaks = peaks.length;

    if (totalPeaks > 0) {
      const barWidth = Math.max(1, width / totalPeaks);
      const maxH = (height / 2) * 0.82;

      for (let i = 0; i < totalPeaks; i++) {
        const x = (i / totalPeaks) * width;
        const val = peaks[i] || 0.05;
        const h = val * maxH;
        const isPast = x <= playheadX;

        if (isPast) {
          ctx.fillStyle = val > 0.8 ? '#ffffff' : primaryColor;
        } else {
          ctx.fillStyle = val > 0.8 ? '#2e3d54' : '#151d2a';
        }

        ctx.fillRect(x, midY - h, Math.max(1, barWidth - 0.5), h * 2);
      }
    }

    // 3. Beat grid markers on overview
    const beats = track.beatGrid?.beats || [];
    if (beats.length > 0) {
      for (let b = 0; b < beats.length; b++) {
        const bm = beats[b];
        const bx = (bm.time / duration) * width;
        if (bm.isDownbeat) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillRect(bx, 0, 1, height);
        }
      }
    }

    // 4. Hot Cues & Cue Point markers
    if (deck.cuePoint > 0) {
      const cueX = (deck.cuePoint / duration) * width;
      ctx.fillStyle = '#ffab00';
      ctx.fillRect(cueX - 1, 0, 2, height);
      ctx.beginPath();
      ctx.moveTo(cueX - 4, 0);
      ctx.lineTo(cueX + 4, 0);
      ctx.lineTo(cueX, 6);
      ctx.fill();
    }

    if (deck.hotCues) {
      deck.hotCues.forEach((hc, idx) => {
        if (hc !== null) {
          const hcX = (hc / duration) * width;
          ctx.fillStyle = '#00ff88';
          ctx.fillRect(hcX - 1, 0, 2, height);
          ctx.font = '800 7px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${idx + 1}`, hcX, height - 3);
        }
      });
    }

    // 5. Playhead Line (Glowing Red)
    ctx.fillStyle = '#ff3344';
    ctx.shadowColor = '#ff3344';
    ctx.shadowBlur = 6;
    ctx.fillRect(playheadX - 1, 0, 2, height);
    ctx.shadowBlur = 0;

  }, [deck.track, deck.duration, deck.currentTime, deck.cuePoint, deck.hotCues, primaryColor]);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '76px', 
        background: '#06080e', 
        borderRadius: '6px', 
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
        cursor: deck.track ? 'pointer' : 'default'
      }}
      title={deck.track ? 'Click or drag anywhere to seek' : 'Load track to activate'}
    >
      {deck.track ? (
        <canvas
          ref={canvasRef}
          width={800}
          height={76}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      ) : (
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '11px',
          gap: '4px'
        }}>
          <Music2 size={16} style={{ opacity: 0.5 }} />
          WAVEFORM OVERVIEW (Load track to activate)
        </div>
      )}
    </div>
  );
};
