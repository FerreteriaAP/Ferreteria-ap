"use client";

import { useState, useTransition } from "react";
import { registrarDineroRecibido } from "@/actions/reportes-caja";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-DO", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const fmtHora = (d: Date | string) =>
  new Date(d).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });

type Fila = {
  turnoId: string;
  numero: number;
  cajero: string;
  fechaCierre: Date;
  fechaApertura: Date;
  montoCierre: number;
  montoAperturaSig: number | null;
  efectivoEsperado: number;
  montoRecibido: number | null;
  diferencia: number | null;
  notas: string | null;
  registrado: boolean;
  registroId: string | null;
};

type Resumen = {
  totalTurnos: number;
  totalEsperado: number;
  totalRecibido: number;
  diferenciaNeta: number;
  pendientes: number;
};

interface Props {
  filas: Fila[];
  resumen: Resumen | null;
}

// ── Row con formulario inline ─────────────────────────────────────────────────

function FilaRegistro({ fila, onGuardado }: { fila: Fila; onGuardado: () => void }) {
  const [editando, setEditando] = useState(!fila.registrado);
  const [monto, setMonto] = useState(
    fila.montoRecibido !== null ? String(fila.montoRecibido) : ""
  );
  const [notas, setNotas] = useState(fila.notas ?? "");
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    const val = parseFloat(monto.replace(",", "."));
    if (isNaN(val) || val < 0) { setError("Ingresa un monto válido"); return; }
    setError(null);
    start(async () => {
      const res = await registrarDineroRecibido({
        turnoId: fila.turnoId,
        montoCierre: fila.montoCierre,
        montoAperturaSig: fila.montoAperturaSig,
        efectivoEsperado: fila.efectivoEsperado,
        montoRecibido: val,
        notas: notas || undefined,
      });
      if ("error" in res && res.error) { setError(res.error); return; }
      setEditando(false);
      onGuardado();
    });
  };

  const montoRecibidoActual = fila.montoRecibido;
  const difActual = fila.diferencia;
  const positivo = difActual !== null && difActual >= 0;

  return (
    <tr className="border-b hover:bg-muted/10 transition-colors group">
      {/* Turno */}
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-sm" style={{ color: "var(--accent-hex)" }}>
          #{fila.numero}
        </span>
      </td>

      {/* Cajero */}
      <td className="px-4 py-3 text-xs">{fila.cajero}</td>

      {/* Fecha cierre */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {fmtFecha(fila.fechaCierre)}<br />
        <span className="text-[10px]">{fmtHora(fila.fechaCierre)}</span>
      </td>

      {/* Cierre en caja */}
      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
        {fmt(fila.montoCierre)}
      </td>

      {/* Apertura siguiente */}
      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
        {fila.montoAperturaSig !== null ? fmt(fila.montoAperturaSig) : (
          <span className="italic text-[10px]">sin turno</span>
        )}
      </td>

      {/* Esperado a recibir */}
      <td className="px-4 py-3 text-right font-mono text-sm font-bold">
        {fmt(fila.efectivoEsperado)}
      </td>

      {/* Recibido + form inline */}
      <td className="px-4 py-3 text-right min-w-[180px]">
        {editando ? (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                onKeyDown={e => e.key === "Enter" && guardar()}
                placeholder="0.00"
                autoFocus
                className="w-28 h-8 rounded-lg border bg-background px-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={guardar}
                disabled={isPending}
                className="h-8 px-3 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--accent-hex)" }}
              >
                {isPending ? "…" : "✓"}
              </button>
              {fila.registrado && (
                <button
                  onClick={() => { setEditando(false); setMonto(String(fila.montoRecibido ?? "")); }}
                  className="h-8 px-2 rounded-lg text-xs border text-muted-foreground hover:bg-muted transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas opcionales…"
              className="w-full h-7 rounded-lg border bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono text-sm font-semibold">
              {montoRecibidoActual !== null ? fmt(montoRecibidoActual) : "—"}
            </span>
            {montoRecibidoActual !== null && (
              <button
                onClick={() => setEditando(true)}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center text-[11px] border text-muted-foreground hover:bg-muted transition-all"
                title="Editar"
              >
                ✎
              </button>
            )}
          </div>
        )}
      </td>

      {/* Diferencia */}
      <td className="px-4 py-3 text-right">
        {difActual !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-mono text-sm font-bold px-2 py-0.5 rounded-lg",
              positivo
                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
            )}
          >
            {positivo ? "+" : ""}{fmt(difActual)}
          </span>
        ) : !fila.registrado ? (
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Pendiente
          </span>
        ) : "—"}
      </td>

      {/* Notas */}
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
        <span className="truncate block">{fila.notas ?? "—"}</span>
      </td>
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function DineroRecibidoTabla({ filas: initialFilas, resumen }: Props) {
  const [filas, setFilas] = useState<Fila[]>(initialFilas);
  const [key, setKey] = useState(0);

  // Forzar reload de datos al guardar (server action revalida la ruta)
  const recargar = () => {
    window.location.reload();
  };

  if (!filas.length) {
    return (
      <div
        className="rounded-xl border py-14 text-center text-muted-foreground"
        style={{ backgroundColor: "color-mix(in srgb, var(--card) 55%, transparent)" }}
      >
        <p className="text-3xl mb-2 text-muted-foreground/30">—</p>
        <p className="font-medium">No hay cierres de caja en este período</p>
      </div>
    );
  }

  return (
    <div key={key} className="space-y-4">
      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border px-4 py-3 col-span-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Cierres</p>
            <p className="text-xl font-bold">{resumen.totalTurnos}</p>
            {resumen.pendientes > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                {resumen.pendientes} pendiente{resumen.pendientes !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="rounded-xl border px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Esperado</p>
            <p className="text-lg font-bold font-mono">{fmt(resumen.totalEsperado)}</p>
            <p className="text-[10px] text-muted-foreground">total efectivo</p>
          </div>
          <div className="rounded-xl border px-4 py-3" style={{ borderColor: "color-mix(in oklch, var(--accent-hex) 30%, var(--border))" }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Recibido</p>
            <p className="text-lg font-bold font-mono" style={{ color: "var(--accent-hex)" }}>
              {fmt(resumen.totalRecibido)}
            </p>
            <p className="text-[10px] text-muted-foreground">registrado</p>
          </div>
          <div className={cn(
            "rounded-xl border px-4 py-3",
            resumen.diferenciaNeta >= 0
              ? "border-green-200 dark:border-green-800"
              : "border-red-200 dark:border-red-800"
          )}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Diferencia neta</p>
            <p className={cn(
              "text-lg font-bold font-mono",
              resumen.diferenciaNeta >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}>
              {resumen.diferenciaNeta >= 0 ? "+" : ""}{fmt(resumen.diferenciaNeta)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {resumen.diferenciaNeta >= 0 ? "a favor" : "faltante"}
            </p>
          </div>
          <div className="rounded-xl border px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Balance</p>
            <p className="text-lg font-bold font-mono">
              {fmt(resumen.totalRecibido)}
            </p>
            <p className="text-[10px] text-muted-foreground">de {fmt(resumen.totalEsperado)}</p>
          </div>
        </div>
      )}

      {/* Nota de efectivo-only */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
        <span>Solo efectivo — el esperado = montoCierre − apertura del turno siguiente</span>
      </div>

      {/* Tabla */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "color-mix(in srgb, var(--card) 55%, transparent)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-[11px] text-muted-foreground uppercase tracking-wide"
                style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}
              >
                <th className="text-left px-4 py-3">Turno</th>
                <th className="text-left px-4 py-3">Cajero</th>
                <th className="text-left px-4 py-3">Fecha cierre</th>
                <th className="text-right px-4 py-3">Cierre caja</th>
                <th className="text-right px-4 py-3">− Apertura sig.</th>
                <th className="text-right px-4 py-3 font-bold" style={{ color: "var(--foreground)" }}>
                  = Esperado
                </th>
                <th className="text-right px-4 py-3">Recibido</th>
                <th className="text-right px-4 py-3">Diferencia</th>
                <th className="text-left px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <FilaRegistro key={f.turnoId} fila={f} onGuardado={recargar} />
              ))}
            </tbody>
            {resumen && filas.some(f => f.montoRecibido !== null) && (
              <tfoot>
                <tr className="border-t-2 bg-muted/30 text-xs font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right text-muted-foreground">TOTALES</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(resumen.totalEsperado)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(resumen.totalRecibido)}</td>
                  <td className={cn(
                    "px-4 py-3 text-right font-mono",
                    resumen.diferenciaNeta >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {resumen.diferenciaNeta >= 0 ? "+" : ""}{fmt(resumen.diferenciaNeta)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
