"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearCompra, type CompraInput } from "@/actions/compras";
import { getProductoPorCodigo, buscarProductosPorKeyword, siguienteCodigoPorCategoria, crearProducto } from "@/actions/productos";
import { cn } from "@/lib/utils";
import { Search, RotateCcw, AlertCircle, PackagePlus, X, ShoppingCart, FileWarning } from "lucide-react";

// ── Schemas ──────────────────────────────────────────────────────────────────

const DetalleSchema = z.object({
  productoId: z.string().min(1),
  nombre:     z.string(),
  codigo:     z.string(),
  unidad:     z.string(),
  cantidad:   z.coerce.number().positive("Cantidad > 0"),
  costo:      z.coerce.number().min(0),
  costoAnterior: z.coerce.number().optional(),
  itbisPct:   z.coerce.number().default(0),
});

const FormSchema = z.object({
  suplidorId:         z.string().min(1, "Suplidor requerido"),
  noFacturaSuplidor:  z.string().optional(),
  ncf:                z.string().optional(),
  tipoNcfCompra:      z.string().optional(),
  ncfCodigoSeguridad: z.string().optional(),
  fechaFactura:       z.string().min(1, "Fecha requerida"),
  fechaVencimiento:   z.string().optional(),
  notas:              z.string().optional(),
  detalles:           z.array(DetalleSchema).min(1, "Agrega al menos un producto"),
});

type FormValues   = z.infer<typeof FormSchema>;
type Suplidor     = { id: string; nombre: string; rnc: string | null; credito: string };

// Map TipoCredito enum → days
const DIAS_CREDITO: Record<string, number> = {
  CONTADO: 0, DIAS_10: 10, DIAS_15: 15, DIAS_30: 30, DIAS_45: 45, DIAS_60: 60, DIAS_90: 90,
};
type Categoria    = { id: string; codigo: string; nombre: string };
type ProductoSim  = { id: string; nombre: string; codigo: string; costoUltimo: number; stockActual: number; precioVenta: number; porcentajeGanancia: number };
type AlertaPrecio = { productoId: string; nombre: string; costoAnterior: number; nuevoCosto: number; precioVentaActual: number; nuevoPrecioVenta: number; aplicar: boolean };

// ── ITBIS helpers ─────────────────────────────────────────────────────────────
// itbisPct = 0  → el costo ingresado YA incluye ITBIS  → costoNeto = costo / 1.18
// itbisPct = 18 → el costo ingresado NO incluye ITBIS  → costoNeto = costo
const ITBIS_RATE = 0.18;
const costoNetoFn = (costo: number, itbisPct: number) =>
  itbisPct === 0 ? costo / (1 + ITBIS_RATE) : costo;
const itbisAmtFn = (costo: number, itbisPct: number, cant: number) =>
  itbisPct === 0
    ? cant * costo * (ITBIS_RATE / (1 + ITBIS_RATE))
    : cant * costo * ITBIS_RATE;

const NuevoProductoSchema = z.object({
  nombre:            z.string().min(2),
  categoriaId:       z.string().min(1),
  codigo:            z.string().min(1),
  unidadMedida:      z.string().min(1),
  costoUltimo:       z.coerce.number().min(0),
  porcentajeGanancia:z.coerce.number().min(0).default(30),
  precioVenta:       z.coerce.number().min(0),
  stockMinimo:       z.coerce.number().min(0).default(0),
  codigoBarras:      z.string().optional(),
});
type NuevoProductoValues = z.infer<typeof NuevoProductoSchema>;

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_NCF = [
  { value: "B01", label: "B01 — Crédito Fiscal" },
  { value: "B11", label: "B11 — Proveedores Informales" },
  { value: "B14", label: "B14 — Regímenes Especiales" },
  { value: "B15", label: "B15 — Gubernamentales" },
  { value: "E31", label: "E31 — Electrónico Proveedor" },
];
const UNIDADES = ["UND","PIE","M","M2","M3","KG","LB","GLL","FND","CJA","RLL","PLG","TN"];
const DRAFT_KEY = "ferreteria-compra-draft-v2";
const hoy = new Date().toISOString().split("T")[0];

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Subcomponentes ────────────────────────────────────────────────────────────

