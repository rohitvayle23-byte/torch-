
import React from 'react';
import { TorchMode } from '../types';

interface ModeSelectorProps {
  currentMode: TorchMode;
  onModeChange: (mode: TorchMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const modes = [
    { id: TorchMode.NORMAL, icon: 'M13 10V3L4 14H11V21L20 10H13Z', color: 'text-sky-400' },
    { id: TorchMode.STROBE, icon: 'M13 2L3 14h9v8l10-12h-9l9-10z', color: 'text-amber-400' },
    { id: TorchMode.SOUND_REACTIVE, icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', color: 'text-emerald-400' },
    { id: TorchMode.DISCO, icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z', color: 'text-purple-400' },
    { id: TorchMode.MORSE, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863/0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'text-pink-400' }
  ];

  return (
    <div className="flex gap-2 p-1.5 glass rounded-[28px] items-center justify-between px-3 overflow-x-auto no-scrollbar">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
            currentMode === mode.id 
              ? `bg-white/10 ${mode.color} border border-white/10 shadow-lg` 
              : 'text-slate-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
