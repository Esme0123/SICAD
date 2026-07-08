import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const map: Record<string, { bg: string; color: string }> = {
    "Activo":    { bg: "rgba(46,125,50,0.12)",   color: "#2E7D32" },
    "Puntual":   { bg: "rgba(46,125,50,0.12)",   color: "#2E7D32" },
    "Inactivo":  { bg: "rgba(198,40,40,0.12)",   color: "#C62828" },
    "Ausente":   { bg: "rgba(198,40,40,0.12)",   color: "#C62828" },
    "Licencia":  { bg: "rgba(249,168,37,0.12)",  color: "#F9A825" },
    "Tardanza":  { bg: "rgba(249,168,37,0.12)",  color: "#F9A825" },
  };
  const s = map[status] ?? { bg: "rgba(100,116,139,0.12)", color: "#64748B" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {status}
    </span>
  );
};
