"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearCotizacion, actualizarCotizacion, buscarProductosVenta, type VentaInput } from "@/actions/ventas";
import { completarDatosCliente } from "@/actions/contactos";
import { cn } from "@/lib/utils";
import { Search, X, ShoppingCart, AlertCircle, Scissors, UserPen, Plus, Check } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Cliente = {
  id: string; nombre: string; rnc: string | null;
  telefono: string | null; email: string | null;
  credito: string;
  limiteCredito: unknown; reglaPrecio: string | null; margenPrecio: unknown;
  direcciones: { id: string; etiqueta: string; direccion: string }[];
};

type ProductoSugerido = {
  id: string; codigo: string; nombre: string; unidadMedida: string;
  precioVenta: unknown; costoUltimo: number | null; stockActual: unknown;
  esFraccionable: boolean; unidadFraccion: string | null; factorFraccion: unknown;
  precioFraccion: number | null;
  exentoItbis: boolean; categoriaCode: string;
};

interface DetalleRow {
  productoId: string; nombre: string; codigo: string;
  unidad: string; unidadOriginal: string; unidadFraccion: string | null;
  cantidad: number; precio: number; precioCompleto: number;
  descuento: number; itbis: number; exentoItbis: boolean;
  stockActual: number; esFraccionable: boolean; factorFraccion: number | null;
  precioFraccion: number | null;
  modoFraccionar: boolean; costoUltimo: number | null; categoriaCode: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcPrecioKolmen(costo: number, margen: number, exento: boolean) {
  if (exento) return +(costo * (1 + margen)).toFixed(4);
  return +(costo * 1.18 * (1 + margen)).toFixed(4);
}

function calcItbisLinea(precioFinal: number, cantidad: number, descuento: number, exento: boolean) {
  const precioBase = exento ? precioFinal : precioFinal / 1.18;
  const sub  = precioBase * cantidad * (1 - descuento / 100);
  const itbis = exento ? 0 : +(sub * 0.18).toFixed(2);
  return { precioBase: +precioBase.toFixed(4), itbis };
}

const fmt = (n: number) => n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Alertas de margen ─────────────────────────────────────────────────────────

const CATS_UMBRAL_15 = ["FT", "ET", "PL"];

function calcMargen(precioFinal: number, costoUltimo: number, exentoItbis: boolean): number {
  if (costoUltimo <= 0) return 0;
  const costoRef = exentoItbis ? costoUltimo : costoUltimo * 1.18;
  return ((precioFinal - costoRef) / costoRef) * 100;
}

function nivelAlertaFila(d: DetalleRow): "negativo" | "bajo" | null {
  if (!d.costoUltimo || d.costoUltimo <= 0) return null;
  // Si está en modo fracción, el costo de referencia es por fracción
  const costoEfectivo = (d.modoFraccionar && d.factorFraccion && d.factorFraccion > 0)
    ? d.costoUltimo / d.factorFraccion
    : d.costoUltimo;
  const margen = calcMargen(d.precio, costoEfectivo, d.exentoItbis);
  if (margen < 0) return "negativo";
  const cat = d.categoriaCode.toUpperCase();
  if (CATS_UMBRAL_15.some(c => cat.startsWith(c)) && margen < 15) return "bajo";
  return null;
}

const CREDITO_LABEL: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 Días", DIAS_15: "15 Días",
  DIAS_30: "30 Días", DIAS_45: "45 Días", DIAS_60: "60 Días", DIAS_90: "90 Días",
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

const CARD_BG = "color-mix(in srgb, var(--card) 55%, transparent)";
const ACCENT  = "var(--accent-hex)";
const INPUT_CLS = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG }}>
      <div className="px-5 py-3 border-b rounded-t-xl" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children, hint, full }: {
  label: string; children: React.ReactNode; hint?: string; full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export interface DetalleRowInit {
  productoId: string; nombre: string; codigo: string;
  unidad: string; unidadOriginal: string; unidadFraccion: string | null;
  cantidad: number; precio: number; precioCompleto: number;
  descuento: number; itbis: number; exentoItbis: boolean;
  stockActual: number; esFraccionable: boolean; factorFraccion: number | null;
  precioFraccion: number | null; modoFraccionar: boolean;
  costoUltimo: number | null; categoriaCode: string;
}

interface VentaFormProps {
  clientes: Cliente[];
  /** Cuando se proporciona, el formulario opera en modo edición */
  ventaId?: string;
  initialClienteId?: string;
  initialDireccionId?: string;
  initialCredito?: "CONTADO"|"DIAS_10"|"DIAS_15"|"DIAS_30"|"DIAS_45"|"DIAS_60"|"DIAS_90";
  initialFechaEntrega?: string;
  initialNotas?: string;
  initialDetalles?: DetalleRowInit[];
}

export function VentaForm({
  clientes,
  ventaId,
  initialClienteId = "",
  initialDireccionId = "",
  initialCredito = "CONTADO",
  initialFechaEntrega,
  initialNotas = "",
  initialDetalles = [],
}: VentaFormProps) {
  const router = useRouter();
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const modoEdicion = !!ventaId;

  // Encabezado
  const [clienteId,    setClienteId]    = useState(initialClienteId);
  const [direccionId,  setDireccionId]  = useState(initialDireccionId);
  const [credito,      setCredito]      = useState<"CONTADO"|"DIAS_10"|"DIAS_15"|"DIAS_30"|"DIAS_45"|"DIAS_60"|"DIAS_90">(initialCredito);
  const [fechaEntrega, setFechaEntrega] = useState(initialFechaEntrega ?? new Date().toISOString().slice(0, 10));
  const [notas,        setNotas]        = useState(initialNotas);

  // Productos
  const [detalles,    setDetalles]    = useState<DetalleRow[]>(initialDetalles);
  const [busqueda,    setBusqueda]    = useState("");
  const [buscando,    setBuscando]    = useState(false);
  const [sugerencias, setSugerencias] = useState<ProductoSugerido[]>([]);
  const [mostrarSug,  setMostrarSug]  = useState(false);
  const busquedaRef = useRef<HTMLInputElement>(null);

  const cliente    = clientes.find(c => c.id === clienteId);

  // ── Datos frescos del cliente (verificados desde API en cada selección) ──
  type DatosFrescos = { id: string; nombre: string; telefono: string | null; rnc: string | null; email: string | null; direcciones: { id: string; etiqueta: string; direccion: string }[] } | null;
  const [datosFrescos, setDatosFrescos] = useState<DatosFrescos>(null);
  const direcciones = datosFrescos?.direcciones ?? cliente?.direcciones ?? [];

  // ── Panel completar datos cliente ──
  const [completarTel,   setCompletarTel]   = useState("");
  const [completarRnc,   setCompletarRnc]   = useState("");
  const [completarEmail, setCompletarEmail] = useState("");
  const [agregarDir,     setAgregarDir]     = useState(false);
  const [dirEtiqueta,    setDirEtiqueta]    = useState("Entrega");
  const [dirDireccion,   setDirDireccion]   = useState("");
  const [dirSector,      setDirSector]      = useState("");
  const [dirCiudad,      setDirCiudad]      = useState("Santo Domingo");
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [datosGuardados, setDatosGuardados] = useState(false);

  // Datos faltantes calculados sobre los datos frescos (siempre actualizados)
  const datosRef = datosFrescos ?? cliente;
  const faltaTel   = !!datosRef && !datosRef.telefono;
  const faltaRnc   = !!datosRef && !datosRef.rnc;
  const faltaEmail = !!datosRef && !datosRef.email;
  const hayFaltantes = faltaTel || faltaRnc || faltaEmail;

  useEffect(() => {
    setDireccionId("");
    setDatosFrescos(null);
    setCompletarTel(""); setCompletarRnc(""); setCompletarEmail("");
    setAgregarDir(false); setDirEtiqueta("Entrega"); setDirDireccion(""); setDirSector(""); setDirCiudad("Santo Domingo");
    setDatosGuardados(false);
    if (cliente?.credito && cliente.credito !== "CONTADO") setCredito(cliente.credito as typeof credito);
    else setCredito("CONTADO");

    // Verificar datos actuales desde la API (no los del caché de la página)
    if (clienteId) {
      fetch(`/api/contactos/datos?id=${clienteId}`)
        .then(r => r.json())
        .then((d: DatosFrescos) => setDatosFrescos(d))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function guardarDatosCliente() {
    if (!cliente) return;
    setGuardandoDatos(true);
    await completarDatosCliente(cliente.id, {
      telefono: completarTel || undefined,
      rnc:      completarRnc || undefined,
      email:    completarEmail || undefined,
      nuevaDireccion: agregarDir && dirDireccion.trim() ? {
        etiqueta: dirEtiqueta, direccion: dirDireccion,
        sector: dirSector || undefined, ciudad: dirCiudad,
      } : undefined,
    });
    // Refrescar datos tras guardar
    const updated: DatosFrescos = await fetch(`/api/contactos/datos?id=${cliente.id}`).then(r => r.json()).catch(() => null);
    setDatosFrescos(updated);
    setGuardandoDatos(false);
    setDatosGuardados(true);
    setAgregarDir(false); setDirDireccion(""); setDirSector(""); setDirEtiqueta("Entrega"); setDirCiudad("Santo Domingo");
  }

  // Búsqueda
  useEffect(() => {
    if (busqueda.trim().length < 2) { setSugerencias([]); setMostrarSug(false); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      const res = await buscarProductosVenta(busqueda.trim());
      setSugerencias(res as ProductoSugerido[]); setMostrarSug(res.length > 0); setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Agregar producto
  const agregarProducto = useCallback((prod: ProductoSugerido) => {
    setMostrarSug(false); setBusqueda(""); setError(null);
    const factor   = prod.factorFraccion ? Number(prod.factorFraccion) : null;
    const esExento = prod.exentoItbis ?? false;
    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    const esKolmen = clienteSeleccionado?.reglaPrecio === "MARGEN_COSTO" && clienteSeleccionado.margenPrecio != null;
    let pventa = Number(prod.precioVenta);
    if (esKolmen && prod.costoUltimo != null && Number(prod.costoUltimo) > 0) {
      const margen = Number(clienteSeleccionado!.margenPrecio) / 100;
      pventa = calcPrecioKolmen(Number(prod.costoUltimo), margen, esExento);
    }
    const idx = detalles.findIndex(d => d.productoId === prod.id);
    if (idx >= 0) { setDetalles(prev => prev.map((d, i) => i === idx ? { ...d, cantidad: d.cantidad + 1 } : d)); return; }
    const { itbis: itbisInicial } = calcItbisLinea(pventa, 1, 0, esExento);
    setDetalles(prev => [...prev, {
      productoId: prod.id, nombre: prod.nombre, codigo: prod.codigo,
      unidad: prod.unidadMedida, unidadOriginal: prod.unidadMedida,
      unidadFraccion: prod.unidadFraccion ?? null, cantidad: 1,
      precio: pventa, precioCompleto: pventa, descuento: 0,
      itbis: itbisInicial, exentoItbis: esExento,
      stockActual: Number(prod.stockActual), esFraccionable: prod.esFraccionable,
      factorFraccion: factor, modoFraccionar: false,
      precioFraccion: prod.precioFraccion ?? null,
      costoUltimo: prod.costoUltimo, categoriaCode: prod.categoriaCode ?? "",
    }]);
    busquedaRef.current?.focus();
  }, [detalles, clienteId, clientes]);

  const toggleFraccionar = (i: number) => {
    setDetalles(prev => prev.map((d, idx) => {
      if (idx !== i || !d.esFraccionable || !d.factorFraccion) return d;
      const nuevoModo  = !d.modoFraccionar;
      // Si el producto tiene precio de fracción configurado, usarlo; sino auto-calcular
      const nuevoPrecio = nuevoModo
        ? (d.precioFraccion ?? +(d.precioCompleto / d.factorFraccion).toFixed(4))
        : d.precioCompleto;
      const nuevaUnidad = nuevoModo ? (d.unidadFraccion ?? d.unidadOriginal) : d.unidadOriginal;
      const { itbis } = calcItbisLinea(nuevoPrecio, 1, 0, d.exentoItbis);
      return { ...d, modoFraccionar: nuevoModo, precio: nuevoPrecio, unidad: nuevaUnidad, cantidad: 1, itbis };
    }));
  };

  const actualizarDetalle = (i: number, campo: keyof DetalleRow, valor: number | string | boolean) => {
    setDetalles(prev => prev.map((d, idx) => {
      if (idx !== i) return d;
      const updated  = { ...d, [campo]: valor };
      const precio   = campo === "precio"    ? Number(valor) : d.precio;
      const cantidad = campo === "cantidad"  ? Number(valor) : d.cantidad;
      const descuento = campo === "descuento" ? Number(valor) : d.descuento;
      const exento   = campo === "exentoItbis" ? Boolean(valor) : d.exentoItbis;
      if (["precio","cantidad","descuento","exentoItbis"].includes(campo))
        updated.itbis = calcItbisLinea(precio, cantidad, descuento, exento).itbis;
      return updated;
    }));
  };

  const remover = (i: number) => setDetalles(prev => prev.filter((_, idx) => idx !== i));

  // Totales
  const subtotal    = detalles.reduce((s, d) => { const { precioBase } = calcItbisLinea(d.precio, d.cantidad, d.descuento, d.exentoItbis); return s + precioBase * d.cantidad * (1 - d.descuento / 100); }, 0);
  const totalItbis  = detalles.reduce((s, d) => s + d.itbis, 0);
  const totalGeneral = subtotal + totalItbis;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!clienteId) { setError("Selecciona un cliente"); return; }
    if (detalles.length === 0) { setError("Agrega al menos un producto"); return; }
    if (detalles.some(d => !d.cantidad || d.cantidad <= 0 || !d.precio || d.precio <= 0)) { setError("Revisa cantidades y precios — todos deben ser mayores a cero"); return; }

    // Alerta de margen negativo
    const negativos = detalles.filter(d => nivelAlertaFila(d) === "negativo");
    if (negativos.length > 0) {
      const nombres = negativos.map(d => {
        const m = calcMargen(d.precio, d.costoUltimo!, d.exentoItbis);
        return `${d.codigo} (${m.toFixed(1)}%)`;
      }).join(", ");
      const ok = window.confirm(
        `⚠️ MARGEN NEGATIVO\n\n${nombres}\n\n¿Deseas continuar de todas formas?`
      );
      if (!ok) return;
    }

    const input: VentaInput = {
      clienteId, direccionId: direccionId || undefined, credito,
      fechaEntrega: fechaEntrega || undefined, notas: notas || undefined,
      detalles: detalles.map(d => {
        const { precioBase } = calcItbisLinea(d.precio, d.cantidad, d.descuento, d.exentoItbis);
        return { productoId: d.productoId, unidad: d.unidad, cantidad: d.cantidad, precio: precioBase, precioFinal: d.precio, exentoItbis: d.exentoItbis, descuento: d.descuento, itbis: d.itbis };
      }),
    };

    setLoading(true);
    try {
      if (modoEdicion && ventaId) {
        const result = await actualizarCotizacion(ventaId, input);
        setLoading(false);
        if ("error" in result && result.error) { setError(String(result.error)); return; }
        router.push(`/ventas/${ventaId}`);
        router.refresh();
      } else {
        const result = await crearCotizacion(input as VentaInput);
        setLoading(false);
        if ("error" in result) { setError(String(result.error) || "Error al guardar la cotización"); return; }
        router.push(`/ventas/${result.id}`);
      }
    } catch (err) {
      setLoading(false); setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 max-w-5xl pb-24">

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Sección: Cliente ── */}
      <Section title="Datos del cliente">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cliente — fila completa */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente *</label>
              <a href="/contactos/nuevo?tipo=CLIENTE" target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1 rounded-lg border hover:bg-muted/40 transition-colors">
                + Crear cliente
              </a>
            </div>
            <SearchableSelect
              value={clienteId}
              onChange={v => setClienteId(v ?? "")}
              items={clientes.map(c => ({
                id: c.id,
                label: c.nombre,
                sublabel: c.rnc ?? null,
                badge: c.credito !== "CONTADO" ? (CREDITO_LABEL[c.credito] ?? null) : null,
              }))}
              placeholder="Seleccionar cliente…"
              searchPlaceholder="Buscar por nombre o RNC…"
            />
          </div>

          {/* ── Panel: completar/agregar datos del cliente ── */}
          {cliente && !datosGuardados && (
            <div className="sm:col-span-2 rounded-xl border-2 border-dashed overflow-hidden"
              style={{ borderColor: "color-mix(in oklch, var(--accent-hex) 40%, var(--border))", backgroundColor: "color-mix(in oklch, var(--accent-hex) 4%, var(--card))" }}>
              <div className="px-4 py-2.5 border-b flex items-center gap-2"
                style={{ borderColor: "color-mix(in oklch, var(--accent-hex) 20%, var(--border))" }}>
                <UserPen size={13} style={{ color: "var(--accent-hex)" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-hex)" }}>
                  {hayFaltantes ? `Completar perfil — ${cliente.nombre}` : `Agregar dirección — ${cliente.nombre}`}
                </span>
                <span className="text-[11px] text-muted-foreground ml-1">se guarda en la ficha del cliente</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Datos faltantes */}
                {faltaTel && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Teléfono</label>
                    <input value={completarTel} onChange={e => setCompletarTel(e.target.value)}
                      placeholder="809-000-0000" className={INPUT_CLS} />
                  </div>
                )}
                {faltaRnc && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">RNC / Cédula</label>
                    <input value={completarRnc} onChange={e => setCompletarRnc(e.target.value)}
                      placeholder="1-01-00000-0" className={INPUT_CLS} />
                  </div>
                )}
                {faltaEmail && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                    <input type="email" value={completarEmail} onChange={e => setCompletarEmail(e.target.value)}
                      placeholder="cliente@email.com" className={INPUT_CLS} />
                  </div>
                )}

                {/* Dirección — SIEMPRE disponible para agregar */}
                {!agregarDir ? (
                  <div className={hayFaltantes ? "" : "sm:col-span-2"}>
                    <button type="button" onClick={() => setAgregarDir(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-muted/40 transition-colors">
                      <Plus size={12} /> Agregar dirección de entrega
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Etiqueta</label>
                      <input value={dirEtiqueta} onChange={e => setDirEtiqueta(e.target.value)}
                        placeholder="Entrega / Obra / Sucursal" className={INPUT_CLS} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Dirección *</label>
                      <input value={dirDireccion} onChange={e => setDirDireccion(e.target.value)}
                        placeholder="Calle, No., Edificio..." className={INPUT_CLS} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sector</label>
                      <input value={dirSector} onChange={e => setDirSector(e.target.value)}
                        placeholder="Sector / Barrio" className={INPUT_CLS} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Ciudad</label>
                      <input value={dirCiudad} onChange={e => setDirCiudad(e.target.value)}
                        placeholder="Santo Domingo" className={INPUT_CLS} />
                    </div>
                  </>
                )}

                {/* Botón guardar — solo si hay algo que guardar */}
                {(faltaTel && completarTel) || (faltaRnc && completarRnc) || (faltaEmail && completarEmail) || (agregarDir && dirDireccion.trim()) ? (
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="button" onClick={guardarDatosCliente} disabled={guardandoDatos}
                      className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "var(--accent-hex)", color: "#fff" }}>
                      {guardandoDatos ? "Guardando…" : <><Check size={13} /> Guardar en perfil</>}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Confirmación guardado */}
          {datosGuardados && (
            <div className="sm:col-span-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 px-1">
              <Check size={13} /> Datos guardados en el perfil de {cliente?.nombre}
            </div>
          )}

          {/* Dirección — si ya tiene o recién se agregó */}
          {direcciones.length > 0 && (
            <Field label="Dirección de entrega">
              <Select value={direccionId} onValueChange={v => setDireccionId((v ?? "") as string)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Dirección (opcional)">
                    {direccionId ? (() => { const d = direcciones.find(d => d.id === direccionId); return d ? `${d.etiqueta}: ${d.direccion}` : null; })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--card-bg-hex)", borderColor: "var(--card-border-hex)" }}>
                  {direcciones.map(dir => <SelectItem key={dir.id} value={dir.id}>{dir.etiqueta}: {dir.direccion}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Condición de pago">
            <Select value={credito} onValueChange={v => setCredito((v ?? "CONTADO") as typeof credito)}>
              <SelectTrigger className="h-9"><SelectValue>{CREDITO_LABEL[credito] ?? credito}</SelectValue></SelectTrigger>
              <SelectContent style={{ backgroundColor: "var(--card-bg-hex)", borderColor: "var(--card-border-hex)" }}>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="DIAS_10">10 Días</SelectItem>
                <SelectItem value="DIAS_15">15 Días</SelectItem>
                <SelectItem value="DIAS_30">30 Días</SelectItem>
                <SelectItem value="DIAS_45">45 Días</SelectItem>
                <SelectItem value="DIAS_60">60 Días</SelectItem>
                <SelectItem value="DIAS_90">90 Días</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Fecha de entrega">
            <input className={INPUT_CLS} type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
          </Field>

          <Field label="Notas" full>
            <textarea className={INPUT_CLS + " resize-none h-16"} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones, condiciones especiales…" />
          </Field>
        </div>
      </Section>

      {/* ── Sección: Productos ── */}
      <Section title="Productos">
        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative max-w-xl">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={busquedaRef}
                  className="w-full h-9 rounded-lg border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Código, código de barras o nombre del producto…"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") { setMostrarSug(false); setBusqueda(""); } }}
                  onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
                  onBlur={() => setTimeout(() => setMostrarSug(false), 200)}
                  autoComplete="off"
                />
              </div>
              {buscando && <span className="self-center text-xs text-muted-foreground px-1">Buscando…</span>}
            </div>

            {/* Dropdown sugerencias */}
            {mostrarSug && sugerencias.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full rounded-xl border shadow-xl max-h-72 overflow-y-auto" style={{ backgroundColor: "var(--card-bg-hex, var(--card))", borderColor: "var(--card-border-hex, var(--border))" }}>
                {sugerencias.map(s => {
                  const factor = s.factorFraccion ? Number(s.factorFraccion) : null;
                  return (
                    <button key={s.id} type="button" onMouseDown={() => agregarProducto(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-sm">{s.nombre}</span>
                          {s.esFraccionable && s.unidadFraccion && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">Fraccionable — {s.unidadFraccion}</Badge>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {s.codigo}
                            {s.esFraccionable && factor && <> · {factor} {s.unidadFraccion} por {s.unidadMedida}</>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold font-mono" style={{ color: ACCENT }}>
                            RD$ {fmt(Number(s.precioVenta))} /{s.unidadMedida}
                          </div>
                          {s.esFraccionable && factor && (
                            <div className="text-[10px] text-muted-foreground">
                              RD$ {fmt(Number(s.precioVenta) / factor)} /{s.unidadFraccion}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            Stock: {Number(s.stockActual).toLocaleString("es-DO", { maximumFractionDigits: 2 })} {s.unidadMedida}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {busqueda.trim().length >= 2 && !buscando && sugerencias.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">No se encontró ningún producto con «{busqueda}»</p>
            )}
          </div>

          {/* Tabla / estado vacío */}
          {detalles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
              <ShoppingCart size={28} className="opacity-30" />
              <p className="text-sm">Escribe el código o nombre del producto para buscarlo</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="text-xs w-24">Código</TableHead>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-xs text-right w-28">Cantidad</TableHead>
                    <TableHead className="text-xs text-right w-36">Precio</TableHead>
                    <TableHead className="text-xs text-right w-20">Dscto %</TableHead>
                    <TableHead className="text-xs text-center w-28">ITBIS</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles.map((d, i) => {
                    const { precioBase } = calcItbisLinea(d.precio, d.cantidad, d.descuento, d.exentoItbis);
                    const sub = precioBase * d.cantidad * (1 - d.descuento / 100);
                    const cantOrig = d.modoFraccionar && d.factorFraccion ? d.cantidad / d.factorFraccion : d.cantidad;
                    const stockBajo = cantOrig > d.stockActual;
                    const alerta = nivelAlertaFila(d);
                    const costoEfectivo = (d.modoFraccionar && d.factorFraccion && d.factorFraccion > 0 && d.costoUltimo)
                      ? d.costoUltimo / d.factorFraccion : (d.costoUltimo ?? 0);

                    return (
                      <TableRow key={d.productoId + i} className="hover:bg-muted/10">
                        <TableCell className="font-mono text-xs text-muted-foreground">{d.codigo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {alerta === "negativo" && (
                              <span title={`Margen negativo (${calcMargen(d.precio, costoEfectivo, d.exentoItbis).toFixed(1)}%)`}
                                className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#dc2626" }} />
                            )}
                            {alerta === "bajo" && (
                              <span title={`Margen bajo (${calcMargen(d.precio, costoEfectivo, d.exentoItbis).toFixed(1)}%)`}
                                className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#d97706" }} />
                            )}
                            <span className="font-medium text-sm">{d.nombre}</span>
                            {stockBajo && <Badge variant="destructive" className="text-[10px]">Stock bajo</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{d.unidad}</span>
                            {d.esFraccionable && d.factorFraccion && (
                              <button type="button" onClick={() => toggleFraccionar(i)}
                                title={d.modoFraccionar ? `Vender por ${d.unidadOriginal}` : `Vender por ${d.unidadFraccion ?? "fracción"}`}
                                className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors font-medium",
                                  d.modoFraccionar ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-muted-foreground/30 hover:bg-accent")}>
                                <Scissors size={9} />
                                {d.modoFraccionar ? `por ${d.unidadFraccion}` : "Fraccionar"}
                              </button>
                            )}
                            {d.modoFraccionar && d.factorFraccion && (
                              <span className="text-[10px] text-primary">= {fmt(d.cantidad / d.factorFraccion)} {d.unidadOriginal}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Cantidad */}
                        <TableCell>
                          <input type="text" inputMode="decimal"
                            value={d.cantidad === 0 ? "" : String(d.cantidad)}
                            onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0) actualizarDetalle(i, "cantidad", v); else if (e.target.value === "") actualizarDetalle(i, "cantidad", 0); }}
                            className="w-24 h-8 rounded-lg border bg-background px-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </TableCell>

                        {/* Precio final (c/ITBIS) */}
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">RD$</span>
                            <input type="text" inputMode="decimal"
                              value={d.precio === 0 ? "" : String(d.precio)}
                              onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0) actualizarDetalle(i, "precio", v); else if (e.target.value === "") actualizarDetalle(i, "precio", 0); }}
                              className="w-32 h-8 rounded-lg border bg-background pl-7 pr-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                            {d.exentoItbis ? `base · por ${d.unidad}` : `c/ITBIS · por ${d.unidad}`}
                          </p>
                          {!d.exentoItbis && d.precio > 0 && (
                            <p className="text-[10px] text-muted-foreground text-right">
                              base {fmt(precioBase)} + {fmt(d.itbis / (d.cantidad || 1))} ITBIS
                            </p>
                          )}
                        </TableCell>

                        {/* Descuento */}
                        <TableCell>
                          <div className="relative">
                            <input type="text" inputMode="decimal" placeholder="0"
                              value={d.descuento === 0 ? "" : String(d.descuento)}
                              onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0 && v <= 100) actualizarDetalle(i, "descuento", v); else if (e.target.value === "") actualizarDetalle(i, "descuento", 0); }}
                              className="w-20 h-8 rounded-lg border bg-background px-2 pr-5 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                          </div>
                        </TableCell>

                        {/* ITBIS */}
                        <TableCell className="text-center">
                          {d.exentoItbis
                            ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">EXENTO</span>
                            : <span className="font-mono text-sm">RD$ {fmt(d.itbis)}</span>
                          }
                        </TableCell>

                        {/* Subtotal */}
                        <TableCell className="text-right font-medium whitespace-nowrap font-mono" style={{ color: ACCENT }}>
                          RD$ {fmt(sub)}
                        </TableCell>

                        {/* Quitar */}
                        <TableCell>
                          <button type="button" onClick={() => remover(i)}
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

          {/* Totales */}
          {detalles.length > 0 && (
            <div className="flex justify-end pt-2">
              <div className="rounded-xl border p-4 space-y-2 w-64" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">RD$ {fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ITBIS:</span>
                  <span className="font-mono">RD$ {fmt(totalItbis)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold font-mono text-base" style={{ color: ACCENT }}>RD$ {fmt(totalGeneral)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Barra de acción — derecha ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="h-9 px-5 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className={cn("h-9 px-6 rounded-lg text-sm font-bold text-white transition-all", loading && "opacity-60 pointer-events-none")}
          style={{ backgroundColor: ACCENT }}>
          {loading ? "Guardando…" : modoEdicion ? "Guardar cambios" : "Crear cotización"}
        </button>
      </div>
    </form>
  );
}
