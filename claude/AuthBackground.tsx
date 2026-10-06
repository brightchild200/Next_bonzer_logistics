// components/auth/AuthBackground.tsx
'use client';

import { useEffect, useRef } from 'react';

export function AuthBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const truck = containerRef.current?.querySelector('[data-truck]');
    if (!truck) return;

    const animate = () => {
      let position = -300;
      const animate_frame = () => {
        position += 3;
        if (position > window.innerWidth + 50) {
          position = -300;
        }
        truck.setAttribute('style', `transform: translateX(${position}px)`);
        requestAnimationFrame(animate_frame);
      };
      animate_frame();
    };

    animate();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Blobs */}
      <div className="absolute -top-20 -left-24 w-80 h-80 bg-orange-600 rounded-full opacity-10 blur-3xl" />
      <div className="absolute -bottom-20 -right-12 w-64 h-64 bg-blue-400 rounded-full opacity-10 blur-3xl" />

      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-gray-900/5 to-gray-900/10">
        <div className="absolute inset-0 border-t border-white/5" />
        {/* Road markers */}
        <div className="absolute top-12 left-[10%] w-28 h-1 bg-orange-500 rounded opacity-50" />
        <div className="absolute top-12 left-1/2 w-28 h-1 bg-orange-500 rounded opacity-50" />
        <div className="absolute top-12 right-[10%] w-28 h-1 bg-orange-500 rounded opacity-50" />
      </div>

      {/* Animated Truck SVG */}
      <div data-truck className="absolute bottom-24 left-0 transition-none">
        <svg width="220" height="68" viewBox="0 0 220 68" fill="none">
          {/* Trailer */}
          <rect x="0" y="8" width="148" height="46" rx="4" fill="#1e3a5f" />
          <rect x="0" y="8" width="148" height="46" rx="4" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <rect x="0" y="8" width="148" height="6" rx="4" fill="#f97316" opacity="0.8" />

          {/* Text on trailer */}
          <text x="50" y="35" fontFamily="System" fontSize="11" fontWeight="800" fill="rgba(255,255,255,0.7)" letterSpacing="2">
            BONZER
          </text>
          <text x="48" y="46" fontFamily="System" fontSize="7" fill="rgba(255,255,255,0.3)" letterSpacing="1">
            LOGISTICS
          </text>

          {/* Hex badge */}
          <rect x="8" y="20" width="26" height="26" rx="4" fill="rgba(249,115,22,0.2)" stroke="rgba(249,115,22,0.4)" strokeWidth="1" />
          <text x="14" y="37" fontSize="13" fill="#f97316">
            ⬡
          </text>

          {/* Cab */}
          <rect x="148" y="14" width="52" height="40" rx="5" fill="#0f2540" />
          <rect x="148" y="14" width="52" height="40" rx="5" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <rect x="155" y="18" width="32" height="22" rx="3" fill="rgba(14,165,233,0.25)" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
          <rect x="152" y="10" width="44" height="6" rx="3" fill="#0d2035" />
          <rect x="148" y="14" width="52" height="5" rx="3" fill="#f97316" opacity="0.7" />

          {/* Lights */}
          <rect x="196" y="28" width="8" height="6" rx="2" fill="#fef08a" />
          <ellipse cx="204" cy="31" rx="10" ry="5" fill="rgba(254,240,138,0.06)" />
          <rect x="143" y="30" width="8" height="8" rx="2" fill="#0a1c30" />

          {/* Shadow */}
          <ellipse cx="100" cy="67" rx="100" ry="3" fill="rgba(0,0,0,0.25)" />

          {/* Wheels */}
          <g x="28" y="58">
            <circle r="9" fill="#1a2a3a" stroke="#334155" strokeWidth="2" />
            <circle r="4" fill="#0f1e2e" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#475569" strokeWidth="1.5" />
          </g>

          <g x="50" y="58">
            <circle r="9" fill="#1a2a3a" stroke="#334155" strokeWidth="2" />
            <circle r="4" fill="#0f1e2e" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#475569" strokeWidth="1.5" />
          </g>

          <g x="174" y="58">
            <circle r="9" fill="#1a2a3a" stroke="#334155" strokeWidth="2" />
            <circle r="4" fill="#0f1e2e" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#475569" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
