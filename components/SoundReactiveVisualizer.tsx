
import React, { useEffect, useRef } from 'react';

interface SoundReactiveVisualizerProps {
  analyser: AnalyserNode | null;
}

const SoundReactiveVisualizer: React.FC<SoundReactiveVisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgba(16, 185, 129, ${barHeight / 100})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }, [analyser]);

  return (
    <div className="glass rounded-2xl p-4 overflow-hidden h-24 flex items-center justify-center">
      <canvas ref={canvasRef} width={300} height={100} className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest opacity-50">Audio Sync Active</span>
      </div>
    </div>
  );
};

export default SoundReactiveVisualizer;
