/**
 * Utilidades de formateo de texto — usadas en server actions para normalizar
 * datos antes de guardarlos en la base de datos.
 */

/** Primera letra de cada palabra en mayúscula, resto en minúscula.
 *  "CEMENTO GRIS 2LB" → "Cemento Gris 2lb"
 *  "consultora kolmen srl" → "Consultora Kolmen Srl"
 */
export function cap(s?: string | null): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Formatea un RNC dominicano como X-XX-XXXXX-X (9 dígitos).
 *  "131912176"  → "1-31-91217-6"
 *  "1-31-91217-6" → "1-31-91217-6" (ya formateado)
 *  Si no tiene 9 dígitos devuelve el string limpio sin formato.
 */
export function formatRnc(s?: string | null): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 9) return s.trim(); // no es un RNC estándar — guardar tal cual
  return `${digits[0]}-${digits.slice(1, 3)}-${digits.slice(3, 8)}-${digits[8]}`;
}

/** Formatea una cédula dominicana como XXX-XXXXXXX-X (11 dígitos).
 *  "40220015511"      → "402-2001551-1"
 *  "402-2001551-1"    → "402-2001551-1" (ya formateada)
 *  Si no tiene 11 dígitos devuelve el string limpio sin formato.
 */
export function formatCedula(s?: string | null): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 11) return s.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits[10]}`;
}
