
import React from 'react';
import { TorchMode } from '../types';

interface TorchButtonProps {
  isActive: boolean;
  onClick: () => void;
  mode: TorchMode;
}

const TorchButton: React.FC<TorchButtonProps> = ({ isActive, onClick, mode }) => {
  const getAccentColor = () => {
    if (!isActive) return '#334155';
    switch (mode) {
      case TorchMode.SOS: return '#ef4444';
      case TorchMode.STROBE: return '#f59e0b';
      case TorchMode.SOUND_REACTIVE: return '#10b981';
      default: return '#0ea5e9';
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <div 
        className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-1000 ${isActive ? 'opacity-20' : 'opacity-0'}`}
        style={{ backgroundColor: getAccentColor() }}
      />
      
      <button
        onClick={onClick}
        className={`relative w-52 h-52 rounded-full glass flex items-center justify-center transition-all duration-500 active:scale-90 shadow-2xl border ${
          isActive ? 'scale-105 border-white/20' : 'scale-100 border-white/5'
        }`}
      >
        <div 
          className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-700 ${
            isActive ? 'bg-white/5' : 'bg-transparent'
          }`}
          style={{ 
            boxShadow: isActive ? `inset 0 0 40px ${getAccentColor()}15` : 'none'
          }}
        >
          <svg 
            className="w-16 h-16 transition-all duration-700"
            style={{ 
              color: getAccentColor(), 
              filter: isActive ? `drop-shadow(0 0 15px ${getAccentColor()}88)` : 'none',
              transform: isActive ? 'scale(1.1)' : 'scale(1)'
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
