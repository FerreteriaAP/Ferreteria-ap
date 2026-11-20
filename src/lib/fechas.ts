/**
 * Fechas "de calendario" (YYYY-MM-DD) en hora de República Dominicana.
 *
 * NO usar `new Date().toISOString().slice(0, 10)` para "hoy": eso da la fecha
 * en UTC, que en RD (UTC−4) ya es mañana desde las 8:00 p. m.
 * Estas funciones usan la zona horaria explícita, así que dan lo mismo en el
 * navegador y en el servidor, sin importar la zona horaria de la máquina.
 */

const TZ = "America/Santo_Domingo";

const fmtISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
});

/** YYYY-MM-DD de un instante, en hora de RD (por defecto, ahora). */
export function fechaRD(d: Date = new Date()): string {
  return fmtISO.format(d);
}

/** Hoy en RD, como YYYY-MM-DD. */
export function hoyRD(): string {
  return fechaRD();
}

/** Mes actual en RD, como YYYY-MM. */
export function mesRD(d: Date = new Date()): string {
  return fechaRD(d).slice(0, 7);
}

/**
 * Convierte el valor de un <input type="date"> ("YYYY-MM-DD") en el Date que se
 * guarda en la base: mediodía UTC (8:00 a. m. en RD). Así la fecha se ve igual en
 * hora local y en UTC, y cae dentro del día en cualquier filtro por día o mes.
 * NO usar `new Date("YYYY-MM-DD")`: eso es medianoche UTC, que en RD es el día anterior.
 * Si recibe otra cosa (fecha con hora, Date), la pasa tal cual a `new Date()`.
 */
export function fechaInputRD(v: string | Date): Date {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T12:00:00.000Z`);
  }
  return new Date(v);
}

/** YYYY-MM-DD de hoy en RD más `dias` días (puede ser negativo). */
export function sumarDiasRD(dias: number, base: string = hoyRD()): string {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
