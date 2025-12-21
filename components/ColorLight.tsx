
import React from 'react';

interface ColorLightProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorLight: React.FC<ColorLightProps> = ({ color, onChange }) => {
  const colors = ["#ffffff", "#fef9c3", "#fee2e2", "#dcfce7", "#dbeafe", "#f5d0fe"];

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Screen Softlight</p>
      <div className="flex justify-between items-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-10 h-10 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-white' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input 
          type="color" 
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-full bg-transparent border-none cursor-pointer p-0 overflow-hidden"
        />
      </div>
    </div>
  );
};

export default ColorLight;
