import React, { useState, useRef, useEffect } from "react";
import { MyraState } from "../types";
import OrbAnimationView from "./OrbAnimationView";
import { X, Volume2, Move } from "lucide-react";

interface FloatingOverlayProps {
  state: MyraState;
  onTap: () => void;
  onClose: () => void;
}

export default function FloatingOverlay({ state, onTap, onClose }: FloatingOverlayProps) {
  const [position, setPosition] = useState({ x: 200, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const relRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".close-btn")) return;
    setIsDragging(true);
    relRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Keep boundaries inside window
      const newX = Math.max(10, Math.min(window.innerWidth - 130, e.clientX - relRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 130, e.clientY - relRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={dragRef}
      style={{ top: position.y, left: position.x }}
      onMouseDown={handleMouseDown}
      className={`fixed z-50 p-2 rounded-2xl border bg-black/90 shadow-2xl flex flex-col items-center justify-center cursor-grab select-none active:cursor-grabbing backdrop-blur-md transition-all duration-300 ${
        isDragging ? "scale-105 border-red-500/50" : "border-zinc-800"
      }`}
    >
      {/* Title Drag Handler */}
      <div className="w-full flex items-center justify-between px-1 mb-1 border-b border-zinc-800/50 pb-1 text-[9px] font-mono tracking-wider text-zinc-500">
        <div className="flex items-center gap-1">
          <Move className="w-2 h-2 text-red-500 animate-pulse" />
          <span>MYRA OVERLAY</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="close-btn text-zinc-400 hover:text-red-500 transition-colors p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Floating Orb */}
      <div 
        onClick={onTap}
        className="relative w-24 h-24 rounded-full flex items-center justify-center hover:bg-zinc-900/50 transition-colors group"
      >
        <OrbAnimationView state={state} amplitude={0.05} />
        
        {/* State Indicators */}
        <div className="absolute inset-0 rounded-full border border-zinc-800 border-dashed group-hover:border-red-500/30 transition-colors" />
        
        {state === "SPEAKING" && (
          <div className="absolute -bottom-1 right-2 bg-red-500 p-0.5 rounded-full shadow animate-bounce">
            <Volume2 className="w-2.5 h-2.5 text-black" />
          </div>
        )}
      </div>

      <div className="mt-1 text-[9px] font-mono text-zinc-400">
        {state === "IDLE" ? "Tap to trigger" : state}...
      </div>
    </div>
  );
}
