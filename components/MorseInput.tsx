
import React, { useState, useRef } from 'react';

const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.', '0': '-----', ' ': '/'
};

interface MorseInputProps {
  isActive: boolean;
  onToggleTorch: (state: boolean) => Promise<void>;
}

const MorseInput: React.FC<MorseInputProps> = ({ onToggleTorch }) => {
  const [text, setText] = useState('HELP');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const transmissionRef = useRef<boolean>(false);

  const unit = 200; // ms

  const transmit = async () => {
    if (isTransmitting) {
      transmissionRef.current = false;
      setIsTransmitting(false);
      return;
    }

    setIsTransmitting(true);
    transmissionRef.current = true;
    const code = text.toUpperCase().split('').map(char => MORSE_CODE[char] || '').join(' ');

    for (let i = 0; i < code.length && transmissionRef.current; i++) {
      const char = code[i];
      if (char === '.') {
        await onToggleTorch(true);
        await new Promise(r => setTimeout(r, unit));
        await onToggleTorch(false);
        await new Promise(r => setTimeout(r, unit));
      } else if (char === '-') {
        await onToggleTorch(true);
        await new Promise(r => setTimeout(r, unit * 3));
        await onToggleTorch(false);
        await new Promise(r => setTimeout(r, unit));
      } else if (char === ' ') {
        await new Promise(r => setTimeout(r, unit * 2)); 
      } else if (char === '/') {
        await new Promise(r => setTimeout(r, unit * 6)); 
      }
    }
    
    setIsTransmitting(false);
    transmissionRef.current = false;
    await onToggleTorch(false);
  };

  return (
    <div className="glass rounded-[28px] p-4 space-y-3 shadow-xl border-pink-500/10">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-500/80">Morse Signal</span>
      </div>
      <div className="flex gap-2">
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 15))}
          disabled={isTransmitting}
          placeholder="Enter message..."
          className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-pink-500/50 transition-colors"
        />
        <button 
          onClick={transmit}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            isTransmitting ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'glass text-pink-400'
          }`}
        >
          {isTransmitting ? 'Stop' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default MorseInput;
