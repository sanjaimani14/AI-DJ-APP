import React from 'react';

interface VUMeterProps {
  levelLeft: number; // 0.0 to 1.0
  levelRight: number; // 0.0 to 1.0
  segments?: number;
  height?: number;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  levelLeft,
  levelRight,
  segments = 12,
  height = 120
}) => {
  const renderLadder = (level: number) => {
    const bars = [];
    for (let i = 0; i < segments; i++) {
      const threshold = i / segments;
      const isActive = level >= threshold;
      
      let colorClass = 'vu-green';
      if (i >= segments - 2) {
        colorClass = 'vu-red'; // Peak clip warning
      } else if (i >= segments - 4) {
        colorClass = 'vu-amber'; // Headroom warning
      }

      bars.push(
        <div 
          key={i} 
          className={`vu-segment ${colorClass} ${isActive ? 'active' : ''}`}
        />
      );
    }
    return bars;
  };

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      <div className="vu-bar" style={{ height }}>
        {renderLadder(levelLeft)}
      </div>
      <div className="vu-bar" style={{ height }}>
        {renderLadder(levelRight)}
      </div>
    </div>
  );
};
