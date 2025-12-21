
import React, { useState } from 'react';

interface MoodInputProps {
  onSend: (prompt: string) => void;
  isProcessing: boolean;
  currentMood?: string;
}

const MoodInput: React.FC<MoodInputProps> = ({ onSend, isProcessing, currentMood }) => {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) onSend(prompt);
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">AI Mood Lighting</p>
        <p className="text-[10px] text-slate-500">Describe a feeling to adjust the light.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 'Cozy fireplace at night' or 'Deep ocean silence'"
          rows={2}
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
        />
        <button 
          disabled={isProcessing || !prompt}
          className="w-full bg-gradient-to-r from-purple-600 to-sky-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all hover:opacity-90 shadow-lg shadow-purple-500/20"
        >
          {isProcessing ? 'Generating Vibe...' : 'Sync Atmosphere'}
        </button>
      </form>

      {currentMood && !isProcessing && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-[10px] italic text-sky-400">"{currentMood}"</p>
        </div>
      )}
    </div>
  );
};

export default MoodInput;
