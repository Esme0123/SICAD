import React from "react";
import { COLORS } from "@/theme/colors";

interface AvatarProps {
  name: string;
  size?: number;
  /** Color de fondo — usa COLORS del tema por defecto */
  bg?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 32,
  bg = COLORS.primary,
}) => (
  <div
    className="flex items-center justify-center text-white font-semibold flex-shrink-0"
    style={{
      width:        size,
      height:       size,
      borderRadius: size / 2,
      background:   bg,
      fontSize:     size * 0.38,
    }}
  >
    {name.charAt(0).toUpperCase()}
  </div>
);
