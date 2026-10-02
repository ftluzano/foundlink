import React from 'react';

/**
 * Clean, lightweight, 100% transparent rotating orbital radar background.
 * Uses pure CSS borders and keyframe animations — zero SVG fill bugs.
 */
export const RotatingPlaceBackground: React.FC = () => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* Dark sleek backdrop */}
      <div className="absolute inset-0 bg-slate-950" />

      {/* Subtle ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[140px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-500/6 rounded-full blur-[120px]" />

      {/* Subtle Perspective Grid Ground */}
      <div
        className="absolute bottom-0 inset-x-0 h-1/2 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transform: 'perspective(500px) rotateX(70deg) translateY(25%)',
          transformOrigin: 'bottom center'
        }}
      />

      {/* Center Rotating Concentric Radar & Orbit System */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] flex items-center justify-center">
        
        {/* Outermost Orbital Ring - Clockwise */}
        <div
          className="absolute inset-0 rounded-full border border-dashed border-emerald-500/20 will-change-transform"
          style={{ animation: 'spin-slow 50s linear infinite' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400/80 shadow-sm shadow-emerald-400" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
        </div>

        {/* Middle Orbital Ring - Counter Clockwise */}
        <div
          className="absolute inset-16 rounded-full border border-slate-700/40 will-change-transform"
          style={{ animation: 'spin-reverse 35s linear infinite' }}
        >
          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400/80" />
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400/80" />
        </div>

        {/* Inner Tilted Orbit Ring 1 */}
        <div
          className="absolute w-[360px] h-[360px] rounded-full border border-emerald-500/25 will-change-transform"
          style={{
            transform: 'rotateX(65deg) rotateY(15deg)',
            animation: 'spin-slow 25s linear infinite'
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-300" />
        </div>

        {/* Inner Tilted Orbit Ring 2 */}
        <div
          className="absolute w-[360px] h-[360px] rounded-full border border-cyan-500/20 will-change-transform"
          style={{
            transform: 'rotateX(65deg) rotateY(-25deg)',
            animation: 'spin-reverse 28s linear infinite'
          }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-cyan-300" />
        </div>

        {/* Subtle Conic Radar Sweep */}
        <div
          className="absolute w-[340px] h-[340px] rounded-full will-change-transform pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.12) 0deg, rgba(16, 185, 129, 0) 60deg)',
            animation: 'radar-sweep 7s linear infinite'
          }}
        />

        {/* Center Target Crosshair */}
        <div className="absolute w-2 h-2 rounded-full bg-emerald-400/60" />
        <div className="absolute w-24 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute h-24 w-px bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent" />
      </div>
    </div>
  );
};
