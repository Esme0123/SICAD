/**
 * SICAD — Sistema de Tipografía
 * Fuente principal: Inter | Fallback: Segoe UI, system-ui
 *
 * REGLA: Usar estas constantes en componentes para mantener
 * consistencia tipográfica en todo el sistema.
 */

export const FONTS = {
  primary: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
} as const;

export const FONT_SIZE = {
  xs:   "0.75rem",   // 12px — captions, badges, helpers
  sm:   "0.8125rem", // 13px — small labels
  base: "0.875rem",  // 14px — body, inputs
  md:   "1rem",      // 16px — subtítulos
  lg:   "1.125rem",  // 18px — títulos de sección
  xl:   "1.25rem",   // 20px — títulos de página
  "2xl":"1.5rem",    // 24px — headings
  "3xl":"1.875rem",  // 30px — display
  "4xl":"2.25rem",   // 36px — hero
} as const;

export const FONT_WEIGHT = {
  normal:    "400",
  medium:    "500",
  semibold:  "600",
  bold:      "700",
  extrabold: "800",
  black:     "900",
} as const;

export const LINE_HEIGHT = {
  tight:   "1.25",
  snug:    "1.375",
  normal:  "1.5",
  relaxed: "1.625",
} as const;

/** Variantes tipográficas predefinidas para uso en componentes */
export const TYPOGRAPHY = {
  // Títulos de página (h1)
  pageTitle: {
    fontSize:   FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
  },

  // Títulos de sección (h2, card headers)
  sectionTitle: {
    fontSize:   FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.snug,
  },

  // Subtítulos de card (h3)
  cardTitle: {
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.snug,
  },

  // Texto de cuerpo estándar
  body: {
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
  },

  // Texto pequeño — subtítulos, helpers
  caption: {
    fontSize:   FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
  },

  // Labels de formulario
  label: {
    fontSize:   FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.normal,
  },

  // Botones
  button: {
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.normal,
  },

  // Texto mono (códigos, horas, CI)
  mono: {
    fontFamily: FONTS.mono,
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.normal,
  },

  // Valores numéricos grandes (stats)
  statValue: {
    fontSize:   FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
  },

  // Texto de tabla — header
  tableHeader: {
    fontSize:   FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.normal,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },

  // Texto de tabla — celda
  tableCell: {
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
  },
} as const;