const CARD_BG  = "color-mix(in srgb, var(--card) 55%, transparent)";
const ACCENT   = "var(--accent-hex)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG }}>
      {/* rounded-t-xl keeps header bg from bleeding past border-radius without overflow-hidden on parent */}
      <div className="px-5 py-3 border-b rounded-t-xl" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children, error, hint, full }: {
  label: string; children: React.ReactNode; error?: string; hint?: string; full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">{label}</label>
      {children}
      {hint  && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const INPUT_CLS = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

// ── Componente principal ──────────────────────────────────────────────────────

interface CompraFormProps { suplidores: Suplidor[]; categorias: Categoria[]; rol?: string }

export function CompraForm({ suplidores, categorias, rol }: CompraFormProps) {
  // rol solo se recibe para referencia; todas las funciones de compra están habilitadas
  // para ADMINISTRADOR y ASISTENTE_ADMINISTRATIVO por igual.
  void rol;
  const router = useRouter();
  const [serverError, setServerError]   = useState<string | null>(null);
  const [busqueda, setBusqueda]         = useState("");
  const [buscando, setBuscando]         = useState(false);
  const [sugerencias, setSugerencias]   = useState<ProductoSim[]>([]);
  const [mostrarSug, setMostrarSug]     = useState(false);
  const [ultimaBusq, setUltimaBusq]     = useState("");
  const [alertaPrecios, setAlertaPrecios] = useState<AlertaPrecio[]>([]);
  const preciosRef      = useRef<Record<string, { precioVenta: number; porcentajeGanancia: number }>>({});
  const costoOriginalRef = useRef<Record<string, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombreInicial, setNombreInicial] = useState("");
  const [costoInicial,  setCostoInicial]  = useState(0);
  const [draftDisponible, setDraftDisponible] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema) as any, defaultValues: { suplidorId: "", fechaFactura: hoy, detalles: [] } });
  const { fields: detalles, append, remove, update } = useFieldArray({ control: form.control, name: "detalles" });
  const watchedDetalles = form.watch("detalles") ?? [];
  const watchedSuplidor = form.watch("suplidorId");
  const watchedTipoNcf  = form.watch("tipoNcfCompra");
  const { errors, isSubmitting } = form.formState;

  // Borrador
  useEffect(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) { const p = JSON.parse(s); if (p?.detalles?.length > 0 || p?.suplidorId) setDraftDisponible(true); } } catch { /* */ }
  }, []);
  const allValues = form.watch();
  useEffect(() => {
    const t = setTimeout(() => { try { const v = form.getValues(); if (v.detalles.length > 0 || !!v.suplidorId || !!v.noFacturaSuplidor) localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch { /* */ } }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allValues)]);
  const restaurarBorrador = () => { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}"); form.reset({ ...d, fechaFactura: d.fechaFactura ?? hoy }); setDraftDisponible(false); } catch { /* */ } };
  const descartarBorrador = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ } setDraftDisponible(false); };

  // Agregar producto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agregarProducto = useCallback((prod: any) => {
    const idx = detalles.findIndex(d => d.productoId === prod.id);
    if (idx >= 0) { update(idx, { ...detalles[idx], cantidad: detalles[idx].cantidad + 1 }); }
    else {
      preciosRef.current[prod.id] = { precioVenta: Number(prod.precioVenta ?? 0), porcentajeGanancia: Number(prod.porcentajeGanancia ?? 30) };
      // costoUltimo en DB siempre es SIN ITBIS; para mostrar con itbisPct=0 (precio incluye ITBIS)
      // pre-llenamos el costo BRUTO (neto × 1.18) para que la división sea consistente.
      const costoNetoDB = Number(prod.costoUltimo);
      costoOriginalRef.current[prod.id] = costoNetoDB;           // referencia en neto
      const costoBruto = Math.round(costoNetoDB * (1 + ITBIS_RATE) * 100) / 100;
      append({ productoId: prod.id, nombre: prod.nombre, codigo: prod.codigo, unidad: prod.unidadMedida, cantidad: 1, costo: costoBruto, costoAnterior: costoBruto, itbisPct: 0 });
    }
    setBusqueda(""); setSugerencias([]); setMostrarSug(false); setUltimaBusq("");
  }, [detalles, append, update]);

  // Búsqueda
  const ejecutarBusqueda = useCallback(async () => {
    if (!busqueda.trim()) return;
    setBuscando(true); setUltimaBusq(busqueda.trim()); setSugerencias([]); setMostrarSug(false);
    try {
      const prod = await getProductoPorCodigo(busqueda.trim());
      if (prod) { agregarProducto(prod); return; }
      const res = await buscarProductosPorKeyword(busqueda.trim());
      if (res.length === 1) agregarProducto(res[0]);
      else if (res.length > 1) { setSugerencias(res as ProductoSim[]); setMostrarSug(true); }
    } finally { setBuscando(false); }
  }, [busqueda, agregarProducto]);

  const handleBusquedaChange = (v: string) => {
    setBusqueda(v); setMostrarSug(false); setUltimaBusq("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setSugerencias([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await buscarProductosPorKeyword(v.trim());
      setSugerencias(res as ProductoSim[]); setMostrarSug(res.length > 0);
    }, 300);
  };

  // Alerta precio — siempre compara costos NETOS (sin ITBIS)
  // overridePct permite pasar el nuevo itbisPct antes de que react-hook-form lo actualice
  const checkAlertaPrecio = (index: number, nuevoCostoBruto: number, overridePct?: number) => {
    const detalle = detalles[index]; if (!detalle) return;
    const itbisPct = overridePct ?? Number(watchedDetalles[index]?.itbisPct ?? 0);
    // costoOriginalRef siempre guarda el costo NETO (sin ITBIS) de la BD
    const costoAnteriorNet = costoOriginalRef.current[detalle.productoId] ?? 0;
    if (costoAnteriorNet <= 0) return;
    // Convertir el costo ingresado a neto para comparar manzanas con manzanas
    const nuevoCostoNet = costoNetoFn(nuevoCostoBruto, itbisPct);
    const precios = preciosRef.current[detalle.productoId];
    const pvActual = precios?.precioVenta ?? 0;
    if (Math.abs((nuevoCostoNet - costoAnteriorNet) / costoAnteriorNet) > 0.05) {
      const ratio = pvActual > 0 ? pvActual / costoAnteriorNet : 1;
      const sugerido = Math.round(nuevoCostoNet * ratio * 100) / 100;
      setAlertaPrecios(prev => [...prev.filter(a => a.productoId !== detalle.productoId), {
        productoId: detalle.productoId, nombre: detalle.nombre,
        costoAnterior: costoAnteriorNet, nuevoCosto: nuevoCostoNet,   // ambos en NETO
        precioVentaActual: pvActual, nuevoPrecioVenta: sugerido, aplicar: true,
      }]);
    } else {
      setAlertaPrecios(prev => prev.filter(a => a.productoId !== detalle.productoId));
    }
  };

  // Totales — siempre sobre costos netos (sin ITBIS)
  const subtotal = watchedDetalles.reduce((s, d) => {
    const cant = Number(d.cantidad)||0;
    const costo = Number(d.costo)||0;
    const pct = Number(d.itbisPct)||0;
    return s + cant * costoNetoFn(costo, pct);
  }, 0);
  const totalItbis = watchedDetalles.reduce((s, d) => {
    const cant = Number(d.cantidad)||0;
    const costo = Number(d.costo)||0;
    const pct = Number(d.itbisPct)||0;
    return s + itbisAmtFn(costo, pct, cant);
  }, 0);
  const total = subtotal + totalItbis;

  // Submit
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError(null);
    try {
      const ajustesPrecio = alertaPrecios.filter(a => a.aplicar && a.nuevoPrecioVenta > 0).map(a => ({ productoId: a.productoId, nuevoPrecioVenta: a.nuevoPrecioVenta }));
      // Normalizar costos antes de enviar al servidor:
      // costoNeto = costo ingresado ÷ 1.18 cuando itbisPct=0 (precio incluía ITBIS)
      // costoNeto = costo ingresado           cuando itbisPct=18 (precio sin ITBIS)
      // costoUltimo en BD siempre se guarda SIN ITBIS.
      const detallesTransformados = values.detalles.map(d => {
        const pct = d.itbisPct ?? 0;
        const neto = costoNetoFn(d.costo, pct);
        const itbisTotal = itbisAmtFn(d.costo, pct, d.cantidad);
        return { productoId: d.productoId, cantidad: d.cantidad, costo: neto, itbis: itbisTotal };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await crearCompra({ ...values, detalles: detallesTransformados, ajustesPrecio } as any);
      if ("error" in result && result.error) { const errs = result.error as Record<string, string[]>; setServerError(Object.values(errs).flat()[0] ?? "Error al guardar"); return; }
      const id = "id" in result ? result.id : "";
      if (!id) { setServerError("La compra se guardó pero no se recibió el ID."); return; }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
      router.push(`/compras/${id}`);
    } catch { setServerError("Error inesperado al guardar."); }
  };

  const onValidationError = (errs: Record<string, unknown>) => {
    const labels: Record<string, string> = { suplidorId: "Suplidor", fechaFactura: "Fecha de factura", detalles: "Productos (agrega al menos uno)" };
    const firstKey = Object.keys(errs)[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setServerError(`${labels[firstKey] ?? firstKey}: ${(errs[firstKey] as any)?.message ?? "campo requerido"}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <NuevoProductoModal
        abierto={modalAbierto} onClose={() => setModalAbierto(false)}
        nombreInicial={nombreInicial} costoInicial={costoInicial} categorias={categorias}
        onProductoCreado={prod => { setModalAbierto(false); agregarProducto(prod); }}
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={form.handleSubmit(onSubmit as any, onValidationError as any)} className="space-y-5 max-w-4xl pb-24">

        {/* ── Banner: borrador ── */}
        {draftDisponible && (
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border px-4 py-3"
            style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 6%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 30%, var(--border))" }}>
            <div className="flex items-center gap-2">
              <RotateCcw size={14} style={{ color: ACCENT }} />
              <p className="text-sm font-medium">Hay un borrador guardado</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={restaurarBorrador}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-muted/40 transition-colors">
                Restaurar
              </button>
              <button type="button" onClick={descartarBorrador}
                className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* ── Error servidor ── */}
        {serverError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* ── Alertas cambio de precio ── */}
        {alertaPrecios.length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#f97316aa", backgroundColor: "color-mix(in oklch, #f97316 6%, var(--card))" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#f9731644", backgroundColor: "color-mix(in oklch, #f97316 10%, var(--card))" }}>
              <div className="flex items-center gap-2">
                <FileWarning size={14} style={{ color: "#f97316" }} />
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#f97316" }}>
                  Cambio de costo detectado — ajusta el precio de venta
                </h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {alertaPrecios.map(a => {
                const pct = ((a.nuevoCosto - a.costoAnterior) / a.costoAnterior) * 100;
                return (
                  <div key={a.productoId} className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{a.nombre}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", pct < 0 ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive")}>
                        {pct > 0 ? "+" : ""}{pct.toFixed(1)}% en costo
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {[
                        { label: "Costo anterior", val: `RD$ ${a.costoAnterior.toFixed(2)}` },
                        { label: "Costo nuevo", val: `RD$ ${a.nuevoCosto.toFixed(2)}` },
                        { label: "Precio actual", val: `RD$ ${a.precioVentaActual.toFixed(2)}` },
                      ].map(({ label, val }) => (
                        <div key={label} className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium font-mono">{val}</p>
                        </div>
                      ))}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Nuevo precio venta</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">RD$</span>
                          <input type="number" step="0.01" min="0" value={a.nuevoPrecioVenta}
                            onChange={e => setAlertaPrecios(prev => prev.map(x => x.productoId === a.productoId ? { ...x, nuevoPrecioVenta: Number(e.target.value) } : x))}
                            className="w-full h-8 rounded-lg border bg-background pl-8 pr-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={a.aplicar}
                        onChange={e => setAlertaPrecios(prev => prev.map(x => x.productoId === a.productoId ? { ...x, aplicar: e.target.checked } : x))}
                        className="rounded" />
                      <span className="text-sm">Actualizar precio de venta al guardar</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Sección 1: Datos de la factura ── */}
        <Section title="Datos de la factura">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Suplidor — fila completa */}
            <Field label="Suplidor *" error={errors.suplidorId?.message} full>
              <SearchableSelect
                value={watchedSuplidor ?? ""}
                onChange={v => {
                  form.setValue("suplidorId", v ?? "");
                  const sup = suplidores.find(s => s.id === v);
                  const dias = DIAS_CREDITO[sup?.credito ?? ""] ?? 0;
                  if (dias > 0) {
                    const fechaFact = form.getValues("fechaFactura") || hoy;
                    const d = new Date(fechaFact + "T00:00:00");
                    d.setDate(d.getDate() + dias);
                    form.setValue("fechaVencimiento", d.toISOString().split("T")[0]);
                  }
                }}
                items={suplidores.map(s => ({
                  id: s.id,
                  label: s.nombre,
                  sublabel: s.rnc ?? null,
                  badge: (DIAS_CREDITO[s.credito] ?? 0) > 0 ? `${DIAS_CREDITO[s.credito]} días de crédito` : null,
                }))}
                placeholder="— Seleccionar suplidor —"
                searchPlaceholder="Buscar por nombre o RNC…"
              />
              {/* RNC + días crédito del suplidor seleccionado */}
              {watchedSuplidor && (() => {
                const sup = suplidores.find(s => s.id === watchedSuplidor);
                const dias = DIAS_CREDITO[sup?.credito ?? ""] ?? 0;
                if (!sup?.rnc && !dias) return null;
                return (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {sup?.rnc && (
                      <span className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5 border font-mono"
                        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
                        RNC: <strong>{sup.rnc}</strong>
                      </span>
                    )}
                    {dias > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5 border font-medium"
                        style={{ backgroundColor: "color-mix(in oklch, #3b82f6 10%, var(--card))", color: "#3b82f6", borderColor: "#3b82f640" }}>
                        {dias} días de crédito
                      </span>
                    )}
                  </div>
                );
              })()}
            </Field>

            <Field label="Nº Factura del suplidor">
              <input className={INPUT_CLS} placeholder="FAC-0001" {...form.register("noFacturaSuplidor")} />
            </Field>

            <Field label="Fecha de factura *" error={errors.fechaFactura?.message}>
              <input className={INPUT_CLS} type="date" {...form.register("fechaFactura", {
                onChange: e => {
                  const sup = suplidores.find(s => s.id === form.getValues("suplidorId"));
                  const dias = DIAS_CREDITO[sup?.credito ?? ""] ?? 0;
                  if (dias > 0 && e.target.value) {
                    const d = new Date(e.target.value + "T00:00:00");
                    d.setDate(d.getDate() + dias);
                    form.setValue("fechaVencimiento", d.toISOString().split("T")[0]);
                  }
                }
              })} />
            </Field>

            <Field label="Tipo de NCF del suplidor">
              <Select value={watchedTipoNcf ?? ""}
                onValueChange={v => {
                  form.setValue("tipoNcfCompra", v || undefined);
                  if (!v || v === "none") { form.setValue("ncf", ""); form.setValue("ncfCodigoSeguridad", ""); }
                }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sin NCF" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin NCF</SelectItem>
                  {TIPOS_NCF.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fecha de vencimiento" hint="Si tiene crédito, genera CxP automáticamente">
              <input className={INPUT_CLS} type="date" {...form.register("fechaVencimiento")} />
            </Field>

            {watchedTipoNcf && watchedTipoNcf !== "none" && (
              <Field label="Número de NCF" hint={watchedTipoNcf === "E31" ? "NCF electrónico (13 caracteres)" : "NCF físico (13 dígitos)"}>
                <input className={INPUT_CLS} placeholder={watchedTipoNcf === "E31" ? "E310000000001" : "B010000000001"} {...form.register("ncf")} />
              </Field>
            )}

            {watchedTipoNcf === "E31" && (
              <Field label="Código de seguridad (E31)">
                <input className={INPUT_CLS} placeholder="Ej. 12345678" {...form.register("ncfCodigoSeguridad")} />
              </Field>
            )}

            <Field label="Notas" full>
              <textarea className={INPUT_CLS + " resize-none h-16"} placeholder="Observaciones sobre esta compra…" {...form.register("notas")} />
            </Field>
          </div>
        </Section>

        {/* ── Sección 2: Productos ── */}
        <Section title="Productos">
          <div className="space-y-4">
            {/* Buscador */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Escribe el código exacto o parte del nombre y presiona{" "}
                <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Enter</kbd>{" "}
                o haz clic en <strong>Agregar</strong>
              </p>
              <div className="relative flex gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full h-9 rounded-lg border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Código, código de barras o nombre del producto…"
                    value={busqueda}
                    onChange={e => handleBusquedaChange(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), ejecutarBusqueda())}
                    onBlur={() => setTimeout(() => setMostrarSug(false), 200)}
                    onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
                    autoComplete="off"
                  />
                  {/* Sugerencias dropdown */}
                  {mostrarSug && sugerencias.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl max-h-56 overflow-y-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                      {sugerencias.map(s => (
                        <button key={s.id} type="button" onMouseDown={() => agregarProducto(s)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center justify-between gap-2 border-b last:border-0 transition-colors">
                          <span>
                            <span className="font-mono text-xs text-muted-foreground mr-2">{s.codigo}</span>
                            {s.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">Stock: {s.stockActual}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={ejecutarBusqueda} disabled={buscando || !busqueda.trim()}
                  className="shrink-0 h-9 px-4 rounded-lg border text-sm font-medium transition-colors hover:bg-muted/50 disabled:opacity-40">
                  {buscando ? "Buscando…" : "Agregar"}
                </button>
              </div>

              {/* Sin resultados → crear */}
              {ultimaBusq && !buscando && sugerencias.length === 0 && !mostrarSug && (
                <div className="flex items-center gap-3 flex-wrap rounded-xl border border-dashed px-4 py-3 bg-muted/20">
                  <p className="text-sm text-muted-foreground flex-1">
                    No se encontró <strong>&ldquo;{ultimaBusq}&rdquo;</strong> en el inventario
                  </p>
                  <button type="button"
                    onClick={() => { setNombreInicial(ultimaBusq); setCostoInicial(0); setModalAbierto(true); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <PackagePlus size={13} /> Crear producto nuevo
                  </button>
                </div>
              )}
            </div>

            {/* Tabla de detalles */}
            {detalles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
                <ShoppingCart size={28} className="opacity-30" />
                <p className="text-sm">Agrega productos usando la búsqueda de arriba</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs w-24">Código</TableHead>
                      <TableHead className="text-xs">Producto</TableHead>
                      <TableHead className="text-xs text-right w-28">Cantidad</TableHead>
                      <TableHead className="text-xs text-right w-40">Costo (RD$)</TableHead>
                      <TableHead className="text-xs text-center w-28">ITBIS en costo</TableHead>
                      <TableHead className="text-xs text-right w-36">Subtotal</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalles.map((d, i) => {
                      const wd     = watchedDetalles[i];
                      const cant   = Number(wd?.cantidad) || 0;
                      const costo  = Number(wd?.costo) || 0;
                      const pct    = Number(wd?.itbisPct) || 0;
                      // Costo neto (sin ITBIS) e ITBIS de esta línea
                      const costoNet = costoNetoFn(costo, pct);
                      const lineItbis = itbisAmtFn(costo, pct, cant);
                      const sub      = cant * costoNet;       // subtotal neto
                      const lineTotal = sub + lineItbis;      // total con ITBIS
                      // Comparación de cambio de precio (neto vs neto)
                      const costoAntNet = costoOriginalRef.current[d.productoId] ?? 0;
                      const cambio5 = costoAntNet > 0 && Math.abs((costoNet - costoAntNet) / costoAntNet) > 0.05;

                      return (
                        <TableRow key={d.id} className="hover:bg-muted/10">
                          <TableCell className="font-mono text-xs text-muted-foreground">{d.codigo}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm leading-tight">{d.nombre}</p>
                            <p className="text-xs text-muted-foreground">{d.unidad}</p>
                            {cambio5 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium mt-0.5 inline-block">
                                Precio cambió
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <input type="number" step="0.0001" min="0.0001"
                              className="w-full h-8 rounded-lg border bg-background px-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                              {...form.register(`detalles.${i}.cantidad`)} />
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">RD$</span>
                              <input type="number" step="0.01" min="0"
                                className="w-full h-8 rounded-lg border bg-background pl-7 pr-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                                {...form.register(`detalles.${i}.costo`, { onChange: e => checkAlertaPrecio(i, Number(e.target.value)) })} />
                            </div>
                            {/* Hint sobre si el costo ingresado incluye o excluye ITBIS */}
                            {costo > 0 && (
                              <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                                {pct === 0
                                  ? `Neto ≈ RD$${costoNet.toFixed(2)}`
                                  : `C/ITBIS ≈ RD$${(costo * 1.18).toFixed(2)}`}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={String(pct)}
                              onValueChange={v => {
                                form.setValue(`detalles.${i}.itbisPct`, Number(v));
                                checkAlertaPrecio(i, costo, Number(v));
                              }}
                            >
                              <SelectTrigger className="h-8 text-center text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Incluido (÷1.18)</SelectItem>
                                <SelectItem value="18">Excluido (+18%)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                              ITBIS: RD${lineItbis.toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-sm font-mono">{fmt(lineTotal)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {sub.toFixed(2)} + {lineItbis.toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <button type="button" onClick={() => remove(i)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <X size={13} />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Error detalles */}
            {errors.detalles && !Array.isArray(errors.detalles) && (
              <p className="text-xs text-destructive">{(errors.detalles as { message?: string }).message}</p>
            )}

            {/* Totales */}
            {detalles.length > 0 && (
              <div className="flex justify-end pt-2">
                <div className="rounded-xl border p-4 space-y-2 w-64" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
                  {[
                    { label: "Subtotal sin ITBIS", val: fmt(subtotal), muted: true },
                    { label: "ITBIS (18%)", val: fmt(totalItbis), muted: true },
                  ].map(({ label, val, muted }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className={muted ? "text-muted-foreground" : "font-bold"}>{label}</span>
                      <span className="font-mono">{val}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold font-mono text-base" style={{ color: ACCENT }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Barra de acción — derecha ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <p className="text-xs text-muted-foreground mr-auto">Borrador guardado automáticamente</p>
          <button type="button" onClick={() => router.back()}
            className="h-9 px-5 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting}
            className={cn("h-9 px-6 rounded-lg text-sm font-bold text-white transition-all", isSubmitting && "opacity-60 pointer-events-none")}
            style={{ backgroundColor: ACCENT }}>
            {isSubmitting ? "Guardando…" : "Registrar compra"}
          </button>
        </div>
      </form>
    </>
  );
}

// ── Modal: crear producto nuevo ───────────────────────────────────────────────

interface NuevoProductoModalProps {
  abierto: boolean; onClose: () => void; nombreInicial: string; costoInicial: number;
  categorias: Categoria[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProductoCreado: (prod: any) => void;
}

function NuevoProductoModal({ abierto, onClose, nombreInicial, costoInicial, categorias, onProductoCreado }: NuevoProductoModalProps) {
  const [duplicados, setDuplicados] = useState<ProductoSim[]>([]);
  const [ignorarDup, setIgnorarDup] = useState(false);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [genCod,     setGenCod]     = useState(false);
  const debDupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const npForm = useForm<NuevoProductoValues>({ resolver: zodResolver(NuevoProductoSchema) as any,
    defaultValues: { nombre: "", categoriaId: "", codigo: "", unidadMedida: "UND", costoUltimo: costoInicial, porcentajeGanancia: 30, precioVenta: 0, stockMinimo: 0, codigoBarras: "" } });

  const watchCosto  = npForm.watch("costoUltimo");
  const watchPct    = npForm.watch("porcentajeGanancia");
  const watchCatId  = npForm.watch("categoriaId");
  const watchNombre = npForm.watch("nombre");

  useEffect(() => {
    if (!abierto) return;
    npForm.reset({ nombre: nombreInicial, categoriaId: "", codigo: "", unidadMedida: "UND", costoUltimo: costoInicial, porcentajeGanancia: 30, precioVenta: costoInicial > 0 ? Math.round(costoInicial * 1.30 * 100) / 100 : 0, stockMinimo: 0, codigoBarras: "" });
    setDuplicados([]); setIgnorarDup(false); setError(null);
    if (nombreInicial.length >= 3) buscarDups(nombreInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, nombreInicial, costoInicial]);

  useEffect(() => {
    const c = Number(watchCosto) || 0; const p = Number(watchPct) || 30;
    npForm.setValue("precioVenta", Math.round(c * (1 + p / 100) * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCosto, watchPct]);

  useEffect(() => {
    if (!watchCatId) return;
    setGenCod(true);
    siguienteCodigoPorCategoria(watchCatId).then(cod => npForm.setValue("codigo", cod)).finally(() => setGenCod(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCatId]);

  const buscarDups = async (q: string) => {
    if (q.trim().length < 3) { setDuplicados([]); return; }
    const res = await buscarProductosPorKeyword(q.trim()); setDuplicados(res as ProductoSim[]);
  };

  useEffect(() => {
    if (debDupRef.current) clearTimeout(debDupRef.current);
    debDupRef.current = setTimeout(() => buscarDups(watchNombre || ""), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchNombre]);

  const onGuardar = async (values: NuevoProductoValues) => {
    if (duplicados.length > 0 && !ignorarDup) { setError("Se encontraron productos similares. Marca 'No es un duplicado' para continuar."); return; }
    setGuardando(true); setError(null);
    try {
      const result = await crearProducto({ ...values, esFraccionable: false, exentoItbis: false, stockActual: 0, activo: true });
      if ("error" in result && result.error) { const errs = result.error as Record<string, string[]>; setError(Object.values(errs).flat()[0] ?? "Error al crear producto"); return; }
      if ("id" in result && result.id) {
        onProductoCreado({ id: result.id, nombre: values.nombre, codigo: values.codigo, unidadMedida: values.unidadMedida, costoUltimo: values.costoUltimo, stockActual: 0, precioVenta: values.precioVenta, porcentajeGanancia: values.porcentajeGanancia });
      }
    } catch { setError("Error inesperado al crear el producto."); }
    finally { setGuardando(false); }
  };

  const npErrors = npForm.formState.errors;

  return (
    <Dialog open={abierto} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Nuevo producto</DialogTitle>
        </DialogHeader>

        {/* Duplicados */}
        {duplicados.length > 0 && (
          <div className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
            <p className="text-sm font-semibold">Producto similar ya existe</p>
            <div className="space-y-1">
              {duplicados.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <span><Badge variant="outline" className="font-mono mr-1.5 text-xs">{d.codigo}</Badge>{d.nombre}</span>
                  <span className="text-muted-foreground">Stock: {d.stockActual}</span>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ignorarDup} onChange={e => { setIgnorarDup(e.target.checked); setError(null); }} className="rounded" />
              <span className="text-sm">No es un duplicado — guardar de todas formas</span>
            </label>
          </div>
        )}

        {error && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</div>}

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={npForm.handleSubmit(onGuardar as any)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Nombre *</label>
            <input className={INPUT_CLS} placeholder="Ej. Cemento Panam 42.5 kg" {...npForm.register("nombre")} />
            {npErrors.nombre && <p className="text-xs text-destructive">{npErrors.nombre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Categoría *</label>
              <Select value={npForm.watch("categoriaId") ?? ""} onValueChange={v => npForm.setValue("categoriaId", v ?? "")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c.id} value={c.id}><span className="font-mono text-xs mr-1 text-muted-foreground">{c.codigo}</span>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              {npErrors.categoriaId && <p className="text-xs text-destructive">{npErrors.categoriaId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Código *</label>
              <input className={INPUT_CLS} placeholder={genCod ? "Generando…" : "Auto al seleccionar"} {...npForm.register("codigo")} />
              {npErrors.codigo && <p className="text-xs text-destructive">{npErrors.codigo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Unidad</label>
              <Select value={npForm.watch("unidadMedida") ?? "UND"} onValueChange={v => npForm.setValue("unidadMedida", v ?? "UND")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Stock mínimo</label>
              <input className={INPUT_CLS} type="number" step="0.01" min="0" placeholder="0" {...npForm.register("stockMinimo")} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Costo (RD$) *</label>
              <input className={INPUT_CLS + " font-mono text-right"} type="number" step="0.01" min="0" placeholder="0.00" {...npForm.register("costoUltimo")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">% Ganancia</label>
              <input className={INPUT_CLS + " font-mono text-right"} type="number" step="0.1" min="0" placeholder="30" {...npForm.register("porcentajeGanancia")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Precio venta *</label>
              <input className={INPUT_CLS + " font-mono text-right"} type="number" step="0.01" min="0" placeholder="0.00" {...npForm.register("precioVenta")} />
              <p className="text-[10px] text-muted-foreground">Auto-calculado</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Código de barras <span className="font-normal normal-case">(opcional)</span></label>
            <input className={INPUT_CLS} placeholder="EAN-13 o UPC" {...npForm.register("codigoBarras")} />
          </div>
          <DialogFooter className="gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando || (duplicados.length > 0 && !ignorarDup)}
              className={cn("h-9 px-5 rounded-lg text-sm font-bold text-white transition-all", (guardando || (duplicados.length > 0 && !ignorarDup)) && "opacity-50 pointer-events-none")}
              style={{ backgroundColor: ACCENT }}>
              {guardando ? "Guardando…" : "Crear y agregar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
