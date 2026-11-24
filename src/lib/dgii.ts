/**
 * Catálogos y validaciones de la DGII usados en formularios y reportes (606 / 607).
 * Sin dependencias de servidor: se puede importar desde componentes cliente.
 * Fuente: instructivos oficiales de la DGII (606, feb. 2026; 607, dic. 2025).
 */

/** Tipo de Bienes y Servicios Comprados (Formato 606, campo 3). */
export const TIPOS_606: { codigo: string; nombre: string }[] = [
  { codigo: "01", nombre: "Gastos de personal" },
  { codigo: "02", nombre: "Gastos por trabajos, suministros y servicios" },
  { codigo: "03", nombre: "Arrendamientos" },
  { codigo: "04", nombre: "Gastos de activos fijos" },
  { codigo: "05", nombre: "Gastos de representación" },
  { codigo: "06", nombre: "Otras deducciones admitidas" },
  { codigo: "07", nombre: "Gastos financieros" },
  { codigo: "08", nombre: "Gastos extraordinarios" },
  { codigo: "09", nombre: "Compras y gastos que formarán parte del costo de venta" },
  { codigo: "10", nombre: "Adquisiciones de activos" },
  { codigo: "11", nombre: "Gastos de seguros" },
];

/** NCF tradicional (B + 10) o e-NCF (E + 12). */
export const NCF_REGEX = /^(B\d{10}|E\d{12})$/;

export interface FiscalInput {
  suplidorRnc?: string | null;
  suplidorNombre?: string | null;
  ncf?: string | null;
  itbis?: number | null;
  tipo606?: string | null;
  esServicio?: boolean;
}

/**
 * Valida y normaliza los datos fiscales de un gasto. Si no trae NCF, se guardan
 * vacíos (el gasto no va al 606). `monto` es el total pagado, ITBIS incluido.
 */
export function normalizarFiscal(f: FiscalInput | undefined, monto: number):
  { data: { suplidorRnc: string | null; suplidorNombre: string | null; ncf: string | null; itbis: number; tipo606: string | null; esServicio: boolean } }
  | { error: string } {
  const ncf = (f?.ncf ?? "").trim().toUpperCase();
  if (!ncf) {
    return { data: { suplidorRnc: null, suplidorNombre: null, ncf: null, itbis: Number(f?.itbis ?? 0) || 0, tipo606: null, esServicio: f?.esServicio ?? true } };
  }
  if (!NCF_REGEX.test(ncf)) return { error: "NCF inválido: debe ser B + 10 dígitos (B0100000123) o E + 12 dígitos (E310000000123)." };
  const rnc = (f?.suplidorRnc ?? "").replace(/\D/g, "");
  if (rnc.length !== 9 && rnc.length !== 11) return { error: "Con NCF hace falta el RNC (9 dígitos) o la cédula (11 dígitos) del suplidor." };
  const itbis = Number(f?.itbis ?? 0);
  if (!(itbis >= 0)) return { error: "ITBIS inválido." };
  if (itbis > monto) return { error: "El ITBIS no puede ser mayor que el monto." };
  const tipo = f?.tipo606 && TIPOS_606.some((t) => t.codigo === f.tipo606) ? f.tipo606 : "02";
  return {
    data: {
      suplidorRnc: rnc,
      suplidorNombre: (f?.suplidorNombre ?? "").trim() || null,
      ncf,
      itbis: Math.round(itbis * 100) / 100,
      tipo606: tipo,
      esServicio: f?.esServicio ?? true,
    },
  };
}
