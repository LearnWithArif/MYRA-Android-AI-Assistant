import { useEffect, useRef } from "react";

export interface WaveformViewProps {
  amplitude: number; // 0 to 1 RMS value
  isActive: boolean;
}

export default function WaveformView({ amplitude, isActive }: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudeRef = useRef(amplitude);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    amplitudeRef.current = amplitude;
    isActiveRef.current = isActive;
  }, [amplitude, isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const BAR_COUNT = 24;
    const barHeights = new Float32Array(BAR_COUNT);
    const targetHeights = new Float32Array(BAR_COUNT);

    // Seed heights to looks interesting
    for (let i = 0; i < BAR_COUNT; i++) {
      barHeights[i] = 2;
      targetHeights[i] = 2;
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const currentAmp = amplitudeRef.current;
      const isMyraActive = isActiveRef.current;

      const barWidth = Math.max(1, (width / BAR_COUNT) - 2.5);
      const gap = 2.5;

      // Animate and render each bar
      for (let i = 0; i < BAR_COUNT; i++) {
        // Calculate a nice symmetric base spectrum effect
        const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const sensitivity = 1 - centerDist * 0.75; // taller in core

        if (isMyraActive) {
          // Generate target with a little jittery organic movement added to current amplitude
          const noise = 0.8 + Math.random() * 0.45;
          const target = currentAmp > 0.01 
            ? Math.max(3, currentAmp * height * sensitivity * noise) 
            : 2 + Math.sin(Date.now() / 150 + i * 0.5) * 2;
          
          targetHeights[i] = Math.max(2, Math.min(height - 2, target));
        } else {
          // Flatten wave gracefully
          targetHeights[i] = 2;
        }

        // Apply LERP formula from instruction: height += (target - current) * 0.3
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.3;

        // Render bar
        const currentBarH = barHeights[i];
        const x = i * (barWidth + gap);
        const y = (height - currentBarH) / 2; // vertically centered

        // Create glowing red gradient for peak bars
        ctx.fillStyle = "#FF1744";
        ctx.shadowColor = "#FF1744";
        ctx.shadowBlur = currentAmp > 0.1 ? 6 : 0;

        // Draw rounded rectangle
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, currentBarH, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, currentBarH);
        }
        ctx.fill();
      }

      // Reset shadows for performance
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div id="waveform-container" className="w-full h-10 px-4 flex items-center justify-center">
      <canvas
        id="waveform-canvas"
        ref={canvasRef}
        className="w-full h-full max-w-[200px]"
      />
    </div>
  );
}
