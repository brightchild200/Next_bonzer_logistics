// components/auth/AuthBackground.tsx
'use client';

export function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* ============================================================
          GRADIENT BLOBS (Aurora Effect)
          ============================================================ */}
      <div className="absolute -top-32 -left-40 w-96 h-96 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full opacity-20 blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -right-40 w-80 h-80 bg-gradient-to-tl from-blue-400 to-blue-500 rounded-full opacity-15 blur-3xl animate-pulse" />

      {/* ============================================================
          ROAD (Bottom section)
          ============================================================ */}
      <div className="absolute bottom-0 left-0 right-0 h-48">
        {/* Road base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/10 to-gray-900/20" />

        {/* Road line (top border) */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Animated road markers (dashed lines) */}
        <div className="absolute top-12 left-0 w-full h-1 flex items-center justify-between px-8 opacity-60">
          <div className="w-20 h-1 bg-gradient-to-r from-orange-400 to-transparent rounded-full" />
          <div className="w-20 h-1 bg-gradient-to-r from-orange-400 to-transparent rounded-full" />
          <div className="w-20 h-1 bg-gradient-to-r from-orange-400 to-transparent rounded-full" />
          <div className="w-20 h-1 bg-gradient-to-r from-orange-400 to-transparent rounded-full" />
        </div>

        {/* Road shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* ============================================================
          TRUCK ANIMATION
          ============================================================
          Animation: 
          - 0-85%: Drive from left to right (slow speed - 12s)
          - 85-90%: Stop at right side (hold position 1s)
          - 90-100%: Wait (stay stopped 1s)
          - Then loop
          
          Total duration: 14 seconds
          ============================================================ */}
      <style>{`
        @keyframes driveTruck {
          0% {
            transform: translateX(-300px);
          }
          85% {
            transform: translateX(calc(100vw - 100px));
          }
          90% {
            transform: translateX(calc(100vw - 100px));
          }
          100% {
            transform: translateX(-300px);
          }
        }

        .truck-animate {
          animation: driveTruck 14s ease-in-out infinite;
        }
      `}</style>

      {/* Truck SVG */}
      <div className="truck-animate absolute bottom-32 left-0">
        <svg width="220" height="68" viewBox="0 0 220 68" fill="none" className="filter drop-shadow-lg">
          {/* ===== TRAILER ===== */}
          <rect x="0" y="8" width="148" height="46" rx="4" fill="#1e3a5f" />
          <rect x="0" y="8" width="148" height="46" rx="4" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          
          {/* Trailer top stripe (Bonzer branding) */}
          <rect x="0" y="8" width="148" height="6" rx="4" fill="#f97316" opacity="0.9" />

          {/* BONZER text */}
          <text
            x="50"
            y="35"
            fontFamily="System, -apple-system, sans-serif"
            fontSize="12"
            fontWeight="800"
            fill="rgba(255,255,255,0.85)"
            letterSpacing="2"
            textAnchor="middle"
          >
            BONZER
          </text>

          {/* LOGISTICS text */}
          <text
            x="48"
            y="47"
            fontFamily="System, -apple-system, sans-serif"
            fontSize="8"
            fill="rgba(255,255,255,0.4)"
            letterSpacing="1"
            textAnchor="middle"
          >
            LOGISTICS
          </text>

          {/* Hex badge on trailer */}
          <rect x="8" y="20" width="26" height="26" rx="4" fill="rgba(249,115,22,0.25)" stroke="rgba(249,115,22,0.5)" strokeWidth="1.5" />
          <text x="21" y="40" fontSize="16" fill="#f97316" textAnchor="middle">
            ⬡
          </text>

          {/* ===== CAB (Truck front) ===== */}
          <rect x="148" y="14" width="52" height="40" rx="5" fill="#0f2540" />
          <rect x="148" y="14" width="52" height="40" rx="5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          {/* Windshield (glowing effect) */}
          <rect x="155" y="18" width="32" height="22" rx="3" fill="rgba(14,165,233,0.35)" stroke="rgba(14,165,233,0.4)" strokeWidth="1.5" />

          {/* Cab roof */}
          <rect x="152" y="10" width="44" height="6" rx="3" fill="#0d2035" />

          {/* Cab stripe */}
          <rect x="148" y="14" width="52" height="5" rx="3" fill="#f97316" opacity="0.8" />

          {/* Headlight (glowing) */}
          <rect x="196" y="28" width="8" height="6" rx="2" fill="#fef08a" />
          <ellipse cx="204" cy="31" rx="12" ry="6" fill="rgba(254,240,138,0.1)" />

          {/* Side marker */}
          <rect x="143" y="30" width="8" height="8" rx="2" fill="#0a1c30" stroke="rgba(249,115,22,0.3)" strokeWidth="1" />

          {/* ===== SHADOW ===== */}
          <ellipse cx="100" cy="67" rx="110" ry="3" fill="rgba(0,0,0,0.3)" />

          {/* ===== WHEELS ===== */}
          {/* Front wheel */}
          <g x="28" y="58">
            <circle r="9" fill="#1a2a3a" stroke="#475569" strokeWidth="2" />
            <circle r="4.5" fill="#0f1e2e" />
            <line x1="0" y1="-9" x2="0" y2="9" stroke="#64748b" strokeWidth="1.5" />
            <line x1="-9" y1="0" x2="9" y2="0" stroke="#64748b" strokeWidth="1.5" />
            <circle r="2" fill="rgba(255,255,255,0.1)" />
          </g>

          {/* Middle wheel */}
          <g x="50" y="58">
            <circle r="9" fill="#1a2a3a" stroke="#475569" strokeWidth="2" />
            <circle r="4.5" fill="#0f1e2e" />
            <line x1="0" y1="-9" x2="0" y2="9" stroke="#64748b" strokeWidth="1.5" />
            <line x1="-9" y1="0" x2="9" y2="0" stroke="#64748b" strokeWidth="1.5" />
            <circle r="2" fill="rgba(255,255,255,0.1)" />
          </g>

          {/* Rear wheel */}
          <g x="174" y="58">
            <circle r="9" fill="#1a2a3a" stroke="#475569" strokeWidth="2" />
            <circle r="4.5" fill="#0f1e2e" />
            <line x1="0" y1="-9" x2="0" y2="9" stroke="#64748b" strokeWidth="1.5" />
            <line x1="-9" y1="0" x2="9" y2="0" stroke="#64748b" strokeWidth="1.5" />
            <circle r="2" fill="rgba(255,255,255,0.1)" />
          </g>
        </svg>
      </div>
    </div>
  );
}