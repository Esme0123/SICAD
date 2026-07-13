import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  color?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 220,
  color = "var(--primary)",
}) => {
  return (
    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
      <QRCodeSVG
        value={value}
        size={size - 24}
        fgColor={color}
        bgColor="#FFFFFF"
        level="M"
      />
    </div>
  );
};
