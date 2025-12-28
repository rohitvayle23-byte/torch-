
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
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [isSoundTriggerEnabled, setIsSoundTriggerEnabled] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastShakeRef = useRef<number>(0);
  const lastTriggerRef = useRef<number>(0);

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
        ? "Access Denied: Please check browser permissions." 
        : "Hardware Error: Flashlight not detected.";
      setErrorMessage(msg);
      return null;
    }
  }, [stopExistingMedia]);

  const toggleTorch = async (state: boolean) => {
    // Only attempt to init camera if we need to turn the light ON
    if (state && !trackRef.current) {
      const track = await initCamera();
      if (!track) return;
    }

    if (!trackRef.current) return;

    try {
      const capabilities = trackRef.current.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        await trackRef.current.applyConstraints({
          advanced: [{ torch: state }]
        } as any);
      } else if (state) {
        setErrorMessage("Incompatible Device: No flashlight hardware found.");
      }
    } catch (e) {
      console.error("Hardware toggle error", e);
    }
  };

  // Shake detection logic
  useEffect(() => {
    if (!isShakeEnabled) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const threshold = 15;
      const curTime = Date.now();
      
      if ((curTime - lastShakeRef.current) > 1000) {
        const movement = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
        if (movement > threshold) {
          setIsActive(prev => !prev);
          lastShakeRef.current = curTime;
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isShakeEnabled]);

  // Main logic controller
  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      window.clearTimeout(intervalRef.current);
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
            
            // Sound trigger logic (Sound Trigger Toggle)
            if (isSoundTriggerEnabled) {
               if (average > 75 && (Date.now() - lastTriggerRef.current) > 500) {
                  setIsActive(prev => !prev);
                  lastTriggerRef.current = Date.now();
                  return; // Stop processing this turn
               }
            }

            // Normal sound reactive logic
            toggleTorch(average > 45);
            requestAnimationFrame(update);
          };
          update();
        } catch (err) {
          setErrorMessage("Microphone access required for sync.");
        }
      };
      setupAudio();
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        window.clearTimeout(intervalRef.current);
      }
    };
  }, [isActive, mode, strobeSpeed, isSoundTriggerEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const getThemeColor = () => {
    if (!isActive) return 'rgba(14, 165, 233, 0.05)';
    switch (mode) {
      case TorchMode.SOS: return 'rgba(239, 68, 68, 0.1)';
      case TorchMode.STROBE: return 'rgba(245, 158, 11, 0.1)';
      case TorchMode.SOUND_REACTIVE: return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(14, 165, 233, 0.1)';
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-slate-100 transition-all duration-1000 overflow-hidden relative">
      <div className="mesh-gradient" style={{ background: `radial-gradient(circle at 50% 50%, ${getThemeColor()} 0%, transparent 80%)` }} />
      
      <header className="w-full max-w-md flex justify-between items-center py-2 z-20">
        <button onClick={toggleFullscreen} className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 neon-glow animate-pulse"></div>
        <div className="flex gap-2">
           <button 
            onClick={() => setIsShakeEnabled(!isShakeEnabled)}
            className={`p-2 glass rounded-xl transition-all ${isShakeEnabled ? 'text-sky-400 border-sky-500/30' : 'text-slate-500'}`}
            title="Shake to Toggle"
           >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
           </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-4 z-10">
        
        {errorMessage && (
          <div className="glass px-4 py-2 rounded-2xl text-center border-red-500/20 absolute top-16 left-1/2 -translate-x-1/2 w-[80%]">
            <p className="text-[9px] text-red-400 font-bold uppercase tracking-[0.2em]">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="relative w-full aspect-square max-h-[280px] flex items-center justify-center">
          <TorchButton 
            isActive={isActive} 
            onClick={() => { setIsActive(!isActive); setErrorMessage(null); }} 
            mode={mode}
          />
        </div>

        <div className="w-full space-y-4 min-h-[140px] flex flex-col justify-center">
          {mode === TorchMode.STROBE && (
            <div className="glass rounded-[28px] p-5 space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Frequency</span>
                <span className="text-sky-400 font-mono text-xs">{strobeSpeed}ms</span>
              </div>
              <input 
                type="range" min="20" max="1000" step="10"
                value={strobeSpeed}
                onChange={(e) => setStrobeSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          )}

          {mode === TorchMode.SOUND_REACTIVE && (
             <div className="space-y-3">
               <SoundReactiveVisualizer analyser={analyserRef.current} />
               <button 
                onClick={() => setIsSoundTriggerEnabled(!isSoundTriggerEnabled)}
                className={`w-full py-3 glass rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${isSoundTriggerEnabled ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500'}`}
               >
                 {isSoundTriggerEnabled ? 'Clap Trigger Active' : 'Enable Clap Trigger'}
               </button>
             </div>
          )}

          {mode === TorchMode.NORMAL && (
            <ColorLight color={screenLightColor} onChange={setScreenLightColor} />
          )}

          {mode === TorchMode.SOS && (
            <div className="glass rounded-2xl p-4 text-center">
               <span className="text-[10px] text-red-400/70 font-bold uppercase tracking-[0.3em] animate-pulse">Emergency Signal Active</span>
            </div>
          )}
        </div>
      </main>

      <nav className="w-full max-w-md pb-4 z-20">
        <ModeSelector currentMode={mode} onModeChange={(m) => { setMode(m); setIsActive(false); setErrorMessage(null); }} />
      </nav>

      {isActive && mode === TorchMode.NORMAL && (
        <div 
          className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
          style={{ backgroundColor: screenLightColor, opacity: 0.08 }}
        />
      )}
    </div>
  );
};

export default App;
