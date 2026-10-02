import React, { useState, useMemo } from 'react';
import type { EventProfile, Track } from '../types/dj';
import { 
  EnergyManager, 
  type EnergyConfig, 
  type EnergyLevel, 
  type PlaylistSimulationResult 
} from '../services/energyManager';
import { 
  Zap, 
  TrendingUp, 
  Sliders, 
  PlayCircle, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles
} from 'lucide-react';

interface EnergyManagerPanelProps {
  currentTrackEnergy: number; // 0.0 to 1.0
  elapsedSeconds: number;     // Current live set elapsed time in seconds
  tracks: Track[];            // Library / Playlist tracks to simulate
  config: EnergyConfig;
  onConfigChange: (newConfig: EnergyConfig) => void;
  onProfileSelect: (profile: EventProfile) => void;
}

export const EnergyManagerPanel: React.FC<EnergyManagerPanelProps> = ({
  currentTrackEnergy,
  elapsedSeconds,
  tracks,
  config,
  onConfigChange,
  onProfileSelect
}) => {
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<PlaylistSimulationResult | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ minute: number; energy: number; level: EnergyLevel } | null>(null);

  const elapsedMinutes = elapsedSeconds / 60;
  const currentTargetEnergy = EnergyManager.getTargetEnergyAtElapsed(config, elapsedMinutes);
  const currentLevel = EnergyManager.getEnergyLevel(currentTrackEnergy);
  const targetLevel = EnergyManager.getEnergyLevel(currentTargetEnergy);

  // Generate 40 curve points for high-resolution SVG rendering
  const curvePoints = useMemo(() => {
    return EnergyManager.generateCurve(config, 40);
  }, [config]);

  // Profile presets
  const profiles: { id: EventProfile; label: string; desc: string }[] = [
    { id: 'Chill', label: 'Chill', desc: 'Warm 0.35 ➔ 0.52 peak' },
    { id: 'Party', label: 'Party', desc: 'Groovy 0.60 ➔ 0.88 peak' },
    { id: 'High Energy', label: 'High Energy', desc: 'Intense 0.75 ➔ 0.98 peak' },
    { id: 'EDM', label: 'EDM', desc: 'Festival 0.68 ➔ 0.95 peak' },
    { id: 'Tamil / Kuthu', label: 'Tamil/Kuthu', desc: 'Folk Beat 0.70 ➔ 0.96 peak' },
    { id: 'Romantic', label: 'Romantic', desc: 'Mellow 0.30 ➔ 0.55 peak' },
    { id: 'Custom', label: 'Custom', desc: 'User Definable' }
  ];

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 180;
  const padding = { top: 20, right: 30, bottom: 28, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Scale helpers
  const scaleX = (minute: number) => {
    const duration = Math.max(1, config.eventDurationMinutes);
    return padding.left + (minute / duration) * graphWidth;
  };

  const scaleY = (energy: number) => {
    const clamped = Math.max(0, Math.min(1, energy));
    return padding.top + (1.0 - clamped) * graphHeight;
  };

  // Build SVG path d attribute
  const pathD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    return curvePoints.reduce((acc, pt, idx) => {
      const x = scaleX(pt.minute);
      const y = scaleY(pt.targetEnergy);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [curvePoints, config.eventDurationMinutes]);

  // Build SVG area fill path
  const areaD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    const firstX = scaleX(curvePoints[0].minute);
    const lastX = scaleX(curvePoints[curvePoints.length - 1].minute);
    const baseY = scaleY(0);
    return `${pathD} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`;
  }, [pathD, curvePoints, config.eventDurationMinutes]);

  // Current playhead position
  const playheadX = scaleX(Math.min(config.eventDurationMinutes, elapsedMinutes));
  const peakTimeX = scaleX(Math.min(config.eventDurationMinutes, config.peakTimeMinutes));

  // Handle configuration updates
  const handleUpdate = (partial: Partial<EnergyConfig>) => {
    onConfigChange({
      ...config,
      ...partial
    });
  };

  // Run Playlist Simulation test
  const handleRunSimulation = () => {
    const result = EnergyManager.simulatePlaylistEnergyPlan(tracks, config);
    setSimulationResult(result);
    setShowSimulator(true);
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        border: '1px solid rgba(0, 255, 136, 0.28)',
        background: 'linear-gradient(180deg, rgba(14, 20, 32, 0.98) 0%, rgba(8, 12, 18, 0.99) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
      }}
    >
      {/* 1. TOP HEADER & PROFILES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--ai-primary) 0%, #00b359 100%)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0, 255, 136, 0.4)'
          }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '1px', color: '#fff' }}>
                PHASE 9 — AI ENERGY MANAGEMENT
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 255, 136, 0.15)',
                color: 'var(--ai-primary)',
                border: '1px solid var(--ai-primary)'
              }}>
                ACTIVE S-CURVE PLANNER
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Continuous Hermite S-Curve • 0.0 to 1.0 Energy Bounds • Jump Prevention • Dynamic Playlist Sequencing
            </div>
          </div>
        </div>

        {/* Profile Preset Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {profiles.map((p) => {
            const isSelected = config.profile === p.id || (p.id === 'Tamil / Kuthu' && config.profile === 'Tamil/Kuthu');
            return (
              <button
                key={p.id}
                onClick={() => onProfileSelect(p.id)}
                className="dj-btn"
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: isSelected ? 'var(--ai-primary)' : 'rgba(255,255,255,0.05)',
                  color: isSelected ? '#000' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--ai-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={p.desc}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. REAL-TIME ENERGY GAUGES (CURRENT ENERGY vs TARGET ENERGY) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        {/* CURRENT ENERGY GAUGE */}
        <div style={{
          background: 'rgba(7, 10, 16, 0.85)',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px' }}>
              CURRENT ENERGY
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '4px',
              background: `${EnergyManager.getEnergyColor(currentLevel)}22`,
              color: EnergyManager.getEnergyColor(currentLevel),
              border: `1px solid ${EnergyManager.getEnergyColor(currentLevel)}`
            }}>
              {currentLevel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '26px',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              color: EnergyManager.getEnergyColor(currentLevel)
            }}>
              {currentTrackEnergy.toFixed(2)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ({Math.round(currentTrackEnergy * 100)}%)
            </span>
          </div>

          {/* Segmented Real-time VU bar */}
          <div style={{
            height: '8px',
            width: '100%',
            background: '#040609',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round(currentTrackEnergy * 100)}%`,
              background: `linear-gradient(90deg, #00e5ff 0%, #00ff88 40%, #ff9100 70%, #ff007f 100%)`,
              boxShadow: `0 0 10px ${EnergyManager.getEnergyColor(currentLevel)}`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* TARGET ENERGY GAUGE */}
        <div style={{
          background: 'rgba(7, 10, 16, 0.85)',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px' }}>
              TARGET ENERGY (CURVE)
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '4px',
              background: `${EnergyManager.getEnergyColor(targetLevel)}22`,
              color: EnergyManager.getEnergyColor(targetLevel),
              border: `1px solid ${EnergyManager.getEnergyColor(targetLevel)}`
            }}>
              {targetLevel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '26px',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              color: '#00ff88'
            }}>
              {currentTargetEnergy.toFixed(2)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              @ {Math.round(elapsedMinutes)}m / {config.eventDurationMinutes}m
            </span>
          </div>

          {/* Target energy indicator bar with live delta */}
          <div style={{
            height: '8px',
            width: '100%',
            background: '#040609',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round(currentTargetEnergy * 100)}%`,
              background: '#00ff88',
              boxShadow: '0 0 10px rgba(0, 255, 136, 0.7)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* ENERGY TIERS & JUMP STATUS */}
        <div style={{
          background: 'rgba(7, 10, 16, 0.85)',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>
              TRANSITION JUMP FILTER
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              background: !config.allowJumps ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 145, 0, 0.15)',
              color: !config.allowJumps ? '#00ff88' : '#ff9100',
              border: `1px solid ${!config.allowJumps ? '#00ff88' : '#ff9100'}`
            }}>
              {!config.allowJumps ? 'JUMP PREVENTION ACTIVE' : 'UNRESTRICTED'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: '#00e5ff18', color: '#00e5ff', border: '1px solid #00e5ff44' }}>
              LOW: 0.00-0.39
            </span>
            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: '#00ff8818', color: '#00ff88', border: '1px solid #00ff8844' }}>
              MED: 0.40-0.69
            </span>
            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: '#ff910018', color: '#ff9100', border: '1px solid #ff910044' }}>
              HIGH: 0.70-0.84
            </span>
            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: '#ff007f18', color: '#ff007f', border: '1px solid #ff007f44' }}>
              PEAK: 0.85-1.00
            </span>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} color={!config.allowJumps ? '#00ff88' : '#ff9100'} />
            {!config.allowJumps 
              ? 'Max safe step <= 0.20 delta (Avoids jarring energy spikes)' 
              : 'User requested: sudden jumps/drops permitted'}
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE ENERGY CURVE (SVG GRAPH) */}
      <div style={{
        background: '#05080e',
        borderRadius: '8px',
        padding: '12px 14px',
        border: '1px solid var(--border-subtle)',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} color="var(--ai-primary)" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
              ENERGY CURVE VISUALIZER
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              (Hermite Smoothstep S-Curve Ramp ➔ Peak @ {config.peakTimeMinutes}m ➔ Plateau)
            </span>
          </div>

          {hoveredPoint && (
            <div style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(0, 255, 136, 0.2)',
              color: '#00ff88',
              border: '1px solid var(--ai-primary)'
            }}>
              Minute {hoveredPoint.minute}m: Target {hoveredPoint.energy.toFixed(2)} ({hoveredPoint.level})
            </div>
          )}
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <defs>
              <linearGradient id="energyCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
                <stop offset="35%" stopColor="#00ff88" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#ff9100" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ff007f" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="energyAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ff88" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#00e5ff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines for energy tiers */}
            {[
              { val: 1.0, label: '1.0' },
              { val: 0.85, label: '0.85 PEAK', color: '#ff007f' },
              { val: 0.70, label: '0.70 HIGH', color: '#ff9100' },
              { val: 0.40, label: '0.40 MED', color: '#00ff88' },
              { val: 0.0, label: '0.0 LOW', color: '#00e5ff' }
            ].map((grid) => {
              const y = scaleY(grid.val);
              return (
                <g key={grid.val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke={grid.color ? `${grid.color}33` : 'rgba(255,255,255,0.06)'}
                    strokeDasharray={grid.val > 0 && grid.val < 1 ? '3 3' : 'none'}
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill={grid.color || 'var(--text-muted)'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {grid.label}
                  </text>
                </g>
              );
            })}

            {/* Timeline X-axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const min = Math.round(config.eventDurationMinutes * frac);
              const x = scaleX(min);
              return (
                <g key={frac}>
                  <line
                    x1={x}
                    y1={scaleY(0)}
                    x2={x}
                    y2={scaleY(0) + 4}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={scaleY(0) + 16}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {min}m
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#energyAreaGradient)" />

            {/* S-Curve Line */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#energyCurveGradient)"
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* Peak Time Indicator */}
            <line
              x1={peakTimeX}
              y1={padding.top}
              x2={peakTimeX}
              y2={scaleY(0)}
              stroke="#ff007f"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <text
              x={peakTimeX}
              y={padding.top - 6}
              textAnchor="middle"
              fill="#ff007f"
              fontSize="9"
              fontWeight="800"
            >
              PEAK @ {config.peakTimeMinutes}m
            </text>

            {/* Current Playhead Vertical Marker */}
            <line
              x1={playheadX}
              y1={padding.top}
              x2={playheadX}
              y2={scaleY(0)}
              stroke="#00ff88"
              strokeWidth={2}
            />
            <circle
              cx={playheadX}
              cy={scaleY(currentTargetEnergy)}
              r={5}
              fill="#00ff88"
              stroke="#000"
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 6px #00ff88)' }}
            />
            <text
              x={playheadX}
              y={scaleY(0) + 24}
              textAnchor="middle"
              fill="#00ff88"
              fontSize="9"
              fontWeight="900"
              fontFamily="monospace"
            >
              LIVE
            </text>

            {/* Interactive curve probe points */}
            {curvePoints.map((pt, i) => {
              if (i % 2 !== 0) return null; // Show every other point for clean spacing
              const x = scaleX(pt.minute);
              const y = scaleY(pt.targetEnergy);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3}
                  fill={EnergyManager.getEnergyColor(pt.level)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint({ minute: pt.minute, energy: pt.targetEnergy, level: pt.level })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* 4. USER CONTROLS: START, TARGET, DURATION, PEAK TIME & JUMP PREVENTION */}
      <div style={{
        background: 'rgba(7, 10, 16, 0.85)',
        borderRadius: '8px',
        padding: '12px 14px',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} color="var(--ai-primary)" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
              ENERGY CURVE PARAMETERS
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Avoid sudden inappropriate jumps toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: config.allowJumps ? '#ff9100' : 'var(--ai-primary)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={!config.allowJumps}
                onChange={(e) => handleUpdate({ allowJumps: !e.target.checked })}
                style={{ accentColor: '#00ff88', cursor: 'pointer' }}
              />
              Avoid Sudden Inappropriate Jumps (&gt; 0.20 Delta)
            </label>

            {/* Test with Playlist Button */}
            <button
              onClick={handleRunSimulation}
              className="dj-btn glow-ai"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 900,
                background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.25) 0%, rgba(0, 179, 89, 0.35) 100%)',
                color: 'var(--ai-primary)',
                border: '1px solid var(--ai-primary)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              title="Simulate sequential track selection along this energy curve"
            >
              <PlayCircle size={13} />
              TEST WITH PLAYLIST ({tracks.length} TRACKS)
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}>
          {/* START ENERGY SLIDER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>START ENERGY</span>
              <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: EnergyManager.getEnergyColor(EnergyManager.getEnergyLevel(config.startEnergy)) }}>
                {config.startEnergy.toFixed(2)} ({EnergyManager.getEnergyLevel(config.startEnergy)})
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={config.startEnergy}
              onChange={(e) => handleUpdate({ startEnergy: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--deck-a-primary)', cursor: 'pointer' }}
            />
          </div>

          {/* TARGET ENERGY SLIDER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>TARGET ENERGY (PEAK)</span>
              <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: EnergyManager.getEnergyColor(EnergyManager.getEnergyLevel(config.targetEnergy)) }}>
                {config.targetEnergy.toFixed(2)} ({EnergyManager.getEnergyLevel(config.targetEnergy)})
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={config.targetEnergy}
              onChange={(e) => handleUpdate({ targetEnergy: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#ff007f', cursor: 'pointer' }}
            />
          </div>

          {/* EVENT DURATION SLIDER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>EVENT DURATION</span>
              <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                {config.eventDurationMinutes} min
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="240"
              step="5"
              value={config.eventDurationMinutes}
              onChange={(e) => {
                const duration = parseInt(e.target.value, 10);
                const peak = Math.min(config.peakTimeMinutes, duration);
                handleUpdate({ eventDurationMinutes: duration, peakTimeMinutes: peak });
              }}
              style={{ width: '100%', accentColor: 'var(--ai-primary)', cursor: 'pointer' }}
            />
          </div>

          {/* PEAK TIME SLIDER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>PEAK TIME</span>
              <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ff9100' }}>
                {config.peakTimeMinutes} min ({Math.round((config.peakTimeMinutes / Math.max(1, config.eventDurationMinutes)) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max={config.eventDurationMinutes}
              step="5"
              value={config.peakTimeMinutes}
              onChange={(e) => handleUpdate({ peakTimeMinutes: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#ff9100', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* 5. PLAYLIST SIMULATION RESULTS MODAL/VIEW */}
      {showSimulator && simulationResult && (
        <div style={{
          background: 'rgba(5, 8, 14, 0.95)',
          borderRadius: '8px',
          padding: '14px 16px',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--ai-primary)" />
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>
                PLAYLIST ENERGY SIMULATION RESULTS
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 255, 136, 0.2)',
                color: 'var(--ai-primary)'
              }}>
                SMOOTHNESS: {simulationResult.smoothnessScorePercent}%
              </span>
            </div>

            <button
              onClick={() => setShowSimulator(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              CLOSE
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {simulationResult.summary}
          </div>

          {/* Sequence Table */}
          <div style={{
            maxHeight: '220px',
            overflowY: 'auto',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px' }}>#</th>
                  <th style={{ padding: '6px 10px' }}>TIME</th>
                  <th style={{ padding: '6px 10px' }}>TRACK</th>
                  <th style={{ padding: '6px 10px' }}>ENERGY</th>
                  <th style={{ padding: '6px 10px' }}>TARGET</th>
                  <th style={{ padding: '6px 10px' }}>DELTA</th>
                  <th style={{ padding: '6px 10px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {simulationResult.plannedSequence.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {item.minuteTimestamp}m
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: '#fff' }}>
                      {item.track.title}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        by {item.track.artist}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        background: `${EnergyManager.getEnergyColor(item.energyLevel)}22`,
                        color: EnergyManager.getEnergyColor(item.energyLevel)
                      }}>
                        {item.actualEnergy.toFixed(2)} ({item.energyLevel})
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {item.curveTargetEnergy.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: item.deltaFromTarget <= 0.15 ? '#00ff88' : '#ff9100' }}>
                      {item.deltaFromTarget.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {item.isSmoothTransition ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00ff88', fontSize: '10px', fontWeight: 700 }}>
                          <CheckCircle size={11} /> Smooth
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff9100', fontSize: '10px', fontWeight: 700 }}>
                          <AlertTriangle size={11} /> Sudden Jump
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
