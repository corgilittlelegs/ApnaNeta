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
      {/* Outer Rim */}
      <circle cx="50" cy="50" r="47" fill="#0A192F" stroke="#1E293B" strokeWidth="2" />

      {/* Outer Precision Audit Ring / Ticks */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeDasharray="4 2"
        strokeOpacity="0.8"
      />

      {/* Saffron Ring */}
      <circle cx="50" cy="50" r="28" fill="none" stroke="#D97706" strokeWidth="1.5" strokeOpacity="0.8" />

      {/* Center Jade Disc */}
      <circle cx="50" cy="50" r="10" fill="#059669" />

      {/* 24-spoke Ashoka geometry */}
      <g stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.9">
        {/* Cardinal axes */}
        <line x1="50" y1="14" x2="50" y2="86" />
        <line x1="14" y1="50" x2="86" y2="50" />
        {/* 45-degree diagonals */}
        <line x1="24.5" y1="24.5" x2="75.5" y2="75.5" />
        <line x1="24.5" y1="75.5" x2="75.5" y2="24.5" />
        {/* 30 & 60 degree spokes */}
        <line x1="32" y1="18.8" x2="68" y2="81.2" />
        <line x1="68" y1="18.8" x2="32" y2="81.2" />
        <line x1="18.8" y1="32" x2="81.2" y2="68" />
        <line x1="18.8" y1="68" x2="81.2" y2="32" />
        {/* 15 & 75 degree spokes */}
        <line x1="40.7" y1="15.8" x2="59.3" y2="84.2" />
        <line x1="59.3" y1="15.8" x2="40.7" y2="84.2" />
        <line x1="15.8" y1="40.7" x2="84.2" y2="59.3" />
        <line x1="15.8" y1="59.3" x2="84.2" y2="40.7" />
      </g>

      {/* Center Pin */}
      <circle cx="50" cy="50" r="3.5" fill="#FFFFFF" />
    </svg>
  );
};
