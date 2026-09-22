import React from 'react';

interface CivicEmblemProps {
  size?: number;
  className?: string;
}

export const CivicEmblem: React.FC<CivicEmblemProps> = ({ size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      aria-label="Apna Neta Civic Emblem"
    >
      <defs>
        <radialGradient id="ashokaGlow" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#002B66" />
          <stop offset="85%" stopColor="#0A192F" />
          <stop offset="100%" stopColor="#07101E" />
        </radialGradient>
        <linearGradient id="goldRim" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>

      {/* Outer Gold Rim */}
      <circle cx="50" cy="50" r="48" fill="url(#ashokaGlow)" stroke="url(#goldRim)" strokeWidth="2.5" />

      {/* Outer Precision Audit Ring / Ticks */}
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="1.5"
        strokeDasharray="3 2"
        strokeOpacity="0.75"
      />

      {/* Saffron Ring */}
      <circle cx="50" cy="50" r="30" fill="none" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.9" />

      {/* Center Harit / Emerald Disc */}
      <circle cx="50" cy="50" r="11" fill="#059669" stroke="#10B981" strokeWidth="1" />

      {/* 24-spoke Ashoka geometry */}
      <g stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.95">
        {/* Cardinal axes */}
        <line x1="50" y1="13" x2="50" y2="87" />
        <line x1="13" y1="50" x2="87" y2="50" />
        {/* 45-degree diagonals */}
        <line x1="23.9" y1="23.9" x2="76.1" y2="76.1" />
        <line x1="23.9" y1="76.1" x2="76.1" y2="23.9" />
        {/* 30 & 60 degree spokes */}
        <line x1="31.5" y1="18" x2="68.5" y2="82" />
        <line x1="68.5" y1="18" x2="31.5" y2="82" />
        <line x1="18" y1="31.5" x2="82" y2="68.5" />
        <line x1="18" y1="68.5" x2="82" y2="31.5" />
        {/* 15 & 75 degree spokes */}
        <line x1="40.4" y1="14.8" x2="59.6" y2="85.2" />
        <line x1="59.6" y1="14.8" x2="40.4" y2="85.2" />
        <line x1="14.8" y1="40.4" x2="85.2" y2="59.6" />
        <line x1="14.8" y1="59.6" x2="85.2" y2="40.4" />
      </g>

      {/* Center Pin in Gold */}
      <circle cx="50" cy="50" r="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
    </svg>
  );
};
