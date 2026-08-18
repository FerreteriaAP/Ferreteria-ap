// Constantes compartidas del módulo de impuestos.
// Este archivo NO es "use server" — puede importarse desde cualquier lado.

export const TIPOS_IMPUESTO = ["ISR", "ANTICIPO_ISR", "INFOTEP", "TSS"] as const;
export type TipoImpuesto = typeof TIPOS_IMPUESTO[number];

export const LABELS_IMPUESTO: Record<TipoImpuesto, { label: string; icon: string; hint: string }> = {
 ISR: { label: "ISR Mensual", icon: "", hint: "Impuesto sobre la renta — declaración mensual" },
 ANTICIPO_ISR: { label: "Anticipo ISR", icon: "", hint: "Anticipo mensual DGII (forma IT-1 o IT-2)" },
 INFOTEP: { label: "Infotep", icon: "", hint: "1% sobre la nómina bruta del mes" },
 TSS: { label: "TSS", icon: "", hint: "AFP + SFS — cuota empleador del mes" },
};

// Tipo plano serializable al cliente (sin Decimal de Prisma)
export type PagoImpuestoRow = {
 id: string;
 tipo: string;
 mes: number;
 anio: number;
 monto: number;
 pagado: boolean;
 fechaPago: string | null;
 referencia: string | null;
 notas: string | null;
};
