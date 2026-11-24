"use client";

import { TIPOS_606 } from "@/lib/dgii";

export interface FiscalState {
  tiene: boolean;
  suplidorRnc: string;
  suplidorNombre: string;
  ncf: string;
  itbis: string;
  tipo606: string;
  esServicio: boolean;
}

export const fiscalVacio = (tipo606 = "02", esServicio = true): FiscalState => ({
  tiene: false, suplidorRnc: "", suplidorNombre: "", ncf: "", itbis: "", tipo606, esServicio,
});

/** Convierte el estado del formulario en lo que reciben las acciones (o undefined si no hay NCF). */
export function fiscalParaEnviar(f: FiscalState) {
  if (!f.tiene || !f.ncf.trim()) return undefined;
  return {
    suplidorRnc: f.suplidorRnc,
    suplidorNombre: f.suplidorNombre,
    ncf: f.ncf,
    itbis: f.itbis ? Number(f.itbis) : 0,
    tipo606: f.tipo606,
    esServicio: f.esServicio,
  };
}

/**
 * Datos del comprobante fiscal del suplidor (para el Formato 606).
 * Opcional: solo se llena si el gasto o la compra trae NCF (B01 / E31).
 */
export function ComprobanteFiscalCampos({ value, onChange, monto, inputClassName, mostrarNaturaleza = true }: {
  value: FiscalState;
  onChange: (v: FiscalState) => void;
  monto?: number;
  inputClassName?: string;
  mostrarNaturaleza?: boolean;
}) {
  const cls = inputClassName ?? "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  const set = (p: Partial<FiscalState>) => onChange({ ...value, ...p });
  const sugerido = monto && monto > 0 ? (monto - monto / 1.18).toFixed(2) : null;

  return (
    <div className="rounded-xl border p-3 space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input type="checkbox" checked={value.tiene} onChange={(e) => set({ tiene: e.target.checked })} />
        Tiene comprobante fiscal (NCF del suplidor)
      </label>
      {value.tiene && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">RNC o cédula del suplidor *</span>
            <input className={cls + " font-mono"} inputMode="numeric" value={value.suplidorRnc}
              onChange={(e) => set({ suplidorRnc: e.target.value })} placeholder="101000000" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Nombre del suplidor</span>
            <input className={cls} value={value.suplidorNombre}
              onChange={(e) => set({ suplidorNombre: e.target.value })} placeholder="Razón social" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">NCF *</span>
            <input className={cls + " font-mono uppercase"} value={value.ncf}
              onChange={(e) => set({ ncf: e.target.value.toUpperCase().trim() })} placeholder="B0100000123 o E310000000123" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">ITBIS de la factura (RD$)</span>
            <input className={cls + " font-mono text-right"} type="number" min="0" step="0.01" value={value.itbis}
              onChange={(e) => set({ itbis: e.target.value })} placeholder={sugerido ?? "0.00"} />
            {sugerido && !value.itbis && (
              <button type="button" className="text-[11px] underline text-muted-foreground" onClick={() => set({ itbis: sugerido })}>
                Usar 18% incluido: {sugerido}
              </button>
            )}
          </div>
          <div className={"space-y-1 " + (mostrarNaturaleza ? "" : "sm:col-span-2")}>
            <span className="text-xs text-muted-foreground">Tipo de gasto (606)</span>
            <select className={cls} value={value.tipo606} onChange={(e) => set({ tipo606: e.target.value })}>
              {TIPOS_606.map((t) => <option key={t.codigo} value={t.codigo}>{t.codigo} – {t.nombre}</option>)}
            </select>
          </div>
          {mostrarNaturaleza && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Es un…</span>
              <select className={cls} value={value.esServicio ? "S" : "B"} onChange={(e) => set({ esServicio: e.target.value === "S" })}>
                <option value="S">Servicio</option>
                <option value="B">Bien</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
