"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarPreciosVDP, type VDPVenta } from "@/actions/ventas";

const DOP = (n: number) =>
  n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (n: number) =>
  n.toLocaleString("es-DO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

/** Costo con ITBIS incluido (como lo pagamos al suplidor) */
function costoConItbis(costo: number, exento: boolean): number {
  return exento ? costo : costo * 1.18;
}

/** % de ganancia sobre (precioFinal vs costo+ITBIS) */
function ganancia(precioFinal: number, exento: boolean, costo: number | null): number | null {
  if (costo === null || costo === 0) return null;
  const costoTotal = costoConItbis(costo, exento);
  return ((precioFinal - costoTotal) / costoTotal) * 100;
}

function calcSubtotal(
  nuevoPF: number,
  exento: boolean,
  cantidad: number,
  descPct: number
): { subtotal: number; itbis: number; total: number } {
  const precio = exento ? nuevoPF : nuevoPF / 1.18;
  const subtotal = cantidad * precio * (1 - descPct / 100);
  const itbis = exento ? 0 : subtotal * 0.18;
  return { subtotal, itbis, total: subtotal + itbis };
}

type PreciosState = Record<string, string>; // detalleId → string (precio editable)

export function VDPEditor({
  venta,
  busqueda,
}: {
  venta: VDPVenta;
  busqueda: string;
}) {
  const router = useRouter();
  const [precios, setPrecios] = useState<PreciosState>(() => {
    const init: PreciosState = {};
    for (const d of venta.detalles) {
      init[d.id] = d.precioFinal.toFixed(2);
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCancel() {
    // Resetear a los precios originales
    const reset: PreciosState = {};
    for (const d of venta.detalles) {
      reset[d.id] = d.precioFinal.toFixed(2);
    }
    setPrecios(reset);
    setSaved(false);
    setError(null);
  }

  function handleGuardar() {
    setError(null);
    startTransition(async () => {
      const items = venta.detalles.map((d) => ({
        detalleId: d.id,
        nuevoPrecioFinal: parseFloat(precios[d.id] || "0") || 0,
      }));
      const res = await guardarPreciosVDP(venta.id, items);
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  // Calcular totales con los precios editados
  let totalCosto = 0;
  let totalVenta = 0;
  let totalGanancia = 0;
  const filas = venta.detalles.map((d) => {
    const pf = parseFloat(precios[d.id] || "0") || 0;
    const { subtotal, itbis, total } = calcSubtotal(pf, d.exentoItbis, d.cantidad, d.descuento);
    const g = ganancia(pf, d.exentoItbis, d.costo);
    // Costo con ITBIS × cantidad
    const costoUnit = d.costo !== null ? costoConItbis(d.costo, d.exentoItbis) : null;
    const costeLine = costoUnit !== null ? costoUnit * d.cantidad : null;
    if (costeLine !== null) totalCosto += costeLine;
    totalVenta += total;
    if (costeLine !== null) totalGanancia += total - costeLine;
    return { d, pf, subtotal, itbis, total, g, costoUnit, costeLine };
  });

  const totalGananciaPct =
    totalCosto > 0 ? ((totalGanancia / totalCosto) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Encabezado del documento cargado */}
      <div
        className="rounded-lg border p-4 flex flex-wrap items-center gap-4"
        style={{ borderColor: "#F47717", background: "color-mix(in oklch, #F47717 8%, transparent)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="font-mono font-bold text-lg"
              style={{ color: "#F47717" }}
            >
              {venta.numero}
            </span>
            <span className="text-sm text-muted-foreground border rounded px-2 py-0.5">
              {venta.tipo === "ORDEN_VENTA"
                ? "Orden de Venta"
                : venta.tipo === "COTIZACION"
                ? "Cotización"
                : venta.tipo === "CONDUCE"
                ? "Conduce"
                : venta.tipo === "FACTURADA"
                ? "Factura"
                : venta.tipo}
            </span>
            <span className="text-sm font-medium">{venta.cliente}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {venta.detalles.length} productos · Total actual: RD$ {DOP(venta.total)}
          </p>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
              ✓ Precios guardados
            </span>
          )}
          {error && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </span>
          )}
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="rounded border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Cancelar cálculo
          </button>
          <button
            onClick={handleGuardar}
            disabled={isPending}
            className="rounded px-4 py-1.5 text-sm font-semibold text-white transition-colors"
            style={{ background: isPending ? "#ccc" : "#F47717" }}
          >
            {isPending ? "Guardando…" : "Guardar precios"}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ background: "#1A1A1A", color: "#fff" }}
              >
                <th className="px-3 py-2.5 text-left">Código</th>
                <th className="px-3 py-2.5 text-left">Producto</th>
                <th className="px-3 py-2.5 text-center">Cant.</th>
                <th className="px-3 py-2.5 text-right">Costo</th>
                <th className="px-3 py-2.5 text-right">Precio actual</th>
                <th className="px-3 py-2.5 text-right" style={{ color: "#F47717" }}>
                  Precio nuevo
                </th>
                <th className="px-3 py-2.5 text-center">% Ganancia</th>
                <th className="px-3 py-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ d, pf, subtotal, itbis, total, g, costoUnit, costeLine }, i) => {
                const changed =
                  Math.abs(pf - d.precioFinal) > 0.001;
                const gColor =
                  g === null
                    ? "text-muted-foreground"
                    : g < 0
                    ? "text-red-600 font-semibold"
                    : g < 10
                    ? "text-amber-600 font-semibold"
                    : "text-green-600 font-semibold";

                return (
                  <tr
                    key={d.id}
                    style={{
                      background:
                        changed
                          ? "color-mix(in oklch, #F47717 6%, transparent)"
                          : i % 2 === 0
                          ? "var(--background)"
                          : "color-mix(in oklch, var(--border) 15%, transparent)",
                      borderBottom: "1px solid color-mix(in oklch, var(--border) 40%, transparent)",
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {d.codigo}
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <span className="line-clamp-2">{d.nombre}</span>
                      {d.descuento > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          (desc. {d.descuento}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground tabular-nums">
                      {d.cantidad % 1 === 0 ? d.cantidad : d.cantidad.toFixed(2)}{" "}
                      <span className="text-xs">{d.unidad ?? d.unidadMedida}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                      {costoUnit !== null ? (
                        <span>
                          RD$ {DOP(costoUnit)}
                          {costeLine !== null && (
                            <span className="block text-xs">
                              Total: {DOP(costeLine)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      RD$ {DOP(d.precioFinal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-muted-foreground">RD$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={precios[d.id] ?? ""}
                          onChange={(e) =>
                            setPrecios((prev) => ({
                              ...prev,
                              [d.id]: e.target.value,
                            }))
                          }
                          className="w-24 rounded border px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2"
                          style={{
                            borderColor: changed ? "#F47717" : undefined,
                            background: "var(--background)",
                            color: "var(--foreground)",
                          }}
                        />
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${gColor}`}>
                      {g === null ? "—" : pct(g)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="font-medium">RD$ {DOP(total)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totales */}
            <tfoot>
              <tr
                style={{
                  background: "#1A1A1A",
                  color: "#fff",
                  borderTop: "2px solid #F47717",
                }}
              >
                <td colSpan={3} className="px-3 py-3 font-semibold text-sm">
                  TOTALES
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-sm">
                  {totalCosto > 0 ? (
                    <span>RD$ {DOP(totalCosto)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-center tabular-nums text-sm">
                  {totalGananciaPct !== null ? (
                    <span
                      style={{
                        color:
                          totalGananciaPct < 0
                            ? "#ef4444"
                            : totalGananciaPct < 10
                            ? "#f59e0b"
                            : "#22c55e",
                      }}
                    >
                      {pct(totalGananciaPct)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className="font-bold text-base" style={{ color: "#F47717" }}>
                    RD$ {DOP(totalVenta)}
                  </span>
                </td>
              </tr>
              {/* Fila de ganancia */}
              {totalCosto > 0 && (
                <tr
                  style={{
                    background: "#111",
                    borderTop: "1px solid #333",
                  }}
                >
                  <td colSpan={3} className="px-3 py-2 text-xs text-gray-400">
                    Ganancia bruta (precio – costo)
                  </td>
                  <td
                    colSpan={5}
                    className="px-3 py-2 text-right tabular-nums font-semibold text-sm"
                    style={{
                      color:
                        totalGanancia < 0
                          ? "#ef4444"
                          : totalGanancia < 500
                          ? "#f59e0b"
                          : "#22c55e",
                    }}
                  >
                    RD$ {DOP(totalGanancia)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        * El <strong>costo</strong> incluye ITBIS (×1.18). El <strong>% de ganancia</strong>{" "}
        es: (Precio venta − Costo+ITBIS) / Costo+ITBIS.
      </p>
    </div>
  );
}

// ─── Formulario de búsqueda (se puede usar standalone) ───────────────────────

export function VDPSearch({ defaultValue }: { defaultValue: string }) {
  const [q, setQ] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/ventas/vdp?numero=${encodeURIComponent(q.trim().toUpperCase())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ONV/2026/0001 · FAC/2026/0001 · COT/2026/0001"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      />
      <button
        type="submit"
        className="rounded-md px-5 py-2 text-sm font-semibold text-white"
        style={{ background: "#F47717" }}
      >
        Buscar
      </button>
    </form>
  );
}
