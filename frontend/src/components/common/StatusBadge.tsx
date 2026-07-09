import React from "react";
import { COLORS, successBg, dangerBg, warningBg } from "@/theme/colors";

interface StatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  "Activo":   { bg: successBg(0.12), color: COLORS.success },
  "Puntual":  { bg: successBg(0.12), color: COLORS.success },
  "Inactivo": { bg: dangerBg(0.12),  color: COLORS.danger  },
  "Ausente":  { bg: dangerBg(0.12),  color: COLORS.danger  },
  "Licencia": { bg: warningBg(0.12), color: COLORS.warning  },
  "Tardanza": { bg: warningBg(0.12), color: COLORS.warning  },
};

const DEFAULT_STATUS = {
  bg:    `rgba(100, 116, 139, 0.12)`,
  color: COLORS.textSecondary,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = STATUS_MAP[status] ?? DEFAULT_STATUS;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {status}
    </span>
  );
};
