/** Etiquetas legibles para el enum TipoCredito — fuente única de verdad */
export const CREDITO_LABEL: Record<string, string> = {
  CONTADO:  "Contado",
  DIAS_10:  "10 días",
  DIAS_15:  "15 días",
  DIAS_30:  "30 días",
  DIAS_45:  "45 días",
  DIAS_60:  "60 días",
  DIAS_90:  "90 días",
};

/** Formatea un valor de crédito. Nunca devuelve el enum raw. */
export function fmtCredito(credito: string): string {
  return CREDITO_LABEL[credito] ?? credito.replace("DIAS_", "").replace(/_/g, " ") + " días";
}
