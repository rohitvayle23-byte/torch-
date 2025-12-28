
import React from 'react';
import { TorchMode } from '../types';

interface ModeSelectorProps {
  currentMode: TorchMode;
  onModeChange: (mode: TorchMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const modes = [
    { id: TorchMode.NORMAL, label: 'Flash', icon: 'M13 10V3L4 14H11V21L20 10H13Z' },
    { id: TorchMode.STROBE, label: 'Strobe', icon: 'M13 2L3 14h9v8l10-12h-9l9-10z' },
    { id: TorchMode.SOS, label: 'SOS', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: TorchMode.SOUND_REACTIVE, label: 'Beat', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' }
  ];

  return (
    <div className="flex overflow-x-auto gap-2 p-2 no-scrollbar glass rounded-3xl items-center justify-around">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-2xl transition-all duration-300 ${
            currentMode === mode.id 
              ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/50' 
              : 'text-slate-500 hover:bg-white/5'
          }`}
        >
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tighter">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
