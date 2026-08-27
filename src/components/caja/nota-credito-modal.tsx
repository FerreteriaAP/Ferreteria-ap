"use client";

import { useState, useTransition, type FormEvent } from "react";
import { buscarFacturaPorNumeroExacto, crearNotaCredito, type NotaCreditoDetalleItem } from "@/actions/nota-credito";
import { cn } from "@/lib/utils";
import { FileX2, Printer, CheckCircle2 } from "lucide-react";

const INPUT = "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FacturaResult = NonNullable<Awaited<ReturnType<typeof buscarFacturaPorNumeroExacto>>>;
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

interface NcCreada { numero: string; id: string | null }

export function NotaCreditoModal({ turnoId, onClose, onOk }: Props) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ncCreada, setNcCreada] = useState<NcCreada | null>(null);

  // Búsqueda por número exacto — sin keywords ni dropdown
  const [serial, setSerial] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [busquedaError, setBusquedaError] = useState<string | null>(null);

  const [factura, setFactura] = useState<FacturaResult | null>(null);
  const [items, setItems] = useState<ItemNC[]>([]);
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");

  const totalNC = items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * i.precioUnitario, 0);

  const buscarFactura = async () => {
    const num = serial.trim();
    if (!num) { setBusquedaError("Ingresa el número de factura"); return; }
    setBuscando(true);
    setBusquedaError(null);
    setFactura(null);
    setItems([]);
    const f = await buscarFacturaPorNumeroExacto(num);
    setBuscando(false);
    if (!f) {
      setBusquedaError("Factura no encontrada. Verifica el número e inténtalo de nuevo.");
      return;
    }
    setFactura(f);
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

  const limpiar = () => {
    setSerial("");
    setFactura(null);
    setItems([]);
    setBusquedaError(null);
    setError(null);
  };

  const setItemCantidad = (pid: string, val: string) =>
    setItems(prev => prev.map(i => i.productoId === pid ? { ...i, cantidad: val } : i));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!factura) { setError("Selecciona una factura"); return; }


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
      const ok = res as { ok: true; numero: string; id: string | null };
      setNcCreada({ numero: ok.numero, id: ok.id });
    });
  };

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────
  if (ncCreada) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 text-center">
          <CheckCircle2 size={48} className="text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Nota de crédito generada</p>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: "#a855f7" }}>{ncCreada.numero}</p>
            <p className="text-xs text-muted-foreground mt-1">El crédito fue acreditado al saldo del cliente.</p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            {ncCreada.id && (
              <a
                href={`/nota-credito/${ncCreada.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-white font-semibold text-sm transition-colors"
                style={{ backgroundColor: "#a855f7" }}
              >
                <Printer size={16} />
                Imprimir nota de crédito
              </a>
            )}
            <button
              onClick={() => { onOk(ncCreada.numero); onClose(); }}
              className="w-full h-10 rounded-xl border text-sm font-medium hover:bg-accent transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Buscador por número EXACTO — sin keywords ni dropdown */}
        <div className="px-5 shrink-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Número de factura
          </label>
          {!factura ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={serial}
                onChange={e => { setSerial(e.target.value.toUpperCase()); setBusquedaError(null); }}
                onKeyDown={e => e.key === "Enter" && buscarFactura()}
                placeholder="Ej: FAC/2026/0071"
                className={INPUT + " font-mono flex-1"}
              />
              <button
                type="button"
                onClick={buscarFactura}
                disabled={buscando}
                className="px-4 h-10 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#a855f7" }}
              >
                {buscando ? "…" : "Buscar"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/30">
              <div>
                <p className="text-sm font-mono font-bold" style={{ color: "#a855f7" }}>{factura.numero}</p>
                <p className="text-xs text-muted-foreground">{factura.cliente.nombre}</p>
              </div>
              <button type="button" onClick={limpiar} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-3">
                ✕ cambiar
              </button>
            </div>
          )}
          {busquedaError && (
            <p className="text-xs text-destructive mt-1.5">{busquedaError}</p>
          )}
          {!factura && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Requiere el número exacto de la factura física del cliente.
            </p>
          )}
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
                Motivo de la devolución
              </label>
              <input
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Producto defectuoso, error en pedido… (opcional)"
                className={INPUT}
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
              "flex-1 h-10 rounded-xl text-sm font-bold transition-all border-2",
              isPending || !factura || totalNC <= 0
                ? "border-muted text-muted-foreground cursor-not-allowed"
                : ""
            )}
            style={!(isPending || !factura || totalNC <= 0) ? { borderColor: "#a855f7", color: "#a855f7" } : undefined}
          >
            {isPending ? "Generando…" : `Generar nota de crédito${totalNC > 0 ? ` (${fmt(totalNC)})` : ""}`}
          </button>
        </div>

      </div>
    </div>
  );
}
