import React from "react";

interface CircularTimerProps {
  seconds: number;
  total?: number;
  dark: boolean;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  seconds,
  total = 10,
  dark,
}) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (seconds / total) * circ;
  
  // Use institutional colors from CSS variables
  const col = seconds <= 3 ? "var(--destructive)" : seconds <= 6 ? "var(--accent)" : "var(--primary)";

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="8"
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: col }}>
          {seconds}
        </span>
        <span className={`text-[10px] font-medium ${dark ? "text-slate-500" : "text-slate-400"}`}>
          seg
        </span>
      </div>
    </div>
  );
};
