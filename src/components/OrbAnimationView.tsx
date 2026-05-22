import { useEffect, useRef } from "react";
import { MyraState } from "../types";

export interface OrbAnimationViewProps {
  state: MyraState;
  amplitude?: number; // 0 to 1 representation for reactive peaks
}

export default function OrbAnimationView({ state, amplitude = 0 }: OrbAnimationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Cache amplitude ref to avoid stale closures in animation frame
  const amplitudeRef = useRef(amplitude);
  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let rotationAngle = 0;
    let waveOffset = 0;
    
    // Smooth breathing scaler
    let pulseScale = 1.0;
    let pulseDir = 1;

    // Simulated particles for SPEAKING and ACTIVE states
    const particles: Array<{ x: number; y: number; angle: number; radius: number; speed: number; size: number }> = [];
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: 0,
        y: 0,
        angle: (i * Math.PI * 2) / 12,
        radius: 70 + Math.random() * 25,
        speed: 0.02 + Math.random() * 0.02,
        size: 1.5 + Math.random() * 2.5,
      });
    }

    const draw = () => {
      // Handle high DPI support
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Determine state color schemes
      let coreColorStart = "#B71C1C"; // Deep Red for Idle
      let coreColorEnd = "#880E4F";
      let ringColor = "#FF1744"; // Vivid Red
      let particleColor = "#FF1744";
      let rateMultiplier = 1;

      if (state === "LISTENING" || state === "ACTIVE") {
        coreColorStart = "#FF1744";
        coreColorEnd = "#D500F9"; // Red -> Purple
        ringColor = "#FF1744";
        particleColor = "#D500F9";
        rateMultiplier = 1.5;
      } else if (state === "SPEAKING") {
        coreColorStart = "#E040FB"; // Bright Purple
        coreColorEnd = "#FF1744"; // Purple -> Red
        ringColor = "#E040FB";
        particleColor = "#FF1744";
        rateMultiplier = 2.2;
      } else if (state === "THINKING") {
        coreColorStart = "#40C4FF"; // Vivid Cyan
        coreColorEnd = "#00B0FF"; // Sky Blue
        ringColor = "#00B0FF";
        particleColor = "#00B0FF";
        rateMultiplier = 0.8;
      }

      // 1. Core pulsing state handler
      if (state === "IDLE") {
        pulseScale += 0.002 * pulseDir;
        if (pulseScale > 1.12) pulseDir = -1;
        if (pulseScale < 0.95) pulseDir = 1;
      } else if (state === "THINKING") {
        pulseScale = 0.98 + Math.sin(Date.now() / 300) * 0.04;
      } else if (state === "SPEAKING") {
        // Core scale reacts to volume peaks!
        const targetScale = 1.05 + amplitudeRef.current * 0.35;
        pulseScale += (targetScale - pulseScale) * 0.3; // LERP
      } else {
        pulseScale = 1.05 + Math.sin(Date.now() / 150) * 0.06;
      }

      const coreRadius = 48 * pulseScale;

      // Layer 1: Radial Glow behind the orb (1.6x radius)
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        coreRadius * 1.8
      );
      glowGrad.addColorStop(0, coreColorStart + "9c"); // 60% alpha
      glowGrad.addColorStop(0.5, coreColorEnd + "3c");  // 20% alpha
      glowGrad.addColorStop(1, "rgba(5, 5, 5, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: 3 Rotating concentric dashed rings
      rotationAngle += 0.005 * rateMultiplier;
      waveOffset += 0.03 * rateMultiplier;

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = ringColor + "5c"; // 35% alpha

      // Inner Rotating Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationAngle);
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Middle Rotating Ring (Contrary motion)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-rotationAngle * 0.7);
      ctx.setLineDash([12, 10, 4, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 1.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Outer Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationAngle * 0.4);
      ctx.setLineDash([16, 20]);
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Layer 3: Floating particles (Only Active / Speaking)
      if (state === "SPEAKING" || state === "ACTIVE" || state === "LISTENING") {
        particles.forEach((p) => {
          // Orbit angle increments
          p.angle += p.speed * rateMultiplier;
          
          // Speed up on amplitude peaks
          const peakPush = state === "SPEAKING" ? amplitudeRef.current * 25 : 0;
          const currentRadius = p.radius + peakPush + Math.sin(p.angle * 2) * 5;
          
          p.x = centerX + Math.cos(p.angle) * currentRadius;
          p.y = centerY + Math.sin(p.angle) * currentRadius;

          ctx.fillStyle = particleColor + "cc";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Layer 4: Fluid Sine wave rings around Core sphere
      if (state === "LISTENING" || state === "SPEAKING") {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = ringColor + "bb";
        ctx.lineWidth = 2.0;
        ctx.beginPath();

        const count = 100;
        const waveAmp = state === "SPEAKING" ? 6 + amplitudeRef.current * 16 : 4;
        const wavesCount = state === "SPEAKING" ? 8 : 5;

        for (let i = 0; i <= count; i++) {
          const theta = (i * Math.PI * 2) / count;
          const r = coreRadius + Math.sin(theta * wavesCount + waveOffset) * waveAmp;
          const wx = Math.cos(theta) * r;
          const wy = Math.sin(theta) * r;
          if (i === 0) {
            ctx.moveTo(wx, wy);
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Layer 5: Thinking Spin loading arcs (THINKING state only)
      if (state === "THINKING") {
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "#40C4FF";
        ctx.lineCap = "round";

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationAngle * 3);
        
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius * 1.25, 0, Math.PI * 0.45);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, coreRadius * 1.25, Math.PI, Math.PI * 1.45);
        ctx.stroke();

        ctx.restore();
      }

      // Layer 6: Main Core Sphere Gradient (Spheroidal depth effect)
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.25,
        centerY - coreRadius * 0.25,
        0,
        centerX,
        centerY,
        coreRadius
      );
      coreGrad.addColorStop(0, coreColorStart);
      coreGrad.addColorStop(0.85, coreColorEnd);
      coreGrad.addColorStop(1, "#0a0a0a");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Shiny glare highlight inside the core
      const highlightGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.35,
        centerY - coreRadius * 0.35,
        0,
        centerX - coreRadius * 0.35,
        centerY - coreRadius * 0.35,
        coreRadius * 0.45
      );
      highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(
        centerX - coreRadius * 0.35,
        centerY - coreRadius * 0.35,
        coreRadius * 0.45,
        0,
        Math.PI * 2
      );
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state]);

  return (
    <div id="orb-wrapper" className="relative w-full h-full flex items-center justify-center">
      <canvas
        id="orb-canvas"
        ref={canvasRef}
        className="w-full h-full cursor-pointer max-w-[280px] max-h-[280px]"
      />
    </div>
  );
}
