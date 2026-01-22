
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
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastShakeRef = useRef<number>(0);
  const lastTriggerRef = useRef<number>(0);

  const triggerHaptic = (ms = 40) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };

  const stopExistingMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    trackRef.current = null;
  }, []);

  const initCamera = useCallback(async () => {
    setErrorMessage(null);
    
    // Check if current track is still valid
    if (trackRef.current && trackRef.current.readyState === 'live') {
      return trackRef.current;
    }

    stopExistingMedia();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Your browser does not support camera access.");
      setHasPermission(false);
      return null;
    }

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
        console.warn('Constraint failed:', constraints, e);
      }
    }

    if (stream) {
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          // Explicitly play the video - some browsers require consumption of the stream to enable torch
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video sink playback failed:', e);
        }
      }

      setHasPermission(true);
      return track;
    } else {
      const isDenied = lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError' || lastError?.name === 'SecurityError';
      const msg = isDenied 
        ? "Permission Denied: Please enable camera access in your browser or device settings." 
        : "Hardware Busy: Another app is using the camera or the device doesn't have a flash.";
      setErrorMessage(msg);
      setHasPermission(false);
      return null;
    }
  }, [stopExistingMedia]);

  const requestInitialAccess = async () => {
    triggerHaptic(60);
    const track = await initCamera();
    return !!track;
  };

  const applyTorch = async (state: boolean) => {
    let track = trackRef.current;
    
    if (state && (!track || track.readyState !== 'live')) {
      track = await initCamera();
    }

    if (!track) return false;

    try {
      const constraints = {
        advanced: [{ 
          torch: state,
          fillLightMode: state ? 'flash' : 'off'
        }]
      };
      // Most modern mobile browsers support 'torch' in advanced constraints
      await track.applyConstraints(constraints as any);
      return true;
    } catch (e) {
      console.error("Torch apply failed:", e);
      // Fallback for some older implementations
      try {
        await track.applyConstraints({ advanced: [{ torch: state }] } as any);
        return true;
      } catch (err) {
        if (state) {
          setErrorMessage("Hardware doesn't support Torch control through this browser.");
        }
        return false;
      }
    }
  };

  const toggleTorch = async (state: boolean) => {
    await applyTorch(state);
  };

  // Battery monitoring
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const update = () => setBatteryLevel(Math.round(battery.level * 100));
        update();
        battery.addEventListener('levelchange', update);
        return () => battery.removeEventListener('levelchange', update);
      });
    }
  }, []);

  // Main interaction loop
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
               if (average > 88 && (Date.now() - lastTriggerRef.current) > 700) {
                  triggerHaptic(50);
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
          setErrorMessage("Microphone access is needed for Sound Sync.");
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

  // Shake detector
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
      const threshold = 22;
      const curTime = Date.now();
      if ((curTime - lastShakeRef.current) > 1500) {
        const movement = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
        if (movement > threshold) {
          triggerHaptic(100);
          setIsActive(prev => !prev);
          lastShakeRef.current = curTime;
        }
      }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isShakeEnabled]);

  const toggleFullscreen = () => {
    triggerHaptic(30);
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
      {/* 
          Hidden Video Sink:
          Vital for many browsers to acknowledge the camera stream as "active" 
          which unlocks the torch constraint. We use a 1x1 size to ensure 
          it's technically visible but invisible to the user.
      */}
      <video 
        ref={videoRef} 
        className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none" 
        playsInline 
        muted 
        autoPlay 
      />

      <div className="mesh-gradient" style={{ background: `radial-gradient(circle at 50% 50%, ${getThemeColor()} 0%, transparent 80%)` }} />
      
      {hasPermission === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/98 backdrop-blur-3xl">
          <div className="glass p-8 rounded-[32px] w-full max-w-sm text-center space-y-6 border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 22.5 12 13.5H3.75z" /></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Torch Setup</h2>
              <p className="text-slate-400 text-sm leading-relaxed">To control your flashlight, this app needs camera permission. We never record or save images.</p>
            </div>
            <button 
              onClick={() => requestInitialAccess()}
              className="w-full py-5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold uppercase tracking-widest transition-colors shadow-lg shadow-sky-600/20"
            >
              Authorize Hardware
            </button>
          </div>
        </div>
      )}

      <header className="w-full max-w-md flex justify-between items-center py-2 z-20">
        <button onClick={toggleFullscreen} className="p-3 glass rounded-2xl text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
        <div className="flex flex-col items-center">
           <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${hasPermission ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                {batteryLevel !== null ? `${batteryLevel}% Power` : 'System Ready'}
              </span>
           </div>
        </div>
        <button 
          onClick={() => { triggerHaptic(30); setIsShakeEnabled(!isShakeEnabled); }}
          className={`p-3 glass rounded-2xl transition-all ${isShakeEnabled ? 'text-sky-400 border-sky-500/40 neon-glow' : 'text-slate-500'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </button>
      </header>

      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-4 z-10 relative">
        {errorMessage && (
          <div className="glass px-4 py-3 rounded-2xl text-center border-red-500/30 absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[280px] shadow-2xl z-40">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.05em] leading-tight">
              {errorMessage}
            </p>
            <button onClick={() => requestInitialAccess()} className="mt-2 text-[10px] text-sky-400 underline uppercase tracking-widest font-bold">Retry Authorization</button>
          </div>
        )}

        {hasPermission === null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
             <button 
              onClick={() => requestInitialAccess()}
              className="glass px-12 py-6 rounded-3xl text-sky-400 font-black uppercase tracking-widest border-sky-500/20 shadow-2xl"
             >
               Initialize Hardware
             </button>
          </div>
        )}

        <div className="relative w-full aspect-square max-h-[260px] flex items-center justify-center">
          <TorchButton 
            isActive={isActive} 
            onClick={async () => { 
              triggerHaptic(60);
              // Ensure we have permission before toggling
              if (!hasPermission) {
                const success = await requestInitialAccess();
                if (success) {
                  setIsActive(!isActive);
                }
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
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Strobe Rate</span>
                <span className="text-amber-400 font-mono text-xs">{strobeSpeed}ms</span>
              </div>
              <input 
                type="range" min="30" max="800" step="10"
                value={strobeSpeed}
                onChange={(e) => { triggerHaptic(10); setStrobeSpeed(Number(e.target.value)); }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          )}

          {mode === TorchMode.SOUND_REACTIVE && (
             <div className="space-y-3">
               <SoundReactiveVisualizer analyser={analyserRef.current} />
               <button 
                onClick={() => { triggerHaptic(30); setIsSoundTriggerEnabled(!isSoundTriggerEnabled); }}
                className={`w-full py-3 glass rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSoundTriggerEnabled ? 'text-emerald-400 border-emerald-500/40' : 'text-slate-500'}`}
               >
                 {isSoundTriggerEnabled ? 'Sound Sync Active' : 'Enable Sound Sync'}
               </button>
             </div>
          )}

          {mode === TorchMode.NORMAL && (
            <ColorLight color={screenLightColor} onChange={(c) => { triggerHaptic(20); setScreenLightColor(c); }} />
          )}

          {mode === TorchMode.MORSE && (
             <MorseInput isActive={isActive} onToggleTorch={toggleTorch} />
          )}

          {(mode === TorchMode.SOS || mode === TorchMode.DISCO) && (
            <div className="glass rounded-2xl p-5 text-center border-white/5">
               <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${mode === TorchMode.SOS ? 'text-red-500 animate-pulse' : 'text-sky-400'}`}>
                 {mode === TorchMode.SOS ? 'Distress Signal' : 'Disco Sequence'}
               </span>
            </div>
          )}
        </div>
      </main>

      <nav className="w-full max-w-md pb-4 z-20">
        <ModeSelector currentMode={mode} onModeChange={(m) => { triggerHaptic(40); setMode(m); setIsActive(false); setErrorMessage(null); }} />
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
