import React from "react";

interface UCBLogoProps {
  size?: number;
}

export const UCBLogo: React.FC<UCBLogoProps> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 80 92" fill="none">
    {/* Shield Background - Usando el Azul Institucional */}
    <path d="M40 3 L75 17 L75 54 Q75 76 40 89 Q5 76 5 54 L5 17 Z" fill="var(--color-primary)" />

    {/* Shield Outline - Usando el Dorado Institucional */}
    <path d="M40 3 L75 17 L75 54 Q75 76 40 89 Q5 76 5 54 L5 17 Z" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5" />

    {/* Logo Details - Usando el Dorado Institucional */}
    <rect x="36.5" y="23" width="7" height="44" fill="var(--color-secondary)" rx="1.5" />
    <rect x="19" y="39" width="42" height="7" fill="var(--color-secondary)" rx="1.5" />
    <circle cx="27" cy="29" r="4.5" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" />
    <circle cx="53" cy="29" r="4.5" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" />
  </svg>
);