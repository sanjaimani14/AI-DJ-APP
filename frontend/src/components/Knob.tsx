import React, { useState, useRef, useEffect } from 'react';

interface KnobProps {
  value: number; // e.g. -26 to +6 or -1 to +1 or 0 to 1
  min: number;
  max: number;
  defaultValue?: number;
  label: string;
  unit?: string;
  size?: number;
  accentColor?: string;
  onChange: (val: number) => void;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  min,
  max,
  defaultValue = (min + max) / 2,
  label,
  unit = '',
  size = 42,
  accentColor = '#00e5ff',
  onChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  // Map value to -135deg to +135deg (270 degree rotation)
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY; // upward drag increases value
      const range = max - min;
      const sensitivity = 0.005; // 200px drag = full range
      const step = deltaY * sensitivity * range;
      const newVal = Math.min(max, Math.max(min, startValRef.current + step));
      onChange(parseFloat(newVal.toFixed(1)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  return (
    <div className="knob-container" style={{ width: size + 16 }}>
      <div 
        className="knob-dial"
        style={{
          width: size,
          height: size,
          borderColor: isDragging ? accentColor : undefined,
          boxShadow: isDragging ? `0 0 10px ${accentColor}` : undefined
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${value}${unit} (Double click to reset)`}
      >
        <div 
          className="knob-pointer"
          style={{
            height: size * 0.32,
            transformOrigin: `50% ${size * 0.4}px`,
            transform: `translateX(-50%) rotate(${angle}deg)`,
            backgroundColor: isDragging ? accentColor : '#ffffff'
          }}
        />
      </div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        {value > 0 && min < 0 ? `+${value}` : value}{unit}
      </div>
    </div>
  );
};
