/**
 * Utilidades de formateo de texto — usadas en server actions para normalizar
 * datos antes de guardarlos en la base de datos.
 */

/** Primera letra de cada palabra en mayúscula, resto en minúscula.
 *  Preserva siglas de 2–4 letras mayúsculas (STD, PVC, LED, SRL, CPVC…).
 *  Siglas técnicas conocidas siempre en mayúsculas sin importar cómo lleguen (ppr → PPR).
 *  Tokens número + letras → letras siempre en mayúsculas (1GL, 5gl → 1GL, 5GL).
 *  Palabras con '/' se capitalizan parte por parte: "T/Sayco" → "T/Sayco", "PVC/STD" → "PVC/STD"
 *  "consultora kolmen srl"        → "Consultora Kolmen Srl"
 *  "Mezcladora Fregadero T/Sayco" → "Mezcladora Fregadero T/Sayco"
 *  "tubo ppr pn20"                → "Tubo PPR PN20"
 *  "TUBO 1gl 5GL"                 → "Tubo 1GL 5GL"
 */

/** Siglas técnicas que siempre deben ir en mayúsculas sin importar su forma de entrada */
const SIGLAS_FIJAS = new Set([
  "PPR","PVC","CPVC","SDR","SCH","EMT","IMC","RGS","LED","STD","SRL","SA",
  "GL","GLL","MM","CM","MT","KG","LB","LT","UND","GRS","RNC",
]);

export function cap(s?: string | null): string {
  if (!s) return "";

  const capWord = (word: string): string => {
    // Siglas técnicas fijas → siempre en mayúsculas (ppr, PPR, Ppr → PPR)
    if (SIGLAS_FIJAS.has(word.toUpperCase()) && /^[A-Za-z]+$/.test(word)) return word.toUpperCase();
    // Siglas ALL-CAPS de 2–4 letras, con dígitos opcionales al final (PN20, SCH40, CPVC…)
    if (/^[A-Z]{2,4}\d*$/.test(word)) return word;
    // Número (entero o decimal) + letras → letras siempre en MAYÚSCULAS (1GL, 5gl, 0.5GL → 1GL, 5GL, 0.5GL)
    const mNumLetra = word.match(/^([\d.]+)([A-Za-z]+)$/);
    if (mNumLetra) return mNumLetra[1] + mNumLetra[2].toUpperCase();
    // "x" como separador de dimensiones → siempre minúscula (1 x 2 x 8)
    if (word.toLowerCase() === "x") return "x";
    // Caso normal: primera letra mayúscula, resto minúscula
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  return s.trim().replace(/\S+/g, (token) => {
    // Tokens con '/' → capitalizar cada segmento por separado (T/Sayco, PVC/STD)
    if (token.includes("/")) {
      return token.split("/").map(capWord).join("/");
    }
    // Tokens con '-' → capitalizar cada parte por separado (CB-610, W-Max, SCH-40)
    if (token.includes("-")) {
      return token.split("-").map(capWord).join("-");
    }
    return capWord(token);
  });
}

/** Formatea un RNC o Cédula dominicana según la cantidad de dígitos:
 *  - 9 dígitos  → RNC    X-XX-XXXXX-X   ("131912176"  → "1-31-91217-6")
 *  - 11 dígitos → Cédula XXX-XXXXXXX-X  ("40220015511" → "402-2001551-1")
 *  Cualquier otra longitud → devuelve el string sin modificar.
 *  Clientes/suplidores a veces usan su cédula como RNC fiscal.
 */
export function formatRnc(s?: string | null): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length === 9)
    return `${digits[0]}-${digits.slice(1, 3)}-${digits.slice(3, 8)}-${digits[8]}`;
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits[10]}`;
  return s.trim(); // longitud inesperada — guardar tal cual
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
