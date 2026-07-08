import React from "react";

interface UCBLogoProps {
  size?: number;
}

export const UCBLogo: React.FC<UCBLogoProps> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 80 92" fill="none">
    {/* Shield Background - Primary UCB Purple (#6A1B9A) */}
    <path d="M40 3 L75 17 L75 54 Q75 76 40 89 Q5 76 5 54 L5 17 Z" fill="#6A1B9A" />
    
    {/* Shield Outline - Secondary Celeste (#64B5F6) */}
    <path d="M40 3 L75 17 L75 54 Q75 76 40 89 Q5 76 5 54 L5 17 Z" fill="none" stroke="#64B5F6" strokeWidth="2.5" />
    
    {/* Logo Details - Secondary Celeste (#64B5F6) */}
    <rect x="36.5" y="23" width="7" height="44" fill="#64B5F6" rx="1.5" />
    <rect x="19" y="39" width="42" height="7" fill="#64B5F6" rx="1.5" />
    <circle cx="27" cy="29" r="4.5" fill="none" stroke="rgba(100, 181, 246, 0.7)" strokeWidth="1.5" />
    <circle cx="53" cy="29" r="4.5" fill="none" stroke="rgba(100, 181, 246, 0.7)" strokeWidth="1.5" />
  </svg>
);
