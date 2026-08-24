/**
 * Datos corporativos de Ferretería AP
 * Actualizar aquí cuando cambien cuentas bancarias o datos de contacto.
 * Importar en todas las páginas de impresión para consistencia.
 */

/** Color naranja de marca (del isotipo AP) */
export const BRAND = "#f5821f";
/** Negro corporativo del logo */
export const BRAND_DARK = "#000204";

export const EMPRESA = {
  nombre:    "Ferretería AP",
  rnc:       "1-31-91217-6",
  tel:       "+1 829-584-9708",
  cel:       "+1 829-584-9708",   // tiene WhatsApp
  whatsapp:  "18295849708",        // para enlace wa.me
  email:     "ferreteria.ap@gmail.com", // TODO: confirmar email de negocios
  dir:       "Prol. 27 de Febrero No. 452",
  ciudad:    "Santo Domingo, República Dominicana",
} as const;

/** Cuentas para instrucciones de pago en facturas */
export const BANCOS = [
  { banco: "Banco Popular Dominicano", cuenta: "XXX-XXXXXX-X" }, // TODO: número de cuenta real
  { banco: "Banco BHD León",            cuenta: "" },              // Próximamente
] as const;

/** Términos de crédito legibles */
export const CREDITO_LABEL: Record<string, string> = {
  CONTADO: "Contado",
  DIAS_10: "10 días",
  DIAS_15: "15 días",
  DIAS_30: "30 días",
  DIAS_45: "45 días",
  DIAS_60: "60 días",
  DIAS_90: "90 días",
};

/** Tipos de NCF */
export const NCF_LABEL: Record<string, string> = {
  B01: "Factura de Crédito Fiscal",
  B02: "Factura de Consumidor Final",
  B14: "Régimen Especial",
  B15: "Gubernamental",
  E31: "Factura de Crédito Fiscal Electrónica",
  E32: "Factura de Consumidor Final Electrónica",
};
