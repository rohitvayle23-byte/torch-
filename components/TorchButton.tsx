
import React from 'react';
import { TorchMode } from '../types';

interface TorchButtonProps {
  isActive: boolean;
  onClick: () => void;
  mode: TorchMode;
  discoColor?: string;
}

const TorchButton: React.FC<TorchButtonProps> = ({ isActive, onClick, mode, discoColor }) => {
  const getAccentColor = () => {
    if (!isActive && mode !== TorchMode.DISCO) return '#334155';
    switch (mode) {
      case TorchMode.SOS: return '#ef4444';
      case TorchMode.STROBE: return '#f59e0b';
      case TorchMode.SOUND_REACTIVE: return '#10b981';
      case TorchMode.DISCO: return discoColor || '#a855f7';
      case TorchMode.MORSE: return '#ec4899';
      default: return '#0ea5e9';
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <div 
        className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-500 ${isActive || mode === TorchMode.DISCO ? 'opacity-20' : 'opacity-0'}`}
        style={{ backgroundColor: getAccentColor() }}
      />
      
      <button
        onClick={onClick}
        className={`relative w-48 h-48 rounded-full glass flex items-center justify-center transition-all duration-300 shadow-2xl border ${
          isActive || mode === TorchMode.DISCO ? 'border-white/20' : 'border-white/5'
        }`}
      >
        <div 
          className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-500 ${
            isActive ? 'bg-white/5' : 'bg-transparent'
          }`}
          style={{ 
            boxShadow: isActive ? `inset 0 0 40px ${getAccentColor()}15` : 'none'
          }}
        >
          <svg 
            className="w-14 h-14 transition-all duration-500"
            style={{ 
              color: getAccentColor(), 
              filter: isActive || mode === TorchMode.DISCO ? `drop-shadow(0 0 15px ${getAccentColor()}88)` : 'none'
            }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 22.5 12 13.5H3.75z" />
          </svg>
        </div>
        
        {isActive && (
          <div 
            className="absolute inset-2 rounded-full border border-white/10 animate-ring"
            style={{ borderColor: `${getAccentColor()}22` }}
          />
        )}
      </button>
    </div>
  );
};

export default TorchButton;
