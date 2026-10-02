/**
 * frontend/src/components/WaveformDisplay.tsx
 * Phase 4 Professional Dual Synced Scrolling Waveform Display & Beat Grid
 * 
 * Features:
 * 1. Real 3-band frequency waveform rendering from decoded audio (Bass, Mid, High).
 * 2. Synchronized 60FPS smooth scrolling with sub-frame time interpolation.
 * 3. Beat grid with prominent downbeat markers and bar numbering.
 * 4. Intro and Outro shaded regions with visual labels.
 * 5. Fixed center playhead needle with glowing pulse.
 * 6. Adjustable zoom levels (1x, 2x, 4x, 8x) + mouse wheel zoom.
 * 7. Interactive click & scrub seeking for both decks.
 * 8. Non-blocking high-performance 2D canvas drawing.
 * 9. Phase alignment meter for future beat-matching.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DeckState, BeatMarker } from '../types/dj';
import { Compass, ZoomIn, ZoomOut, Zap } from 'lucide-react';

interface WaveformDisplayProps {
  deckA: DeckState;
  deckB: DeckState;
  onSeekA: (time: number) => void;
  onSeekB: (time: number) => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  deckA,
  deckB,
  onSeekA,
  onSeekB
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom level: visible seconds in the viewport window
  // 1x = 16 seconds, 2x = 8 seconds (default), 4x = 4 seconds, 8x = 2 seconds
  const [zoomLevel, setZoomLevel] = useState<number>(2); // 1, 2, 4, 8

  // Mouse scrubbing state
  const isDraggingRef = useRef<{ active: boolean; deckId: 'A' | 'B' | null }>({
    active: false,
    deckId: null
  });

  // High-precision clock interpolation to eliminate DOM event stutter
  const lastDeckAState = useRef<{ time: number; stamp: number; isPlaying: boolean; rate: number }>({
    time: 0,
    stamp: performance.now(),
    isPlaying: false,
    rate: 1.0
  });

  const lastDeckBState = useRef<{ time: number; stamp: number; isPlaying: boolean; rate: number }>({
    time: 0,
    stamp: performance.now(),
    isPlaying: false,
    rate: 1.0
  });

  // Update clock reference when deck state updates
  useEffect(() => {
    lastDeckAState.current = {
      time: deckA.currentTime,
      stamp: performance.now(),
      isPlaying: deckA.isPlaying,
      rate: deckA.playbackRate || 1.0
    };
  }, [deckA.currentTime, deckA.isPlaying, deckA.playbackRate]);

  useEffect(() => {
    lastDeckBState.current = {
      time: deckB.currentTime,
      stamp: performance.now(),
      isPlaying: deckB.isPlaying,
      rate: deckB.playbackRate || 1.0
    };
  }, [deckB.currentTime, deckB.isPlaying, deckB.playbackRate]);

  // Compute visible time span based on zoom level
  // zoom 1x = 16s, 2x = 8s, 4x = 4s, 8x = 2s
  const visibleSeconds = 16 / zoomLevel;

  // Calculate phase difference between decks for visual beat alignment
  const bpmA = deckA.track?.bpm || deckA.bpm || 128;
  const bpmB = deckB.track?.bpm || deckB.bpm || 128;
  const beatPeriodA = bpmA > 0 ? 60 / bpmA : 0.5;
  const beatPeriodB = bpmB > 0 ? 60 / bpmB : 0.5;
  const phaseA = (deckA.currentTime % beatPeriodA) / beatPeriodA;
  const phaseB = (deckB.currentTime % beatPeriodB) / beatPeriodB;
  const phaseDiff = deckA.isPlaying && deckB.isPlaying ? (phaseA - phaseB) : 0;
  const isBeatSynced = Math.abs(phaseDiff) < 0.06;

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(8, z * 2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(1, z / 2));

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((z) => Math.min(8, z * 2));
    } else {
      setZoomLevel((z) => Math.max(1, z / 2));
    }
  }, []);

  // Time seeking helper from canvas client X
  const seekFromClientX = useCallback((clientX: number, deckId: 'A' | 'B') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const centerX = rect.width / 2;

    const deck = deckId === 'A' ? deckA : deckB;
    if (!deck.track || !deck.duration) return;

    // Center of canvas is current playback position
    const pixelsPerSecond = rect.width / visibleSeconds;
    const offsetSeconds = (clickX - centerX) / pixelsPerSecond;
    const targetTime = Math.max(0, Math.min(deck.duration, deck.currentTime + offsetSeconds));

    if (deckId === 'A') onSeekA(targetTime);
    else onSeekB(targetTime);
  }, [deckA, deckB, onSeekA, onSeekB, visibleSeconds]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const deckId = clickY < rect.height / 2 ? 'A' : 'B';

    isDraggingRef.current = { active: true, deckId };
    seekFromClientX(e.clientX, deckId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current.active || !isDraggingRef.current.deckId) return;
    seekFromClientX(e.clientX, isDraggingRef.current.deckId);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = { active: false, deckId: null };
  };

  // 60FPS Smooth Waveform Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const now = performance.now();
      const width = canvas.width;
      const height = canvas.height;
      const halfHeight = height / 2;
      const centerX = width / 2;
      const pixelsPerSecond = width / visibleSeconds;

      // 1. Dark professional background
      ctx.fillStyle = '#06090e';
      ctx.fillRect(0, 0, width, height);

      // Background subtle time grid (1 second intervals)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      const secStep = pixelsPerSecond;
      for (let x = (centerX % secStep); x < width; x += secStep) {
        ctx.fillRect(x, 0, 1, height);
      }

      // Helper to calculate sub-frame interpolated audio time
      const getInterpolatedTime = (
        lastState: { time: number; stamp: number; isPlaying: boolean; rate: number },
        actualDuration: number
      ) => {
        if (!lastState.isPlaying) return lastState.time;
        const deltaSec = ((now - lastState.stamp) / 1000) * lastState.rate;
        return Math.min(actualDuration || 9999, lastState.time + deltaSec);
      };

      const timeA = getInterpolatedTime(lastDeckAState.current, deckA.duration);
      const timeB = getInterpolatedTime(lastDeckBState.current, deckB.duration);

      // Helper to render deck scrolling waveform
      const drawDeckWaveform = (
        deck: DeckState,
        currentTime: number,
        topY: number,
        deckHeight: number,
        primaryColor: string,
        bassColor: string,
        deckLabel: string
      ) => {
        const midY = topY + deckHeight / 2;
        const track = deck.track;

        if (!track) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.font = '700 13px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`DECK ${deckLabel} EMPTY — LOAD TRACK FROM LIBRARY`, centerX, midY + 4);
          return;
        }

        const totalDuration = deck.duration || track.duration || 1;
        const windowStartTime = currentTime - (visibleSeconds / 2);
        const windowEndTime = currentTime + (visibleSeconds / 2);

        // -------------------------------------------------------------
        // A. Shaded Intro & Outro Regions
        // -------------------------------------------------------------
        const introEnd = track.introEnd || track.introTime || 0;
        const outroStart = track.outroStart || track.outroTime || totalDuration;

        // Intro Zone
        if (introEnd > 0 && windowStartTime < introEnd) {
          const introXStart = Math.max(0, centerX + (0 - currentTime) * pixelsPerSecond);
          const introXEnd = centerX + (introEnd - currentTime) * pixelsPerSecond;
          const introWidth = Math.max(0, introXEnd - introXStart);

          ctx.fillStyle = 'rgba(0, 229, 255, 0.07)';
          ctx.fillRect(introXStart, topY, introWidth, deckHeight);

          // Intro boundary marker
          ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
          ctx.fillRect(introXEnd - 1, topY, 2, deckHeight);
          ctx.font = '800 9px JetBrains Mono, monospace';
          ctx.fillStyle = '#00e5ff';
          ctx.textAlign = 'right';
          ctx.fillText('INTRO END ⇥', introXEnd - 4, topY + 12);
        }

        // Outro Zone
        if (outroStart < totalDuration && windowEndTime > outroStart) {
          const outroXStart = centerX + (outroStart - currentTime) * pixelsPerSecond;
          const outroXEnd = Math.min(width, centerX + (totalDuration - currentTime) * pixelsPerSecond);
          const outroWidth = Math.max(0, outroXEnd - outroXStart);

          ctx.fillStyle = 'rgba(255, 59, 92, 0.08)';
          ctx.fillRect(outroXStart, topY, outroWidth, deckHeight);

          // Outro boundary marker
          ctx.fillStyle = 'rgba(255, 59, 92, 0.6)';
          ctx.fillRect(outroXStart - 1, topY, 2, deckHeight);
          ctx.font = '800 9px JetBrains Mono, monospace';
          ctx.fillStyle = '#ff3b5c';
          ctx.textAlign = 'left';
          ctx.fillText('⇤ OUTRO START', outroXStart + 4, topY + 12);
        }

        // -------------------------------------------------------------
        // B. Real 3-Band Frequency Waveform Rendering
        // -------------------------------------------------------------
        const waveform = track.waveform;
        const fps = waveform?.fps || 35;
        const lowBand = waveform?.low;
        const midBand = waveform?.mid;
        const highBand = waveform?.high;
        const overview = waveform?.overview || track.waveformPeaks;

        const maxHalfAmp = (deckHeight / 2) * 0.88;

        if (lowBand && midBand && lowBand.length > 0) {
          // Render High-Resolution 3-Band Frequency Columns
          const startFrame = Math.max(0, Math.floor(windowStartTime * fps));
          const endFrame = Math.min(lowBand.length - 1, Math.ceil(windowEndTime * fps));

          const colWidth = Math.max(2, (1 / fps) * pixelsPerSecond);

          for (let f = startFrame; f <= endFrame; f++) {
            const frameTime = f / fps;
            const x = centerX + (frameTime - currentTime) * pixelsPerSecond;

            const lowVal = lowBand[f] || 0.05;
            const midVal = (midBand && midBand[f]) || 0.05;
            const highVal = (highBand && highBand[f]) || 0.02;

            // Bass (Low) Band - center core
            const bassHeight = lowVal * maxHalfAmp;
            // Mid Band - extends further
            const midHeight = Math.max(bassHeight, midVal * maxHalfAmp);
            // High Band - transient tips
            const highHeight = Math.max(midHeight, highVal * maxHalfAmp);

            // Draw Highs (White / Transient tips)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(x - colWidth / 2, midY - highHeight, colWidth - 0.5, highHeight * 2);

            // Draw Mids (Deck primary tint / harmonic body)
            ctx.fillStyle = primaryColor;
            ctx.fillRect(x - colWidth / 2, midY - midHeight, colWidth - 0.5, midHeight * 2);

            // Draw Lows / Bass (Deep punchy bass core)
            ctx.fillStyle = bassColor;
            ctx.fillRect(x - colWidth / 2, midY - bassHeight, colWidth - 0.5, bassHeight * 2);
          }
        } else if (overview && overview.length > 0) {
          // Fallback to Overview Peaks stretched over track duration
          const totalPoints = overview.length;
          const startPt = Math.max(0, Math.floor((windowStartTime / totalDuration) * totalPoints));
          const endPt = Math.min(totalPoints - 1, Math.ceil((windowEndTime / totalDuration) * totalPoints));

          const ptWidth = Math.max(2, (totalDuration / totalPoints) * pixelsPerSecond);

          for (let p = startPt; p <= endPt; p++) {
            const ptTime = (p / totalPoints) * totalDuration;
            const x = centerX + (ptTime - currentTime) * pixelsPerSecond;
            const val = overview[p] || 0.1;
            const h = val * maxHalfAmp;

            ctx.fillStyle = val > 0.8 ? '#ffffff' : val > 0.4 ? primaryColor : bassColor;
            ctx.fillRect(x - ptWidth / 2, midY - h, ptWidth - 0.5, h * 2);
          }
        }

        // -------------------------------------------------------------
        // C. Beat Grid & Downbeat Detection Markers
        // -------------------------------------------------------------
        const beatGrid = track.beatGrid;
        const beats: BeatMarker[] = beatGrid?.beats || [];

        if (beats.length > 0) {
          for (let b = 0; b < beats.length; b++) {
            const bm = beats[b];
            if (bm.time < windowStartTime - 0.5 || bm.time > windowEndTime + 0.5) continue;

            const bx = centerX + (bm.time - currentTime) * pixelsPerSecond;

            if (bm.isDownbeat) {
              // DOWNBEAT: Thick, bright white line with Bar Number
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = primaryColor;
              ctx.shadowBlur = 4;
              ctx.fillRect(bx - 1, topY, 2, deckHeight);
              ctx.shadowBlur = 0;

              // Bar Number Marker Badge at top
              ctx.fillStyle = primaryColor;
              ctx.fillRect(bx - 9, topY + 2, 18, 12);
              ctx.font = '900 8px JetBrains Mono, monospace';
              ctx.fillStyle = '#000000';
              ctx.textAlign = 'center';
              ctx.fillText(`${bm.bar}`, bx, topY + 11);
            } else {
              // Standard intermediate beat marker (beats 2, 3, 4)
              ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
              ctx.fillRect(bx, midY - maxHalfAmp * 0.65, 1, maxHalfAmp * 1.3);
            }
          }
        } else if (deck.bpm > 0) {
          // Synthetic beat grid fallback if track beatGrid not loaded
          const beatInterval = 60 / deck.bpm;
          const firstBeat = Math.floor(windowStartTime / beatInterval) * beatInterval;
          for (let bt = firstBeat; bt <= windowEndTime; bt += beatInterval) {
            if (bt < 0) continue;
            const bx = centerX + (bt - currentTime) * pixelsPerSecond;
            const beatIndex = Math.round(bt / beatInterval);
            const isDown = beatIndex % 4 === 0;

            if (isDown) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(bx - 1, topY, 2, deckHeight);
            } else {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.fillRect(bx, midY - maxHalfAmp * 0.5, 1, maxHalfAmp);
            }
          }
        }

        // -------------------------------------------------------------
        // D. Hot Cues & Cue Markers
        // -------------------------------------------------------------
        if (deck.cuePoint > 0 && deck.cuePoint >= windowStartTime && deck.cuePoint <= windowEndTime) {
          const cueX = centerX + (deck.cuePoint - currentTime) * pixelsPerSecond;
          ctx.fillStyle = '#ffab00';
          ctx.fillRect(cueX - 1, topY, 2, deckHeight);
          ctx.beginPath();
          ctx.moveTo(cueX - 6, topY);
          ctx.lineTo(cueX + 6, topY);
          ctx.lineTo(cueX, topY + 8);
          ctx.fill();
          ctx.font = '800 8px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('CUE', cueX, topY + 17);
        }

        // Hot cues (1 - 8)
        if (deck.hotCues) {
          deck.hotCues.forEach((hc, idx) => {
            if (hc !== null && hc >= windowStartTime && hc <= windowEndTime) {
              const hcX = centerX + (hc - currentTime) * pixelsPerSecond;
              ctx.fillStyle = '#00ff88';
              ctx.fillRect(hcX - 1, topY, 2, deckHeight);
              ctx.beginPath();
              ctx.moveTo(hcX - 5, topY);
              ctx.lineTo(hcX + 5, topY);
              ctx.lineTo(hcX, topY + 7);
              ctx.fill();
              ctx.font = '800 8px JetBrains Mono, monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`${idx + 1}`, hcX, topY + 16);
            }
          });
        }

        // Deck Badge & Telemetry (Top Left of deck lane)
        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.fillRect(8, topY + 6, 170, 20);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(8, topY + 6, 170, 20);

        ctx.fillStyle = primaryColor;
        ctx.font = '800 11px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`DECK ${deckLabel}`, 14, topY + 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 10px JetBrains Mono, monospace';
        ctx.fillText(`${deck.bpm.toFixed(1)} BPM`, 65, topY + 20);

        ctx.fillStyle = 'var(--text-muted)';
        ctx.fillText(`${deck.currentKey}`, 138, topY + 20);
      };

      // 2. Render Deck A (Top Half)
      drawDeckWaveform(deckA, timeA, 0, halfHeight - 1, '#00e5ff', '#007b8a', 'A');

      // 3. Center Divider & Phase Difference Meter
      ctx.fillStyle = '#141c2c';
      ctx.fillRect(0, halfHeight - 2, width, 4);

      // 4. Render Deck B (Bottom Half)
      drawDeckWaveform(deckB, timeB, halfHeight + 2, halfHeight - 2, '#ff007f', '#8a0044', 'B');

      // 5. Fixed Center Playhead Needle (Glowing Red Razor Line)
      ctx.fillStyle = '#ff2b44';
      ctx.shadowColor = '#ff2b44';
      ctx.shadowBlur = 10;
      ctx.fillRect(centerX - 1, 0, 2, height);
      ctx.shadowBlur = 0;

      // Top and bottom triangular playhead pointers
      ctx.fillStyle = '#ff2b44';
      ctx.beginPath();
      ctx.moveTo(centerX - 6, 0);
      ctx.lineTo(centerX + 6, 0);
      ctx.lineTo(centerX, 8);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX - 6, height);
      ctx.lineTo(centerX + 6, height);
      ctx.lineTo(centerX, height - 8);
      ctx.fill();

      // Center Phase Sync Marker
      if (deckA.isPlaying && deckB.isPlaying) {
        ctx.fillStyle = isBeatSynced ? '#00ff88' : '#ffab00';
        ctx.shadowColor = isBeatSynced ? '#00ff88' : '#ffab00';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(centerX, halfHeight, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [deckA, deckB, visibleSeconds, isBeatSynced]);

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      className="glass-panel" 
      style={{ 
        padding: '10px 14px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        background: 'linear-gradient(180deg, #090d16 0%, #06080e 100%)',
        border: '1px solid var(--border-medium)',
        borderRadius: '8px'
      }}
    >
      {/* Top Telemetry & Waveform Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left: Section Header & Beat Match Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} color="#00e5ff" />
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 800, 
              color: 'var(--text-secondary)', 
              letterSpacing: '1px',
              fontFamily: 'var(--font-display)'
            }}>
              DUAL SYNCED BEATGRID WAVEFORMS
            </span>
          </div>

          {/* Phase difference badge */}
          {deckA.isPlaying && deckB.isPlaying && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isBeatSynced ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 171, 0, 0.15)',
              border: `1px solid ${isBeatSynced ? 'var(--ai-primary)' : '#ffab00'}`,
              color: isBeatSynced ? 'var(--ai-primary)' : '#ffab00',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)'
            }}>
              <Zap size={11} /> {isBeatSynced ? 'BEAT GRID LOCKED' : `PHASE OFFSET: ${(phaseDiff * 100).toFixed(0)}%`}
            </div>
          )}
        </div>

        {/* Right: Phase Slider & Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Phase Alignment Visual Meter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>PHASE</span>
            <div style={{ 
              width: '90px', 
              height: '6px', 
              background: '#0d131f', 
              borderRadius: '3px', 
              position: 'relative', 
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', 
                left: '50%', 
                top: 0, 
                bottom: 0, 
                width: '2px', 
                background: 'rgba(255, 255, 255, 0.4)', 
                transform: 'translateX(-50%)' 
              }} />
              <div style={{ 
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '6px',
                borderRadius: '3px',
                background: isBeatSynced ? 'var(--ai-primary)' : '#ffab00',
                left: `${Math.max(0, Math.min(84, 42 + phaseDiff * 80))}px`,
                transition: 'left 0.05s linear'
              }} />
            </div>
          </div>

          {/* Zoom Buttons (Phase 4 Requirement) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="dj-btn"
              style={{
                padding: '3px 6px',
                fontSize: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: zoomLevel <= 1 ? 'var(--text-muted)' : '#fff',
                borderRadius: '3px'
              }}
              title="Zoom Out (Show more track)"
            >
              <ZoomOut size={12} />
            </button>

            {[1, 2, 4, 8].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className="dj-btn"
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  background: zoomLevel === z ? 'var(--deck-a-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: zoomLevel === z ? '#000' : 'var(--text-secondary)',
                  borderRadius: '3px'
                }}
              >
                {z}X
              </button>
            ))}

            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 8}
              className="dj-btn"
              style={{
                padding: '3px 6px',
                fontSize: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: zoomLevel >= 8 ? 'var(--text-muted)' : '#fff',
                borderRadius: '3px'
              }}
              title="Zoom In (Micro beat grid)"
            >
              <ZoomIn size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual Scrolling Waveform Canvas */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '150px', 
          borderRadius: '6px', 
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <canvas
          ref={canvasRef}
          width={1400}
          height={150}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block', 
            cursor: 'ew-resize' 
          }}
          title="Click or drag anywhere to seek Deck A (top) or Deck B (bottom)"
        />
      </div>
    </div>
  );
};
