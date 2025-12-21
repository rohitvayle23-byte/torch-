
import React, { useState } from 'react';

interface MorseInputProps {
  onSend: (text: string) => void;
  isProcessing: boolean;
}

const MorseInput: React.FC<MorseInputProps> = ({ onSend, isProcessing }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) onSend(text);
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">AI Morse Translator</p>
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter message to transmit..."
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500/50 transition-colors"
        />
        <button 
          disabled={isProcessing || !text}
          className="absolute right-2 top-2 bottom-2 bg-sky-500 text-white px-4 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-sky-400"
        >
          {isProcessing ? 'Thinking...' : 'Transmit'}
        </button>
      </div>
    </form>
  );
};

export default MorseInput;
