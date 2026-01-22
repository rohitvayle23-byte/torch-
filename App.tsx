
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TorchMode } from './types';

// Components
import TorchButton from './components/TorchButton';
import ModeSelector from './components/ModeSelector';
import ColorLight from './components/ColorLight';
import SoundReactiveVisualizer from './components/SoundReactiveVisualizer';
import MorseInput from './components/MorseInput';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TorchMode>(TorchMode.NORMAL);
  const [strobeSpeed, setStrobeSpeed] = useState(500);
  const [screenLightColor, setScreenLightColor] = useState("#ffffff");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [isSoundTriggerEnabled, setIsSoundTriggerEnabled] = useState(false);
  const [discoColor, setDiscoColor] = useState("#0ea5e9");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

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
      { video: { facingMode: { exact: 'environment' } } },
      { video: { facingMode: 'environment' } },
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
      setHasPermission(true);
      // Wait for hardware to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      return track;
    } else {
      const isDenied = lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError';
      const msg = isDenied 
        ? "Access Denied: Please allow Camera permissions in Settings." 
        : "Hardware Error: Flashlight not detected.";
      setErrorMessage(msg);
      setHasPermission(false);
      return null;
    }
  }, [stopExistingMedia]);

  const requestInitialAccess = async () => {
    // Calling getUserMedia directly from a user click handler is required for most mobile browsers/APKs
    const track = await initCamera();
    if (track) {
      try {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: false }] } as any);
        }
      } catch(e) {}
    }
  };

  const toggleTorch = async (state: boolean) => {
    if (state && !trackRef.current) {
      const track = await initCamera();
      if (!track) return;
    }

    if (!trackRef.current) return;

    try {
      const capabilities = trackRef.current.getCapabilities() as any;
      if (capabilities && (capabilities.torch || capabilities.fillLightMode)) {
        await trackRef.current.applyConstraints({
          advanced: [{ 
            torch: state, 
            fillLightMode: state ? 'flash' : 'off'
          }]
        } as any);
      } else if (state) {
        setErrorMessage("Torch hardware control not available on this device.");
      }
    } catch (e) {
      console.error("Torch error", e);
      if (state) {
        trackRef.current = null;
        toggleTorch(true);
      }
    }
  };

  useEffect(() => {
    if (!isShakeEnabled) return;
    
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission().then((state: string) => {
        if (state !== 'granted') setIsShakeEnabled(false);
      });
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const threshold = 20;
      const curTime = Date.now();
      if ((curTime - lastShakeRef.current) > 1500) {
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
    } else if (mode === TorchMode.DISCO) {
      const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      let on = true;
      intervalRef.current = window.setInterval(() => {
        on = !on;
        toggleTorch(on);
        if (on) setDiscoColor(colors[Math.floor(Math.random() * colors.length)]);
      }, 150);
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
            if (isSoundTriggerEnabled) {
               if (average > 85 && (Date.now() - lastTriggerRef.current) > 700) {
                  setIsActive(prev => !prev);
                  lastTriggerRef.current = Date.now();
                  return;
               }
            }
            toggleTorch(average > 45);
            requestAnimationFrame(update);
          };
          update();
        } catch (err) {
          setErrorMessage("Mic access required for this mode.");
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
      case TorchMode.SOS: return 'rgba(239, 68, 68, 0.15)';
      case TorchMode.STROBE: return 'rgba(245, 158, 11, 0.15)';
      case TorchMode.SOUND_REACTIVE: return 'rgba(16, 185, 129, 0.15)';
      case TorchMode.DISCO: return discoColor + '22';
      default: return 'rgba(14, 165, 233, 0.15)';
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-slate-100 transition-all duration-1000 overflow-hidden relative">
      <div className="mesh-gradient" style={{ background: `radial-gradient(circle at 50% 50%, ${getThemeColor()} 0%, transparent 80%)` }} />
      
      {hasPermission === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass p-8 rounded-[32px] w-full max-w-sm text-center space-y-6 border-white/10 shadow-2xl">
            <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 22.5 12 13.5H3.75z" /></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Permissions Required</h2>
              <p className="text-slate-400 text-sm leading-relaxed">To use the flashlight, this app needs camera permission. Click the button below to authorize.</p>
            </div>
            <button 
              onClick={requestInitialAccess}
              className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold uppercase tracking-widest transition-colors shadow-lg shadow-sky-600/20"
            >
              Authorize Torch
            </button>
          </div>
        </div>
      )}

      <header className="w-full max-w-md flex justify-between items-center py-2 z-20">
        <button onClick={toggleFullscreen} className="p-3 glass rounded-2xl text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${hasPermission ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
           <span className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">Flash Utility</span>
        </div>
        <button 
          onClick={() => setIsShakeEnabled(!isShakeEnabled)}
          className={`p-3 glass rounded-2xl transition-all ${isShakeEnabled ? 'text-sky-400 border-sky-500/40 neon-glow' : 'text-slate-500'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </button>
      </header>

      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-4 z-10 relative">
        {errorMessage && (
          <div className="glass px-4 py-3 rounded-2xl text-center border-red-500/30 absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[280px] shadow-2xl">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.05em] leading-relaxed">
              {errorMessage}
            </p>
            <button onClick={requestInitialAccess} className="mt-2 text-[10px] text-sky-400 underline uppercase tracking-widest font-bold">Retry Access</button>
          </div>
        )}

        {hasPermission === null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
             <button 
              onClick={requestInitialAccess}
              className="glass px-8 py-4 rounded-3xl text-sky-400 font-bold uppercase tracking-widest border-sky-500/20"
             >
               Start Application
             </button>
          </div>
        )}

        <div className="relative w-full aspect-square max-h-[260px] flex items-center justify-center">
          <TorchButton 
            isActive={isActive} 
            onClick={() => { 
              if (hasPermission !== true) {
                requestInitialAccess().then(() => setIsActive(!isActive));
              } else {
                setIsActive(!isActive); 
                setErrorMessage(null); 
              }
            }} 
            mode={mode}
            discoColor={discoColor}
          />
        </div>

        <div className="w-full space-y-4 min-h-[160px] flex flex-col justify-center">
          {mode === TorchMode.STROBE && (
            <div className="glass rounded-[28px] p-5 space-y-4 shadow-xl">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Strobe Speed</span>
                <span className="text-amber-400 font-mono text-xs">{strobeSpeed}ms</span>
              </div>
              <input 
                type="range" min="30" max="800" step="10"
                value={strobeSpeed}
                onChange={(e) => setStrobeSpeed(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          )}

          {mode === TorchMode.SOUND_REACTIVE && (
             <div className="space-y-3">
               <SoundReactiveVisualizer analyser={analyserRef.current} />
               <button 
                onClick={() => setIsSoundTriggerEnabled(!isSoundTriggerEnabled)}
                className={`w-full py-3 glass rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSoundTriggerEnabled ? 'text-emerald-400 border-emerald-500/40' : 'text-slate-500'}`}
               >
                 {isSoundTriggerEnabled ? 'Audio Trigger Active' : 'Enable Audio Trigger'}
               </button>
             </div>
          )}

          {mode === TorchMode.NORMAL && (
            <ColorLight color={screenLightColor} onChange={setScreenLightColor} />
          )}

          {mode === TorchMode.MORSE && (
             <MorseInput isActive={isActive} onToggleTorch={toggleTorch} />
          )}

          {(mode === TorchMode.SOS || mode === TorchMode.DISCO) && (
            <div className="glass rounded-2xl p-5 text-center border-white/5">
               <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${mode === TorchMode.SOS ? 'text-red-500 animate-pulse' : 'text-sky-400'}`}>
                 {mode === TorchMode.SOS ? 'Distress Signal' : 'Disco Effect'}
               </span>
            </div>
          )}
        </div>
      </main>

      <nav className="w-full max-w-md pb-4 z-20">
        <ModeSelector currentMode={mode} onModeChange={(m) => { setMode(m); setIsActive(false); setErrorMessage(null); }} />
      </nav>

      {(isActive || mode === TorchMode.DISCO) && (
        <div 
          className="fixed inset-0 pointer-events-none transition-all duration-300 z-0"
          style={{ 
            backgroundColor: mode === TorchMode.DISCO ? discoColor : screenLightColor, 
            opacity: isActive ? (mode === TorchMode.DISCO ? 0.2 : 0.08) : 0 
          }}
        />
      )}
    </div>
  );
};

export default App;
