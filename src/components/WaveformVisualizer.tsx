import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isPlaying: boolean;
  bpm: number;
  color?: string;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isPlaying,
  bpm,
  color = '#06b6d4',
  height = 54
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;
    const speed = Math.max(0.04, (bpm || 120) / 1200);

    const barCount = 48;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const h = canvas.height;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        // Compute pseudo frequency bar heights
        let normalizedHeight = 0.2;
        if (isPlaying) {
          const wave1 = Math.sin(phase + i * 0.25);
          const wave2 = Math.cos(phase * 1.5 + i * 0.4);
          const wave3 = Math.sin(phase * 0.7 - i * 0.15);
          normalizedHeight = Math.max(0.12, Math.min(0.95, 0.45 + (wave1 * 0.25 + wave2 * 0.15 + wave3 * 0.15)));
        } else {
          // Static aesthetic waveform
          const staticWave = Math.sin(i * 0.2) * 0.2 + 0.35;
          normalizedHeight = Math.max(0.15, staticWave);
        }

        const barH = normalizedHeight * (h - 10);
        const x = i * (barWidth + 2);
        const y = (h - barH) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(2, barWidth), barH, 2);
        ctx.fill();
      }

      if (isPlaying) {
        phase += speed;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, bpm, color]);

  return (
    <div className="w-full relative overflow-hidden rounded-lg bg-black/40 border border-white/5 p-2 backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        width={380}
        height={height}
        className="w-full block"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] font-mono text-white/50">
        <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
        <span>{isPlaying ? 'AUDIO ACTIVE' : 'STANDBY'}</span>
      </div>
    </div>
  );
};
