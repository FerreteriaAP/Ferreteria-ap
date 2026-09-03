"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmarRecepcionOC } from "@/actions/ordenes-compra";
import { cn } from "@/lib/utils";
import { FileWarning, AlertCircle } from "lucide-react";

// ── Diseño ────────────────────────────────────────────────────────────────────

const CARD_BG = "color-mix(in srgb, var(--card) 55%, transparent)";
const ACCENT  = "var(--accent-hex)";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG }}>
      <div className="px-5 py-3 border-b rounded-t-xl"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, full }: { label: string; hint?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-full")}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ItemOC {
  id: string;
  productoId: string;
  nombre: string;
  codigo: string;
  unidad: string;
  cantidad: number;
  cantRecibida: number;
  costo: number;
  costoUltimo: number;
  precioVenta: number;
  porcentajeGanancia: number;
}

interface Props {
  ordenId: string;
  suplidorId: string;
  suplidorCredito: string;
  items: ItemOC[];
}

type AlertaPrecio = {
  productoId: string;
  nombre: string;
  costoAnterior: number;
  nuevoCosto: number;
  precioVentaActual: number;
  nuevoPrecioVenta: number;
  aplicar: boolean;
};

// ── Constantes / helpers ─────────────────────────────────────────────────────

const TIPOS_NCF = [
  { value: "B01", label: "B01 — Crédito Fiscal" },
  { value: "B11", label: "B11 — Proveedores Informales" },
  { value: "B14", label: "B14 — Regímenes Especiales" },
  { value: "B15", label: "B15 — Gubernamentales" },
  { value: "E31", label: "E31 — Electrónico Proveedor" },
];

const DIAS_CREDITO: Record<string, number> = {
  CONTADO: 0, DIAS_10: 10, DIAS_15: 15, DIAS_30: 30,
  DIAS_45: 45, DIAS_60: 60, DIAS_90: 90,
};

const ITBIS_RATE = 0.18;

const costoNetoFn = (costo: number, itbisPct: number) =>
  itbisPct === 0 ? costo / (1 + ITBIS_RATE) : costo;

const hoy = new Date().toISOString().split("T")[0];
const fmt = (n: number) => n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Componente ────────────────────────────────────────────────────────────────

