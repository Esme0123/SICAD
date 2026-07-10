/**
 * Genera las clases CSS para una card según el modo dark/light.
 * Usa variables CSS del tema — sin colores hardcodeados.
 */
export const card = (dark: boolean, extra = "") =>
  `rounded-2xl border ${
    dark
      ? "bg-[var(--card)] border-[var(--border)]"
      : "bg-[var(--card)] border-[var(--border)] shadow-sm"
  } ${extra}`;
