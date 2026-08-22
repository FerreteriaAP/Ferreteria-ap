"use client";

import { useState, useTransition, useRef, type FormEvent } from "react";
import { buscarFacturasParaNC, crearNotaCredito, type NotaCreditoDetalleItem } from "@/actions/nota-credito";
import { cn } from "@/lib/utils";
import { FileX2 } from "lucide-react";

const INPUT = "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FacturaResult = Awaited<ReturnType<typeof buscarFacturasParaNC>>[number];
type DetalleVenta = FacturaResult["detalles"][number];

interface ItemNC {
  productoId: string;
  nombre: string;
  unidad: string;
  cantidadMax: number;
  cantidad: string;
  precioUnitario: number;
}

interface Props {
  turnoId: string;
  onClose: () => void;
  onOk: (numero: string) => void;
}

export function NotaCreditoModal({ turnoId, onClose, onOk }: Props) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<FacturaResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [factura, setFactura] = useState<FacturaResult | null>(null);
  const [items, setItems] = useState<ItemNC[]>([]);
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");

  const totalNC = items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * i.precioUnitario, 0);

  const handleQuery = (val: string) => {
    setQuery(val);
    setFactura(null);
    setItems([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setResultados([]); return; }
    setBuscando(true);
    timerRef.current = setTimeout(async () => {
      const r = await buscarFacturasParaNC(val);
      setResultados(r);
      setBuscando(false);
    }, 300);
  };

  const seleccionarFactura = (f: FacturaResult) => {
    setFactura(f);
    setResultados([]);
    setQuery(`${f.numero} — ${f.cliente.nombre}`);
    setItems(f.detalles.map((d: DetalleVenta) => ({
      productoId: d.productoId,
      nombre: d.descripcion ?? d.producto.nombre,
      unidad: d.unidad ?? d.producto.unidadMedida,
      cantidadMax: Number(d.cantidad),
      cantidad: "",
      precioUnitario: Number(d.precioFinal),
    })));
    setError(null);
  };

  const setItemCantidad = (pid: string, val: string) =>
    setItems(prev => prev.map(i => i.productoId === pid ? { ...i, cantidad: val } : i));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!factura) { setError("Selecciona una factura"); return; }
    if (!motivo.trim()) { setError("Indica el motivo de la devolución"); return; }

    const detalles: NotaCreditoDetalleItem[] = items
      .filter(i => parseFloat(i.cantidad) > 0)
      .map(i => {
        const cant = parseFloat(i.cantidad);
        return {
          productoId: i.productoId,
          nombre: i.nombre,
          unidad: i.unidad,
          cantidad: cant,
          precioUnitario: i.precioUnitario,
          subtotal: parseFloat((cant * i.precioUnitario).toFixed(2)),
        };
      });

    if (!detalles.length) { setError("Indica la cantidad devuelta de al menos un artículo"); return; }

    for (const i of items) {
      const cant = parseFloat(i.cantidad) || 0;
      if (cant > i.cantidadMax) {
        setError(`La cantidad de "${i.nombre}" supera lo facturado (${i.cantidadMax})`);
        return;
      }
    }

    setError(null);
    start(async () => {
      const res = await crearNotaCredito({ ventaId: factura.id, turnoId, motivo, detalles, notas: notas || undefined });
      if ("error" in res && res.error) { setError(res.error); return; }
      onOk((res as { ok: true; numero: string }).numero);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#a855f720", color: "#a855f7" }}
            >
              <FileX2 size={18} />
            </div>
            <h2 className="text-base font-bold">Nota de crédito</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        {/* Buscador — FUERA del scroll, z-10 para que el dropdown quede sobre el footer */}
        <div className="px-5 shrink-0 relative z-10">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Factura original
          </label>
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => handleQuery(e.target.value)}
              placeholder="Número de factura o nombre del cliente…"
              className={INPUT}
            />
            {buscando && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                buscando…
              </span>
            )}
            {resultados.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto" style={{ backgroundColor: "var(--card-bg-hex, var(--card))", borderColor: "var(--card-border-hex, var(--border))" }}>
                {resultados.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => seleccionarFactura(f)}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-mono font-bold" style={{ color: "var(--accent-hex)" }}>{f.numero}</p>
                        <p className="text-xs font-medium">{f.cliente.nombre}</p>
                        {f.cliente.rnc && <p className="text-xs text-muted-foreground">{f.cliente.rnc}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-bold">{fmt(Number(f.total))}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(f.fechaEmision).toLocaleDateString("es-DO")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contenido scrollable — solo cuando hay factura seleccionada */}
        <form id="nc-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 pt-4 space-y-4">

          {factura && items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Cantidad a devolver por artículo
              </p>
              <div className="rounded-xl border overflow-hidden">
                {items.map(i => (
                  <div
                    key={i.productoId}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Facturado: {i.cantidadMax} {i.unidad} · {fmt(i.precioUnitario)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={i.cantidadMax}
                        value={i.cantidad}
                        onChange={e => setItemCantidad(i.productoId, e.target.value)}
                        onFocus={e => e.currentTarget.select()}
                        placeholder="0"
                        className="w-20 h-8 rounded-lg border bg-background px-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <span className="text-xs text-muted-foreground w-8">{i.unidad}</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalNC > 0 && (
                <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-sm font-semibold">Crédito a aplicar</span>
                  <span className="font-mono font-bold text-primary">{fmt(totalNC)}</span>
                </div>
              )}
            </div>
          )}

          {factura && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Motivo de la devolución *
              </label>
              <input
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Producto defectuoso, error en pedido…"
                className={INPUT}
                required
              />
            </div>
          )}

          {factura && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Notas (opcional)
              </label>
              <input
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Observaciones adicionales…"
                className={INPUT}
              />
            </div>
          )}

          {factura && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-300">
              El crédito se sumará al <strong>saldo a favor</strong> de {factura.cliente.nombre}.
              Saldo actual: {fmt(Number(factura.cliente.saldoFavor))}.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Espaciador para que el último campo no quede pegado al footer */}
          <div className="h-1" />
        </form>

        {/* Footer con botones — siempre fijo abajo */}
        <div className="px-5 pb-5 pt-3 shrink-0 flex gap-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="nc-form"
            disabled={isPending || !factura || totalNC <= 0}
            className={cn(
              "flex-1 h-10 rounded-xl text-sm font-bold transition-all",
              isPending || !factura || totalNC <= 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "text-white"
            )}
            style={!(isPending || !factura || totalNC <= 0) ? { backgroundColor: "#a855f7" } : undefined}
          >
            {isPending ? "Generando…" : `Generar nota de crédito${totalNC > 0 ? ` (${fmt(totalNC)})` : ""}`}
          </button>
        </div>

      </div>
    </div>
  );
}
