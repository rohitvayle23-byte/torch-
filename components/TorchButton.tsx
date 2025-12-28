
import React from 'react';
import { TorchMode } from '../types';

interface TorchButtonProps {
  isActive: boolean;
  onClick: () => void;
  mode: TorchMode;
}

const TorchButton: React.FC<TorchButtonProps> = ({ isActive, onClick, mode }) => {
  const getGlowColor = () => {
    if (!isActive) return 'rgba(255, 255, 255, 0.1)';
    switch (mode) {
      case TorchMode.SOS: return '#ef4444';
      case TorchMode.STROBE: return '#f59e0b';
      case TorchMode.SOUND_REACTIVE: return '#10b981';
      default: return '#0ea5e9';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${
        isActive ? 'scale-105' : 'scale-100'
      }`}
      style={{
        background: isActive ? `radial-gradient(circle, ${getGlowColor()}44 0%, transparent 70%)` : 'transparent'
      }}
    >
      <div 
        className={`w-36 h-36 rounded-full glass border-2 flex flex-col items-center justify-center gap-2 shadow-2xl transition-all duration-300 ${
          isActive ? 'border-white/40 neon-glow' : 'border-white/10'
        }`}
        style={{
          boxShadow: isActive ? `0 0 40px ${getGlowColor()}66` : 'none',
          borderColor: isActive ? getGlowColor() : undefined
        }}
      >
        <svg 
          className={`w-12 h-12 transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-600'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 22.5 12 13.5H3.75z" />
        </svg>
        <span className={`text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-600'}`}>
          {isActive ? 'Active' : 'Power'}
        </span>
      </div>

      <div className={`absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite] ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className={`absolute -inset-4 rounded-full border border-white/5 animate-[spin_15s_linear_reverse_infinite] ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
    </button>
  );
};

export default TorchButton;
