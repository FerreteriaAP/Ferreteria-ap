"use client";

import { useState, useTransition } from "react";
import { editarNotaCredito } from "@/actions/nota-credito";
import { FileX2 } from "lucide-react";

const INPUT = "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const SELECT = "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

type Estado = "PENDIENTE" | "APLICADA" | "ANULADA";

interface Props {
  nc: {
    id: string;
    numero: string;
    motivo: string;
    notas: string | null;
    estado: Estado;
    clienteNombre: string;
    monto: number;
    montoRestante: number;
  };
  onClose: () => void;
  onSaved: () => void;
}

const ESTADO_LABEL: Record<Estado, string> = {
  PENDIENTE: "Pendiente",
  APLICADA: "Aplicada",
  ANULADA: "Anulada",
};

export function EditarNcModal({ nc, onClose, onSaved }: Props) {
  const [isPending, start] = useTransition();
  const [motivo, setMotivo] = useState(nc.motivo);
  const [notas, setNotas] = useState(nc.notas ?? "");
  const [estado, setEstado] = useState<Estado>(nc.estado);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number) =>
    `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const anulando = estado === "ANULADA" && nc.estado === "PENDIENTE";

  const handleSave = () => {
    if (!motivo.trim()) { setError("El motivo es requerido"); return; }
    setError(null);
    start(async () => {
      const res = await editarNotaCredito(nc.id, { motivo, notas: notas || undefined, estado });
      if ("error" in res && res.error) { setError(res.error); return; }
      onSaved();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-md flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#a855f720", color: "#a855f7" }}>
            <FileX2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold font-mono text-sm" style={{ color: "#a855f7" }}>{nc.numero}</p>
            <p className="text-xs text-muted-foreground truncate">{nc.clienteNombre}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg shrink-0">✕</button>
        </div>

        {/* Montos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Monto total</p>
            <p className="font-bold font-mono text-sm">{fmt(nc.monto)}</p>
          </div>
          <div className="rounded-xl border px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Restante</p>
            <p className="font-bold font-mono text-sm">{fmt(nc.montoRestante)}</p>
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Estado
          </label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value as Estado)}
            className={SELECT}
          >
            {(["PENDIENTE", "APLICADA", "ANULADA"] as Estado[]).map(s => (
              <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
            ))}
          </select>
          {anulando && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              ⚠️ Al anular esta nota se descontará <strong>{fmt(nc.montoRestante)}</strong> del saldo a favor del cliente.
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Motivo *
          </label>
          <input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className={INPUT}
            placeholder="Motivo de la devolución"
          />
        </div>

        {/* Notas */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Notas
          </label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            placeholder="Observaciones adicionales…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#a855f7" }}
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