export function RecepcionOcForm({ ordenId, suplidorId, suplidorCredito, items }: Props) {
  const router = useRouter();
  const alertaRef = useRef<HTMLDivElement>(null);

  const diasIniciales = DIAS_CREDITO[suplidorCredito] ?? 0;
  const [factura, setFactura] = useState({
    noFacturaSuplidor: "",
    ncf: "",
    tipoNcfCompra: "",
    fechaFactura: hoy,
    fechaVencimiento: diasIniciales > 0 ? addDays(hoy, diasIniciales) : "",
    notas: "",
  });

  const [itemsState, setItemsState] = useState(
    items.map((it) => ({
      ...it,
      cantRecibidaInput: it.cantidad - it.cantRecibida,
      costoInput: it.costo,
      itbisPct: 0 as number,
      descuento: 0 as number,
    }))
  );

  const [alertaPrecios, setAlertaPrecios] = useState<AlertaPrecio[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fecha vencimiento auto ────────────────────────────────────────────────

  const handleFechaFacturaChange = (val: string) => {
    const dias = DIAS_CREDITO[suplidorCredito] ?? 0;
    setFactura((f) => ({
      ...f,
      fechaFactura: val,
      fechaVencimiento: dias > 0 ? addDays(val, dias) : f.fechaVencimiento,
    }));
  };

  // ── Actualizar ítem ───────────────────────────────────────────────────────

  function updateItem<K extends keyof (typeof itemsState)[0]>(idx: number, field: K, value: (typeof itemsState)[0][K]) {
    setItemsState((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  // ── Alerta de cambio de precio ────────────────────────────────────────────

  const checkAlertaPrecio = (idx: number, nuevoCostoBruto: number, overrideItbis?: number, overrideDesc?: number) => {
    const it = itemsState[idx];
    if (!it) return;
    const itbisPct = overrideItbis ?? it.itbisPct;
    const desc     = overrideDesc  ?? it.descuento;

    const costoAnteriorNet = it.costoUltimo;
    if (costoAnteriorNet <= 0) return;

    const nuevoCostoNet        = costoNetoFn(nuevoCostoBruto, itbisPct);
    const nuevoCostoNetConDesc = nuevoCostoNet * (1 - desc / 100);

    if (Math.abs(nuevoCostoNet - costoAnteriorNet) > 0.005) {
      const costoAnteriorBruto = Math.round(costoAnteriorNet     * (1 + ITBIS_RATE) * 100) / 100;
      const nuevoCostoBrutoFmt = Math.round(nuevoCostoNetConDesc * (1 + ITBIS_RATE) * 100) / 100;
      const sugerido           = Math.round(nuevoCostoBrutoFmt * (1 + (it.porcentajeGanancia || 30) / 100) * 100) / 100;

      const esPrimera = !alertaPrecios.some((a) => a.productoId === it.productoId);
      setAlertaPrecios((prev) => [
        ...prev.filter((a) => a.productoId !== it.productoId),
        { productoId: it.productoId, nombre: it.nombre,
          costoAnterior: costoAnteriorBruto, nuevoCosto: nuevoCostoBrutoFmt,
          precioVentaActual: it.precioVenta, nuevoPrecioVenta: sugerido, aplicar: true },
      ]);
      if (esPrimera) {
        setTimeout(() => {
          alertaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } else {
      setAlertaPrecios((prev) => prev.filter((a) => a.productoId !== it.productoId));
    }
  };

  // ── Totales ───────────────────────────────────────────────────────────────

  const subtotal = itemsState.reduce((s, it) => {
    const neto = costoNetoFn(it.costoInput, it.itbisPct) * (1 - it.descuento / 100);
    return s + it.cantRecibidaInput * neto;
  }, 0);
  const totalItbis = subtotal * ITBIS_RATE;
  const total = subtotal + totalItbis;

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const ajustesPrecio = alertaPrecios
      .filter((a) => a.aplicar && a.nuevoPrecioVenta > 0)
      .map((a) => ({ productoId: a.productoId, nuevoPrecioVenta: a.nuevoPrecioVenta }));

    try {
      const res = await confirmarRecepcionOC(ordenId, {
        suplidorId,
        noFacturaSuplidor: factura.noFacturaSuplidor || undefined,
        ncf: factura.ncf || undefined,
        tipoNcfCompra: factura.tipoNcfCompra || undefined,
        fechaFactura: factura.fechaFactura,
        fechaVencimiento: factura.fechaVencimiento || undefined,
        notas: factura.notas || undefined,
        ajustesPrecio,
        items: itemsState.map((it) => {
          const costoNeto = costoNetoFn(it.costoInput, it.itbisPct) * (1 - it.descuento / 100);
          return {
            productoId: it.productoId,
            nombre: it.nombre,
            ordenDetalleId: it.id,
            cantPedida: it.cantidad,
            cantRecibida: it.cantRecibidaInput,
            costo: costoNeto,
            itbisPct: 18,
            descuento: 0,
          };
        }),
      });

      if ("error" in res) {
        setError(typeof res.error === "string" ? res.error : "Verifica los datos");
      } else {
        router.push(`/compras/${res.id}`);
      }
    } catch {
      setError("Error inesperado al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  const diasLabel = diasIniciales > 0
    ? `${diasIniciales} días — vencimiento auto-calculado`
    : "Pago al contado";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl pb-24">

      {/* Error global */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Alertas de cambio de precio ────────────────────────────────────── */}
      {alertaPrecios.length > 0 && (
        <div ref={alertaRef} className="rounded-xl border overflow-hidden"
          style={{ borderColor: `color-mix(in oklch, ${ACCENT} 40%, transparent)`,
                   backgroundColor: `color-mix(in oklch, ${ACCENT} 6%, var(--card))` }}>
          <div className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: `color-mix(in oklch, ${ACCENT} 25%, transparent)`,
                     backgroundColor: `color-mix(in oklch, ${ACCENT} 10%, var(--card))` }}>
            <FileWarning size={14} style={{ color: ACCENT }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              Cambio de costo detectado — ajusta el precio de venta
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {alertaPrecios.map((a) => {
              const pct = ((a.nuevoCosto - a.costoAnterior) / (a.costoAnterior || 1)) * 100;
              return (
                <div key={a.productoId} className="rounded-xl border p-4 space-y-3"
                  style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.nombre}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                      pct < 0 ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive")}>
                      {pct > 0 ? "+" : ""}{pct.toFixed(1)}% costo
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Costo anterior",      val: `RD$ ${fmt(a.costoAnterior)}` },
                      { label: "Nuevo costo",         val: `RD$ ${fmt(a.nuevoCosto)}` },
                      { label: "Precio venta actual", val: `RD$ ${fmt(a.precioVentaActual)}` },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-lg p-2.5"
                        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 5%, var(--card))" }}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                        <p className="font-semibold font-mono text-sm">{val}</p>
                      </div>
                    ))}
                    <div className="rounded-lg p-2.5"
                      style={{ backgroundColor: `color-mix(in oklch, ${ACCENT} 10%, var(--card))`,
                               borderWidth: 1, borderStyle: "solid",
                               borderColor: `color-mix(in oklch, ${ACCENT} 30%, transparent)` }}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Nuevo precio venta</p>
                      <input
                        type="number" step="0.01" min="0"
                        value={a.nuevoPrecioVenta}
                        onChange={(e) => setAlertaPrecios((prev) => prev.map((x) =>
                          x.productoId === a.productoId ? { ...x, nuevoPrecioVenta: Number(e.target.value) } : x))}
                        className="w-full h-8 rounded-lg border bg-background px-2 text-sm font-mono font-semibold focus:outline-none"
                        style={{ borderColor: `color-mix(in oklch, ${ACCENT} 50%, transparent)` }}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={a.aplicar}
                      onChange={(e) => setAlertaPrecios((prev) => prev.map((x) =>
                        x.productoId === a.productoId ? { ...x, aplicar: e.target.checked } : x))}
                      className="rounded" />
                    <span>Actualizar precio de venta al guardar</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Datos de la factura ───────────────────────────────────────────── */}
      <Section title="Datos de la factura"
        hint={diasIniciales > 0 ? `Crédito: ${diasLabel}` : diasLabel}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="No. Factura suplidor">
            <Input placeholder="001-00001" value={factura.noFacturaSuplidor}
              onChange={(e) => setFactura((f) => ({ ...f, noFacturaSuplidor: e.target.value }))} />
          </Field>

          <Field label="Tipo NCF">
            <Select onValueChange={(v) => setFactura((f) => ({ ...f, tipoNcfCompra: v ?? "" }))}
              value={factura.tipoNcfCompra}>
              <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
              <SelectContent>
                {TIPOS_NCF.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="NCF">
            <Input placeholder="B0100000001" value={factura.ncf}
              onChange={(e) => setFactura((f) => ({ ...f, ncf: e.target.value }))} />
          </Field>

          <Field label="Fecha de factura *">
            <Input type="date" required value={factura.fechaFactura}
              onChange={(e) => handleFechaFacturaChange(e.target.value)} />
          </Field>

          <Field label="Fecha vencimiento (CxP)"
            hint={diasIniciales > 0 ? `Auto: +${diasIniciales} días desde fecha factura` : "Dejar vacío si es contado"}>
            <Input type="date" min={factura.fechaFactura} value={factura.fechaVencimiento}
              onChange={(e) => setFactura((f) => ({ ...f, fechaVencimiento: e.target.value }))} />
          </Field>

          <Field label="Notas" full>
            <Input placeholder="Opcional…" value={factura.notas}
              onChange={(e) => setFactura((f) => ({ ...f, notas: e.target.value }))} />
          </Field>
        </div>
      </Section>

      {/* ── Productos recibidos ───────────────────────────────────────────── */}
      <Section title="Productos recibidos"
        hint="ITBIS Incluido = el precio ya tiene ITBIS (÷1.18) · Excluido = precio sin ITBIS (×1.18)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Producto", "Pedido", "Recibido", "Cantidad", "Costo unit.", "ITBIS", "Desc %", "Subtotal"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 first:pl-0 last:pr-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {itemsState.map((it, i) => {
                const pendiente = it.cantidad - it.cantRecibida;
                const neto = costoNetoFn(it.costoInput, it.itbisPct);
                const netoConDesc = neto * (1 - it.descuento / 100);
                const sub = it.cantRecibidaInput * netoConDesc;
                const itbisAmt = sub * ITBIS_RATE;
                return (
                  <tr key={it.id} className={cn("transition-opacity", pendiente <= 0 && "opacity-40")}>
                    <td className="py-3 pr-3 pl-0">
                      <div className="font-medium leading-tight">{it.nombre}</div>
                      <div className="text-xs text-muted-foreground">{it.codigo} · {it.unidad}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-xs whitespace-nowrap">{it.cantidad}</td>
                    <td className="py-3 px-2 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {it.cantRecibida > 0 ? it.cantRecibida : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <Input type="number" step="0.0001" min="0" max={pendiente}
                        className="h-8 w-24 text-right font-mono" value={it.cantRecibidaInput}
                        disabled={pendiente <= 0}
                        onChange={(e) => updateItem(i, "cantRecibidaInput",
                          Math.min(Number(e.target.value), pendiente))} />
                    </td>
                    <td className="py-3 px-2">
                      <Input type="number" step="0.01" min="0"
                        className="h-8 w-28 text-right font-mono" value={it.costoInput}
                        disabled={pendiente <= 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateItem(i, "costoInput", v);
                          checkAlertaPrecio(i, v);
                        }} />
                    </td>
                    <td className="py-3 px-2">
                      <Select value={String(it.itbisPct)} disabled={pendiente <= 0}
                        onValueChange={(v) => {
                          const pct = Number(v ?? "0");
                          updateItem(i, "itbisPct", pct);
                          checkAlertaPrecio(i, it.costoInput, pct);
                        }}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Incluido</SelectItem>
                          <SelectItem value="18">Excluido</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2">
                      <Input type="number" step="1" min="0" max="100"
                        className="h-8 w-20 text-right font-mono" value={it.descuento}
                        disabled={pendiente <= 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateItem(i, "descuento", v);
                          checkAlertaPrecio(i, it.costoInput, undefined, v);
                        }} />
                    </td>
                    <td className="py-3 pl-2 pr-0 text-right">
                      <div className="font-semibold font-mono text-sm">RD$ {fmt(sub)}</div>
                      {itbisAmt > 0 && (
                        <div className="text-muted-foreground text-[10px] font-mono">ITBIS {fmt(itbisAmt)}</div>
                      )}
                      {it.descuento > 0 && (
                        <div className="text-green-600 text-[10px]">−{it.descuento}%</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="mt-5 pt-4 border-t flex justify-end">
          <div className="space-y-1.5 min-w-56">
            {[
              { label: "Subtotal (neto)", val: fmt(subtotal) },
              { label: "ITBIS (18%)",     val: fmt(totalItbis) },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between gap-8 text-sm text-muted-foreground">
                <span>{label}</span>
                <span className="font-mono">RD$ {val}</span>
              </div>
            ))}
            <div className="flex justify-between gap-8 font-bold text-base border-t pt-2 mt-1">
              <span>Total</span>
              <span className="font-mono" style={{ color: ACCENT }}>RD$ {fmt(total)}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Barra de acción ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <a href={`/ordenes-compra/${ordenId}`}
          className="h-9 px-5 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors inline-flex items-center">
          Cancelar
        </a>
        <button type="submit" disabled={submitting}
          className={cn("h-9 px-6 rounded-lg text-sm font-bold text-white transition-all inline-flex items-center gap-2",
            submitting && "opacity-60 pointer-events-none")}
          style={{ backgroundColor: ACCENT }}>
          {submitting ? "Procesando…" : "✓ Confirmar recepción"}
        </button>
      </div>

    </form>
  );
}
