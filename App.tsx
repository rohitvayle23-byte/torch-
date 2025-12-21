
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TorchMode, MoodConfig } from './types';
import { getMoodConfig, generateMorseCode } from './services/geminiService';

// Components
import TorchButton from './components/TorchButton';
import ModeSelector from './components/ModeSelector';
import ColorLight from './components/ColorLight';
import MorseInput from './components/MorseInput';
import SoundReactiveVisualizer from './components/SoundReactiveVisualizer';
import MoodInput from './components/MoodInput';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TorchMode>(TorchMode.NORMAL);
  const [strobeSpeed, setStrobeSpeed] = useState(500);
  const [morseText, setMorseText] = useState("");
  const [moodConfig, setMoodConfig] = useState<MoodConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenLightColor, setScreenLightColor] = useState("#ffffff");

  // Media references
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize camera for torch access
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: mode === TorchMode.SOUND_REACTIVE 
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      return track;
    } catch (err) {
      console.error("Camera access failed", err);
      return null;
    }
  }, [mode]);

  const toggleTorch = async (state: boolean) => {
    if (!trackRef.current) {
      const track = await initCamera();
      if (!track) return;
    }

    try {
      const capabilities = trackRef.current?.getCapabilities() as any;
      if (capabilities?.torch) {
        await trackRef.current?.applyConstraints({
          advanced: [{ torch: state }]
        } as any);
      }
    } catch (e) {
      console.error("Torch toggle failed", e);
    }
  };

  // Logic for different modes
  useEffect(() => {
    // Clear any existing intervals when mode or state changes
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive) {
      toggleTorch(false);
      return;
    }

    if (mode === TorchMode.NORMAL) {
      toggleTorch(true);
    } else if (mode === TorchMode.STROBE) {
      let on = true;
      intervalRef.current = window.setInterval(() => {
        on = !on;
        toggleTorch(on);
      }, strobeSpeed);
    } else if (mode === TorchMode.SOS) {
      // SOS: 3 short, 3 long, 3 short
      const pattern = [200, 200, 200, 200, 200, 500, 600, 200, 600, 200, 600, 500, 200, 200, 200, 200, 200, 1000];
      let step = 0;
      const runSOS = () => {
        const duration = pattern[step % pattern.length];
        const isOn = step % 2 === 0;
        toggleTorch(isOn);
        step++;
        intervalRef.current = window.setTimeout(runSOS, duration);
      };
      runSOS();
    } else if (mode === TorchMode.MORSE && morseText) {
       // Logic handled via a specific sequence execution if needed, but for now we rely on user trigger
    } else if (mode === TorchMode.SOUND_REACTIVE) {
      // Setup audio listener
      const setupAudio = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const update = () => {
          if (mode !== TorchMode.SOUND_REACTIVE || !isActive) return;
          analyserRef.current?.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          // Threshold for flash
          toggleTorch(average > 40);
          requestAnimationFrame(update);
        };
        update();
      };
      setupAudio();
    }

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isActive, mode, strobeSpeed]);

  const handleMoodSubmit = async (prompt: string) => {
    setIsProcessing(true);
    try {
      const config = await getMoodConfig(prompt);
      setMoodConfig(config);
      setScreenLightColor(config.color);
      setMode(TorchMode.MOOD);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMorseSubmit = async (text: string) => {
    setIsProcessing(true);
    try {
      const code = await generateMorseCode(text);
      setMorseText(code);
      // Play morse logic
      const symbols = code.split("");
      let i = 0;
      const playNext = async () => {
        if (i >= symbols.length || mode !== TorchMode.MORSE) {
          toggleTorch(false);
          return;
        }
        const s = symbols[i];
        if (s === ".") {
          await toggleTorch(true);
          setTimeout(() => { toggleTorch(false); i++; setTimeout(playNext, 100); }, 200);
        } else if (s === "-") {
          await toggleTorch(true);
          setTimeout(() => { toggleTorch(false); i++; setTimeout(playNext, 100); }, 600);
        } else {
          i++;
          setTimeout(playNext, 400); // Space
        }
      };
      playNext();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-slate-950 text-slate-100 transition-colors duration-500"
         style={{ backgroundColor: mode === TorchMode.MOOD && isActive ? moodConfig?.color + "11" : undefined }}>
      
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center neon-glow">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14H11V21L20 10H13Z"/></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight neon-text">Lumina AI</h1>
        </div>
        <div className="px-3 py-1 rounded-full glass text-xs font-medium text-sky-400 border border-sky-500/30">
          PRO VERSION
        </div>
      </header>

      {/* Main Action Area */}
      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-8 py-8">
        
        {/* Dynamic Visualizer based on Mode */}
        <div className="relative w-full aspect-square max-h-[300px] flex items-center justify-center">
          {mode === TorchMode.MOOD && isActive && moodConfig && (
            <div className="absolute inset-0 rounded-full animate-pulse blur-3xl" style={{ backgroundColor: moodConfig.color, opacity: 0.3 }}></div>
          )}
          
          <TorchButton 
            isActive={isActive} 
            onClick={() => setIsActive(!isActive)} 
            mode={mode}
            color={mode === TorchMode.MOOD ? moodConfig?.color : undefined}
          />
        </div>

        {/* Mode-Specific Controls */}
        <div className="w-full space-y-6">
          {mode === TorchMode.STROBE && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Strobe Speed</span>
                <span className="text-sky-400">{strobeSpeed}ms</span>
              </div>
              <input 
                type="range" min="50" max="2000" step="50"
                value={strobeSpeed}
                onChange={(e) => setStrobeSpeed(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          )}

          {mode === TorchMode.MORSE && (
            <MorseInput onSend={handleMorseSubmit} isProcessing={isProcessing} />
          )}

          {mode === TorchMode.MOOD && (
            <MoodInput onSend={handleMoodSubmit} isProcessing={isProcessing} currentMood={moodConfig?.description} />
          )}

          {mode === TorchMode.SOUND_REACTIVE && isActive && (
             <SoundReactiveVisualizer analyser={analyserRef.current} />
          )}

          {mode === TorchMode.NORMAL && (
            <ColorLight color={screenLightColor} onChange={setScreenLightColor} />
          )}
        </div>
      </main>

      {/* Mode Selector Navigation (Sticky) */}
      <nav className="w-full max-w-md pb-4">
        <ModeSelector currentMode={mode} onModeChange={(m) => { setMode(m); setIsActive(false); }} />
      </nav>

      {/* Screen Light Layer (Fullscreen Overlay if requested) */}
      {mode === TorchMode.MOOD && isActive && (
        <div 
          className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
          style={{ 
            background: `radial-gradient(circle at center, ${moodConfig?.color}22 0%, transparent 70%)`,
            zIndex: -1
          }}
        />
      )}
    </div>
  );
};

export default App;
