// src/utils/calendar.utils.ts
// Utilidades para exportar horarios a iCalendar (.ics) y
// generar enlaces directos a Google Calendar (Web Intent).

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  /** Fecha/hora de inicio en hora local (floating time) */
  start: Date;
  /** Fecha/hora de fin en hora local (floating time) */
  end: Date;
  /** Regla de recurrencia, ej. "FREQ=WEEKLY;BYDAY=MO" */
  rrule?: string;
}

const DAYS_TO_ICS: Record<string, string> = {
  Lunes: "MO",
  Martes: "TU",
  Miercoles: "WE",
  "Miércoles": "WE",
  Jueves: "TH",
  Viernes: "FR",
  Sabado: "SA",
  "Sábado": "SA",
};

const DAYS_TO_INDEX: Record<string, number> = {
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  "Miércoles": 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
  "Sábado": 6,
};

/** Día de la semana → código de 2 letras de iCalendar (MO..SA) */
export const dayToIcs = DAYS_TO_ICS;

/** Día de la semana → índice 1-6 (1 = Lunes, 6 = Sábado) */
export const dayToIndex = DAYS_TO_INDEX;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formatea una fecha local como "YYYYMMDDTHHMMSS" (floating time). */
export function formatICSDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Parsea "YYYY-MM-DD" a Date LOCAL evitando el desfase UTC. */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function parsePeriod(value: string): { idx: number; year: number } | null {
  let m = value.match(/^(Verano|Invierno)\s(\d{4})$/);
  if (m) {
    const idx = m[1] === "Verano" ? 0 : 2;
    return { idx, year: parseInt(m[2], 10) };
  }
  m = value.match(/^1-(\d{4})$/);
  if (m) return { idx: 1, year: parseInt(m[1], 10) };
  m = value.match(/^2-(\d{4})$/);
  if (m) return { idx: 3, year: parseInt(m[2], 10) };
  return null;
}

/**
 * Rango de fechas del periodo académico según su nombre.
 * Ej: "1-2026" → { inicio: "2026-02-01", fin: "2026-06-30" }
 */
export function getPeriodoDateRange(periodo: string): { inicio: string; fin: string } | null {
  const parsed = parsePeriod(periodo);
  if (!parsed) return null;
  const { idx, year } = parsed;
  switch (idx) {
    case 0: return { inicio: `${year}-01-01`, fin: `${year}-01-31` };
    case 1: return { inicio: `${year}-02-01`, fin: `${year}-06-30` };
    case 2: return { inicio: `${year}-07-01`, fin: `${year}-07-31` };
    case 3: return { inicio: `${year}-08-01`, fin: `${year}-12-31` };
    default: return null;
  }
}

/**
 * Primer día >= `from` que coincide con el día de la semana `dow` (1=Lunes...6=Sábado).
 */
export function firstWeekdayOnOrAfter(from: Date, dow: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const current = d.getDay() === 0 ? 7 : d.getDay();
  let diff = dow - current;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function generateUID(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `sicad-${Date.now()}-${rand}@sicad`;
}

/** Construye el contenido de un archivo iCalendar (.ics) con VALARM -5 min. */
export function buildICS(events: CalendarEvent[]): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//SICAD//Horarios SICAD//ES");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${generateUID()}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`SUMMARY:${escapeICS(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`);
    lines.push(`DTSTART:${formatICSDate(ev.start)}`);
    lines.push(`DTEND:${formatICSDate(ev.end)}`);
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT5M");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:Recordatorio de entrada/salida SICAD");
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Descarga los eventos como archivo .ics (abre el calendario del teléfono). */
export function downloadICS(events: CalendarEvent[], filename: string): void {
  const ics = buildICS(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Enlace directo a Google Calendar Web Intent (action=TEMPLATE). */
export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", ev.summary);
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  params.set("dates", `${formatICSDate(ev.start)}/${formatICSDate(ev.end)}`);
  if (ev.rrule) params.set("recur", ev.rrule);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
