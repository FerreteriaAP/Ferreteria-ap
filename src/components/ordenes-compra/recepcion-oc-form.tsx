"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { confirmarRecepcionOC } from "@/actions/ordenes-compra";
import { cn } from "@/lib/utils";
import { FileWarning, AlertCircle } from "lucide-react";

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
  costoUltimo: number;      // costo en BD (sin ITBIS) — para alertas
  precioVenta: number;
  porcentajeGanancia: number;
}

interface Props {
  ordenId: string;
  suplidorId: string;
  suplidorCredito: string;  // TipoCredito enum value
  items: ItemOC[];
}

type AlertaPrecio = {
  productoId: string;
  nombre: string;
  costoAnterior: number;    // bruto (con ITBIS)
  nuevoCosto: number;       // bruto (con ITBIS), neto con descuento
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

// itbisPct=0  → precio incluye ITBIS → costoNeto = precio / 1.18
// itbisPct=18 → precio excluye ITBIS → costoNeto = precio
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

  // Datos de la factura
  const diasIniciales = DIAS_CREDITO[suplidorCredito] ?? 0;
  const [factura, setFactura] = useState({
    noFacturaSuplidor: "",
    ncf: "",
    tipoNcfCompra: "",
    fechaFactura: hoy,
    fechaVencimiento: diasIniciales > 0 ? addDays(hoy, diasIniciales) : "",
    notas: "",
  });

  // Estado de cada ítem: cantidades, costo, itbisPct, descuento
  const [itemsState, setItemsState] = useState(
    items.map((it) => ({
      ...it,
      cantRecibidaInput: it.cantidad - it.cantRecibida,
      costoInput: it.costo,
      itbisPct: 0 as number,   // 0 = incluido, 18 = excluido
      descuento: 0 as number,
    }))
  );

  // Alertas de cambio de precio
  const [alertaPrecios, setAlertaPrecios] = useState<AlertaPrecio[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Actualizar fecha de vencimiento cuando cambia fecha factura ────────────

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

  // ── Alerta de cambio de precio ─────────────────────────────────────────────

  const checkAlertaPrecio = (idx: number, nuevoCostoBruto: number, overrideItbis?: number, overrideDesc?: number) => {
    const it = itemsState[idx];
    if (!it) return;
    const itbisPct = overrideItbis ?? it.itbisPct;
    const desc     = overrideDesc  ?? it.descuento;

    const costoAnteriorNet = it.costoUltimo; // ya está sin ITBIS en BD
    if (costoAnteriorNet <= 0) return;

    const nuevoCostoNet        = costoNetoFn(nuevoCostoBruto, itbisPct);
    const nuevoCostoNetConDesc = nuevoCostoNet * (1 - desc / 100);

    if (Math.abs(nuevoCostoNet - costoAnteriorNet) > 0.005) {
      const costoAnteriorBruto = Math.round(costoAnteriorNet        * (1 + ITBIS_RATE) * 100) / 100;
      const nuevoCostoBrutoFmt = Math.round(nuevoCostoNetConDesc    * (1 + ITBIS_RATE) * 100) / 100;
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
          const el = alertaRef.current;
          if (!el) return;
          const top = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
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
          // Normalizar: enviar siempre costo NETO (sin ITBIS, con descuento) al servidor
          const costoNeto = costoNetoFn(it.costoInput, it.itbisPct) * (1 - it.descuento / 100);
          return {
            productoId: it.productoId,
            nombre: it.nombre,
            ordenDetalleId: it.id,
            cantPedida: it.cantidad,
            cantRecibida: it.cantRecibidaInput,
            costo: costoNeto,
            itbisPct: 18, // ya viene sin ITBIS → itbisPct=18 para que el servidor no divida de nuevo
            descuento: 0, // ya aplicado en costoNeto
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

  const diasLabel = diasIniciales > 0 ? `${diasIniciales} días de crédito (${suplidorCredito.replace("DIAS_", "")})` : "Al contado";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl pb-10">

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Alertas de cambio de precio */}
      {alertaPrecios.length > 0 && (
        <div ref={alertaRef} className="rounded-xl border overflow-hidden"
          style={{ borderColor: "#f9731688", backgroundColor: "color-mix(in oklch, #f97316 6%, var(--card))" }}>
          <div className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "#f9731644", backgroundColor: "color-mix(in oklch, #f97316 10%, var(--card))" }}>
            <FileWarning size={14} style={{ color: "#f97316" }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#f97316" }}>
              Cambio de costo detectado — ajusta el precio de venta
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {alertaPrecios.map((a) => {
              const pct = ((a.nuevoCosto - a.costoAnterior) / (a.costoAnterior || 1)) * 100;
              return (
                <div key={a.productoId} className="rounded-lg border p-4 space-y-3"
                  style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.nombre}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                      pct < 0 ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive")}>
                      {pct > 0 ? "+" : ""}{pct.toFixed(1)}% en costo
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: "Costo anterior",      val: `RD$ ${a.costoAnterior.toFixed(2)}` },
                      { label: "Nuevo costo",         val: `RD$ ${a.nuevoCosto.toFixed(2)}` },
                      { label: "Precio venta actual", val: `RD$ ${a.precioVentaActual.toFixed(2)}` },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-md p-2.5"
                        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 5%, var(--card))" }}>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="font-semibold font-mono text-sm">{val}</p>
                      </div>
                    ))}
                    <div className="rounded-md p-2.5"
                      style={{ backgroundColor: "color-mix(in oklch, #f97316 10%, var(--card))", borderColor: "#f9731644" }}>
                      <p className="text-xs text-muted-foreground mb-1">Nuevo precio venta</p>
                      <input
                        type="number" step="0.01" min="0"
                        value={a.nuevoPrecioVenta}
                        onChange={(e) => setAlertaPrecios((prev) => prev.map((x) =>
                          x.productoId === a.productoId ? { ...x, nuevoPrecioVenta: Number(e.target.value) } : x))}
                        className="w-full h-8 rounded border bg-background px-2 text-sm font-mono font-semibold"
                        style={{ borderColor: "#f9731688" }}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={a.aplicar}
                      onChange={(e) => setAlertaPrecios((prev) => prev.map((x) =>
                        x.productoId === a.productoId ? { ...x, aplicar: e.target.checked } : x))}
                      className="rounded"
                    />
                    <span>Actualizar precio de venta al guardar</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Datos de la factura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la factura del suplidor</CardTitle>
          {diasIniciales > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Crédito: <span className="font-semibold">{diasLabel}</span> — fecha de vencimiento calculada automáticamente
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">

          <div className="space-y-1.5">
            <Label>No. Factura suplidor</Label>
            <Input placeholder="001-00001" value={factura.noFacturaSuplidor}
              onChange={(e) => setFactura((f) => ({ ...f, noFacturaSuplidor: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo NCF</Label>
            <Select onValueChange={(v) => setFactura((f) => ({ ...f, tipoNcfCompra: v ?? "" }))}
              value={factura.tipoNcfCompra}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_NCF.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>NCF</Label>
            <Input placeholder="B0100000001" value={factura.ncf}
              onChange={(e) => setFactura((f) => ({ ...f, ncf: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de factura *</Label>
            <Input type="date" required value={factura.fechaFactura}
              onChange={(e) => handleFechaFacturaChange(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha vencimiento (CxP)</Label>
            <Input type="date" min={factura.fechaFactura} value={factura.fechaVencimiento}
              onChange={(e) => setFactura((f) => ({ ...f, fechaVencimiento: e.target.value }))} />
            <p className="text-xs text-muted-foreground">
              {diasIniciales > 0 ? `Auto: +${diasIniciales} días desde fecha factura` : "Dejar vacío si es pago al contado"}
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <Label>Notas</Label>
            <Textarea rows={2} value={factura.notas}
              onChange={(e) => setFactura((f) => ({ ...f, notas: e.target.value }))} />
          </div>

        </CardContent>
      </Card>

      {/* Productos recibidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos recibidos</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajusta cantidad, costo, ITBIS y descuento por línea.
            ITBIS: <strong>Incluido</strong> = el precio ya tiene ITBIS · <strong>Excluido</strong> = precio sin ITBIS
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Producto</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Pedido</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Recibido</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-24">Cantidad</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-32">Costo unit.</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-32">ITBIS</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-24">Desc %</th>
                  <th className="text-right py-2 pl-2 text-xs font-medium text-muted-foreground">Subtotal</th>
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
                    <tr key={it.id} className={pendiente <= 0 ? "opacity-40" : ""}>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{it.nombre}</div>
                        <div className="text-xs text-muted-foreground">{it.codigo} · {it.unidad}</div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-xs">{it.cantidad} {it.unidad}</td>
                      <td className="py-3 px-2 text-right font-mono text-xs text-muted-foreground">
                        {it.cantRecibida > 0 ? `${it.cantRecibida} ${it.unidad}` : "—"}
                      </td>
                      <td className="py-3 px-2">
                        <Input type="number" step="0.0001" min="0" max={pendiente}
                          className="h-8 text-right font-mono" value={it.cantRecibidaInput}
                          disabled={pendiente <= 0}
                          onChange={(e) => updateItem(i, "cantRecibidaInput",
                            Math.min(Number(e.target.value), pendiente))} />
                      </td>
                      <td className="py-3 px-2">
                        <Input type="number" step="0.01" min="0"
                          className="h-8 text-right font-mono" value={it.costoInput}
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
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Incluido (÷1.18)</SelectItem>
                            <SelectItem value="18">Excluido (×1.18)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-2">
                        <Input type="number" step="1" min="0" max="100"
                          className="h-8 text-right font-mono" value={it.descuento}
                          disabled={pendiente <= 0}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            updateItem(i, "descuento", v);
                            checkAlertaPrecio(i, it.costoInput, undefined, v);
                          }} />
                      </td>
                      <td className="py-3 pl-2 text-right font-mono text-xs">
                        <div className="font-semibold">RD$ {fmt(sub)}</div>
                        {itbisAmt > 0 && (
                          <div className="text-muted-foreground text-[10px]">ITBIS: {fmt(itbisAmt)}</div>
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
          <div className="mt-4 pt-4 border-t flex justify-end">
            <div className="space-y-1 text-right min-w-64">
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">RD$ {fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-muted-foreground">ITBIS (18%)</span>
                <span className="font-mono">RD$ {fmt(totalItbis)}</span>
              </div>
              <div className="flex justify-between gap-8 font-semibold border-t pt-1 mt-1">
                <span>Total</span>
                <span className="font-mono">RD$ {fmt(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        <a href={`/ordenes-compra/${ordenId}`} className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </a>
        <button type="submit" disabled={submitting}
          className={cn(buttonVariants(), "bg-green-600 hover:bg-green-700", submitting && "opacity-60 pointer-events-none")}>
          {submitting ? "Procesando..." : "✓ Confirmar recepción y crear compra"}
        </button>
      </div>

    </form>
  );
}
