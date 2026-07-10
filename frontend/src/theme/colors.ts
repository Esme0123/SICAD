/**
 * SICAD — Sistema de Colores Institucional
 * Paleta UCB San Pablo - Centro de Cómputo
 *
 * REGLA: Ningún componente debe usar colores hex directamente.
 * Todos deben importar desde este archivo o usar las variables CSS de theme.css
 */

export const COLORS = {
  // ── Primario ─────────────────────────────────────────────
  primary:       "#0F4C97",
  primaryHover:  "#0B3C78",
  primaryLight:  "#EAF2FB",

  // ── Secundario (Amarillo institucional UCB) ───────────────
  secondary:     "#F4B400",

  // ── Estados semánticos ────────────────────────────────────
  success:       "#16A34A",
  warning:       "#F59E0B",
  danger:        "#DC2626",

  // ── Superficie y estructura ───────────────────────────────
  background:    "#F8FAFC",
  card:          "#FFFFFF",
  border:        "#DCE4F2",

  // ── Tipografía ────────────────────────────────────────────
  text:          "#1E293B",
  textSecondary: "#64748B",

  // ── Modo oscuro ───────────────────────────────────────────
  dark: {
    background:    "#0B0F19",
    card:          "#1E293B",
    border:        "rgba(255,255,255,0.08)",
    text:          "#F8FAFC",
    textSecondary: "#94A3B8",
    surface:       "#0F172A",
  },

  // ── Charts ───────────────────────────────────────────────
  chart: {
    primary:   "#0F4C97",
    secondary: "#F4B400",
    success:   "#16A34A",
    warning:   "#F59E0B",
    danger:    "#DC2626",
    neutral:   "#94A3B8",
  },
} as const;

/** Helper: color con opacidad hex */
export function withOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

/** Helper: background semitransparente del color primario */
export const primaryBg = (opacity = 0.08) =>
  `rgba(15, 76, 151, ${opacity})`;

/** Helper: background semitransparente de success */
export const successBg = (opacity = 0.12) =>
  `rgba(22, 163, 74, ${opacity})`;

/** Helper: background semitransparente de danger */
export const dangerBg = (opacity = 0.12) =>
  `rgba(220, 38, 38, ${opacity})`;

/** Helper: background semitransparente de warning */
export const warningBg = (opacity = 0.12) =>
  `rgba(245, 158, 11, ${opacity})`;
