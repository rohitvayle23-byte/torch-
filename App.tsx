
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TorchMode } from './types';

// Components
import TorchButton from './components/TorchButton';
import ModeSelector from './components/ModeSelector';
import ColorLight from './components/ColorLight';
import SoundReactiveVisualizer from './components/SoundReactiveVisualizer';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TorchMode>(TorchMode.NORMAL);
  const [strobeSpeed, setStrobeSpeed] = useState(500);
  const [screenLightColor, setScreenLightColor] = useState("#ffffff");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Media references
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stopExistingMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
  }, []);

  const initCamera = useCallback(async () => {
    setErrorMessage(null);
    stopExistingMedia();

    const constraintSequences: MediaStreamConstraints[] = [
      { video: { facingMode: 'environment' } },
      { video: { facingMode: { ideal: 'environment' } } },
      { video: true }
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintSequences) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (e) {
        lastError = e;
      }
    }

    if (stream) {
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      return track;
    } else {
      const msg = lastError?.name === 'NotAllowedError' 
        ? "Permission denied. Please allow camera access." 
        : "No camera detected.";
      setErrorMessage(msg);
      return null;
    }
  }, [stopExistingMedia]);

  const toggleTorch = async (state: boolean) => {
    if (state && !trackRef.current) {
      const track = await initCamera();
      if (!track) return;
    }

    if (!trackRef.current) return;

    try {
      if (typeof trackRef.current.getCapabilities !== 'function') {
        if (state) setErrorMessage("Flashlight control not supported here.");
        return;
      }

      const capabilities = trackRef.current.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        await trackRef.current.applyConstraints({
          advanced: [{ torch: state }]
        } as any);
      } else if (state) {
        setErrorMessage("Flashlight hardware not found.");
      }
    } catch (e) {
      console.error("Torch toggle failed", e);
    }
  };

  useEffect(() => {
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
      const pattern = [200, 200, 200, 200, 200, 500, 600, 200, 600, 200, 600, 500, 200, 200, 200, 200, 200, 1000];
      let step = 0;
      const runSOS = () => {
        if (!isActive || mode !== TorchMode.SOS) return;
        const duration = pattern[step % pattern.length];
        const isOn = step % 2 === 0;
        toggleTorch(isOn);
        step++;
        intervalRef.current = window.setTimeout(runSOS, duration);
      };
      runSOS();
    } else if (mode === TorchMode.SOUND_REACTIVE) {
      const setupAudio = async () => {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(audioStream);
          source.connect(analyserRef.current);
          analyserRef.current.fftSize = 256;
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const update = () => {
            if (mode !== TorchMode.SOUND_REACTIVE || !isActive) return;
            analyserRef.current?.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            toggleTorch(average > 45);
            requestAnimationFrame(update);
          };
          update();
        } catch (err) {
          setErrorMessage("Microphone access required for Beat mode.");
        }
      };
      setupAudio();
    }

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isActive, mode, strobeSpeed]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-slate-950 text-slate-100 transition-colors duration-1000 overflow-hidden relative">
      
      <header className="w-full max-w-md flex justify-between items-center py-4 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center neon-glow">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14H11V21L20 10H13Z"/></svg>
          </div>
          <h1 className="text-xl font-bold tracking-widest neon-text uppercase">Torch</h1>
        </div>
        <div className="px-3 py-1 rounded-full glass text-[10px] font-bold text-sky-400 border border-sky-500/30 tracking-widest uppercase">
          Pro
        </div>
      </header>

      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-8 py-8 z-10">
        
        {errorMessage && (
          <div className="w-full glass border-red-500/20 bg-red-500/10 px-4 py-3 rounded-xl text-center animate-pulse">
            <p className="text-xs text-red-400 font-bold uppercase tracking-tight">{errorMessage}</p>
          </div>
        )}

        <div className="relative w-full aspect-square max-h-[280px] flex items-center justify-center">
          <TorchButton 
            isActive={isActive} 
            onClick={() => { setIsActive(!isActive); setErrorMessage(null); }} 
            mode={mode}
          />
        </div>

        <div className="w-full space-y-6">
          {mode === TorchMode.STROBE && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Frequency</span>
                <span className="text-sky-400 font-mono">{strobeSpeed}ms</span>
              </div>
              <input 
                type="range" min="50" max="1500" step="50"
                value={strobeSpeed}
                onChange={(e) => setStrobeSpeed(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          )}

          {mode === TorchMode.SOUND_REACTIVE && isActive && (
             <SoundReactiveVisualizer analyser={analyserRef.current} />
          )}

          {mode === TorchMode.NORMAL && (
            <ColorLight color={screenLightColor} onChange={setScreenLightColor} />
          )}
        </div>
      </main>

      <nav className="w-full max-w-md pb-4 z-20">
        <ModeSelector currentMode={mode} onModeChange={(m) => { setMode(m); setIsActive(false); setErrorMessage(null); }} />
      </nav>

      {mode === TorchMode.NORMAL && isActive && (
        <div 
          className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
          style={{ 
            backgroundColor: screenLightColor,
            opacity: 0.08
          }}
        />
      )}
    </div>
  );
};

export default App;
