"use client";

import { useState } from "react";
import { Pencil, Printer } from "lucide-react";
import { EditarNcModal } from "./editar-nc-modal";

type Estado = "PENDIENTE" | "APLICADA" | "ANULADA";

type NcRow = {
  id: string;
  numero: string;
  motivo: string;
  notas: string | null;
  estado: Estado;
  monto: number;
  montoRestante: number;
  createdAt: Date;
  cliente: { nombre: string; rnc: string | null };
  venta: { numero: string };
  usuario: { nombre: string } | null;
};

interface Props {
  rows: NcRow[];
}

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });

const ESTADO_BADGE: Record<Estado, { label: string; bg: string; color: string }> = {
  PENDIENTE: { label: "Pendiente", bg: "#a855f715", color: "#a855f7" },
  APLICADA:  { label: "Aplicada",  bg: "#22c55e15", color: "#16a34a" },
  ANULADA:   { label: "Anulada",   bg: "#64748b15", color: "#64748b" },
};

const FILTROS: { label: string; val: "todas" | Estado }[] = [
  { label: "Todas", val: "todas" },
  { label: "Pendientes", val: "PENDIENTE" },
  { label: "Aplicadas", val: "APLICADA" },
  { label: "Anuladas", val: "ANULADA" },
];

export function NcTabla({ rows: initialRows }: Props) {
  const [rows, setRows] = useState<NcRow[]>(initialRows);
  const [filtro, setFiltro] = useState<"todas" | Estado>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<NcRow | null>(null);

  const filtered = rows.filter(r => {
    if (filtro !== "todas" && r.estado !== filtro) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        r.numero.toLowerCase().includes(q) ||
        r.cliente.nombre.toLowerCase().includes(q) ||
        r.venta.numero.toLowerCase().includes(q) ||
        r.motivo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const recargar = () => window.location.reload();

  return (
    <>
      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl border bg-muted/30 shrink-0">
          {FILTROS.map(f => (
            <button
              key={f.val}
              onClick={() => setFiltro(f.val)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={
                filtro === f.val
                  ? { backgroundColor: "#a855f7", color: "#fff" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {f.label}
              {f.val !== "todas" && (
                <span className="ml-1 opacity-70">
                  ({rows.filter(r => r.estado === f.val).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por # NC, cliente, factura, motivo…"
          className="flex-1 h-9 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay notas de crédito{filtro !== "todas" ? ` ${ESTADO_BADGE[filtro as Estado]?.label.toLowerCase()}s` : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Número</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Factura</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Motivo</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Monto</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Restante</th>
                <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const badge = ESTADO_BADGE[r.estado];
                return (
                  <tr
                    key={r.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    style={i % 2 === 1 ? { backgroundColor: "var(--muted)/10" } : undefined}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold" style={{ color: "#a855f7" }}>{r.numero}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm leading-tight">{r.cliente.nombre}</p>
                      {r.cliente.rnc && (
                        <p className="text-[11px] text-muted-foreground">{r.cliente.rnc}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{r.venta.numero}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={r.motivo}>{r.motivo}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{fmt(r.monto)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm hidden sm:table-cell">
                      <span className={r.montoRestante < r.monto && r.montoRestante > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                        {fmt(r.montoRestante)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a
                          href={`/nota-credito/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Imprimir NC"
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Printer size={13} />
                        </a>
                        <button
                          onClick={() => setEditando(r)}
                          title="Editar NC"
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Total filas */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {filtered.length} nota{filtered.length !== 1 ? "s" : ""} de crédito
          {filtro !== "todas" ? ` · ${ESTADO_BADGE[filtro as Estado]?.label.toLowerCase()}s` : ""}
          {busqueda ? ` · búsqueda: "${busqueda}"` : ""}
          &nbsp;·&nbsp;Total: {fmt(filtered.reduce((s, r) => s + r.monto, 0))}
        </p>
      )}

      {/* Modal edición */}
      {editando && (
        <EditarNcModal
          nc={{
            id: editando.id,
            numero: editando.numero,
            motivo: editando.motivo,
            notas: editando.notas,
            estado: editando.estado,
            clienteNombre: editando.cliente.nombre,
            monto: editando.monto,
            montoRestante: editando.montoRestante,
          }}
          onClose={() => setEditando(null)}
          onSaved={recargar}
        />
      )}
    </>
  );
}
