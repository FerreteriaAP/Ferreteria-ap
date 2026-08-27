"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarProductosPDV,
  buscarClientesPDV,
  crearVentaPendiente,
  guardarDireccionEntrega,
} from "@/actions/pdv";
import { clearVendedorActivo } from "@/actions/vendedor-activo";
import type { LineaPDV } from "@/actions/pdv";
import { ClienteRapidoModal } from "./cliente-rapido-modal";
import type { ClienteRapidoResult } from "./cliente-rapido-modal";
import { cn } from "@/lib/utils";

// Tipos

interface Producto {
  id: string; codigo: string; nombre: string;
  precioVenta: number; unidadMedida: string;
  esFraccionable: boolean; unidadFraccion: string | null;
  factorFraccion: number | null; precioFraccion: number | null;
  exentoItbis: boolean; esServicio: boolean;
  stockActual: number; stockMinimo: number;
  costoUltimo: number;
  categoria: { nombre: string; codigo: string };
}

interface Cliente {
  id: string; nombre: string; rnc: string | null;
  tipoComprobante: string; telefono: string | null;
  direcciones: { id: string; etiqueta: string; direccion: string }[];
}

interface ItemCarrito extends LineaPDV {
  key: string;
  costoUltimo: number;
  categoriaCode: string;
  cantidadStr: string; // valor como string para el input (vacío = placeholder "0")
  esServicio: boolean;   // servicio = precio editable para todos los roles
}

// ─── MARGEN ───────────────────────────────────────────────────────────────────

// Categorías con umbral de 15% (CTC solo alerta en negativo)
const CATS_UMBRAL_15 = ["FT", "ET", "PL"];

/** Calcula % margen sobre costo. precioFinal viene CON ITBIS (o sin si exento). */
function calcMargen(precioFinal: number, costoUltimo: number, exentoItbis: boolean): number {
  if (costoUltimo <= 0) return 0;
  const costoRef = exentoItbis ? costoUltimo : costoUltimo * 1.18;
  return ((precioFinal - costoRef) / costoRef) * 100;
}

/** Retorna el nivel de alerta para un item del carrito. */
function nivelAlerta(item: ItemCarrito): "negativo" | "bajo" | null {
  const margen = calcMargen(item.precioFinal, item.costoUltimo, item.exentoItbis);
  if (margen < 0) return "negativo";
  const cat = item.categoriaCode.toUpperCase();
  if (CATS_UMBRAL_15.some(c => cat.startsWith(c)) && margen < 15) return "bajo";
  return null;
}

// Helpers

function fmt(n: number) {
  return `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcLinea(precioFinal: number, cantidad: number, exento: boolean) {
  const base = exento ? precioFinal : precioFinal / 1.18;
  const sub = +(base * cantidad).toFixed(2);
  const itbis = exento ? 0 : +(sub * 0.18).toFixed(2);
  const precio = +base.toFixed(4);
  return { precio, subtotal: sub, itbis };
}

let _keyCounter = 0;
const uid = () => String(++_keyCounter);

// Color de nombre por categoría — código para ET/CTC/FER, nombre para Plomería
function getCategoryColor(codigo: string, nombre: string): string {
  const c = codigo.toUpperCase();
  const n = nombre.toLowerCase();
  if (c.startsWith("ET"))                          return "#d4b800"; // amarillo — Electricidad
  if (c.startsWith("CTC"))                         return "#e07070"; // rojo pálido — Construcción
  if (n.includes("plom"))                          return "#1d73c9"; // azul metálico — Plomería
  if (c.startsWith("FER") || c.startsWith("AP"))   return "var(--accent-hex)"; // naranja — Ferretería
  return "var(--foreground)";
}

// Fondo uniforme para todos los cards — gris oscuro parejo, un poco más claro que el fondo de la página
const CARD_BG = "color-mix(in oklch, var(--foreground) 9%, var(--card))";

// Color del stock
function getStockColor(stockActual: number, stockMinimo: number): string {
  if (stockActual <= 0) return "#dc2626";
  if (stockMinimo > 0 && stockActual <= stockMinimo) return "#ca8a04";
  return "#16a34a";
}

// Props

interface Props {
  turnoId?: string;
  consumidorFinal: { id: string; nombre: string };
  topProductos: Producto[];
  puedeEditarPrecio: boolean;
}

// Componente

export function PDVTerminal({ turnoId, consumidorFinal, topProductos, puedeEditarPrecio }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [queryProd, setQueryProd] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productosVisibles = queryProd.trim() ? resultados : topProductos;

  const [cliente, setCliente] = useState<Cliente>({
    ...consumidorFinal, rnc: null, tipoComprobante: "B02", telefono: null, direcciones: [],
  });
  const [tipoNcf, setTipoNcf] = useState<"B01" | "B02" | "B14" | "B15">("B02");
  const [queryCliente, setQueryCliente] = useState("");
  const [sugsCliente, setSugsCliente] = useState<Cliente[]>([]);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [direccionId, setDireccionId] = useState<string | undefined>();
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [showAgregarDir, setShowAgregarDir] = useState(false);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);

  const subtotal   = carrito.reduce((s, i) => s + i.subtotal, 0);
  const itbisTotal = carrito.reduce((s, i) => s + i.itbis, 0);
  const total      = subtotal + itbisTotal;

  // Búsqueda de productos con debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!queryProd.trim()) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    timerRef.current = setTimeout(async () => {
      if (queryProd.trim().length < 2) { setResultados([]); setBuscando(false); return; }
      const r = await buscarProductosPDV(queryProd);
      setResultados(r.map(p => ({
        ...p,
        precioVenta:    Number(p.precioVenta),
        factorFraccion: p.factorFraccion  ? Number(p.factorFraccion)  : null,
        precioFraccion: p.precioFraccion  ? Number(p.precioFraccion)  : null,
        stockActual:    Number(p.stockActual),
        stockMinimo:    Number(p.stockMinimo),
        costoUltimo:    Number(p.costoUltimo),
      })));
      setBuscando(false);
    }, 350);
  }, [queryProd]);

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (!queryCliente.trim()) { setSugsCliente([]); return; }
    const t = setTimeout(async () => {
      const r = await buscarClientesPDV(queryCliente);
      setSugsCliente(r.map(c => ({
        ...c,
        tipoComprobante: String(c.tipoComprobante),
        telefono: c.telefono ?? null,
        direcciones: c.direcciones.map(d => ({ id: d.id, etiqueta: d.etiqueta, direccion: d.direccion })),
      })));
    }, 200);
    return () => clearTimeout(t);
  }, [queryCliente]);

  // Agregar producto
  const agregarProducto = useCallback((p: Producto, fraccionado = false) => {
    setQueryProd(""); setResultados([]);
    searchRef.current?.focus();

    const factor     = Number(p.factorFraccion ?? 1);
    const unidad     = fraccionado && p.unidadFraccion ? p.unidadFraccion : p.unidadMedida;
    // Si el producto tiene precio de fracción configurado, usarlo; si no, auto-calcular
    const precioFinal = fraccionado && factor > 0
      ? (p.precioFraccion != null ? Number(p.precioFraccion) : p.precioVenta / factor)
      : p.precioVenta;

    const idx = carrito.findIndex(i => i.productoId === p.id && i.unidad === unidad);
    if (idx >= 0) {
      setCarrito(prev => prev.map((item, i) => {
        if (i !== idx) return item;
        const nuevaCant = item.cantidad + 1;
        const { precio, subtotal, itbis } = calcLinea(item.precioFinal, nuevaCant, item.exentoItbis);
        return { ...item, cantidad: nuevaCant, cantidadStr: String(nuevaCant), precio, subtotal, itbis };
      }));
      return;
    }

    const { precio, subtotal, itbis } = calcLinea(precioFinal, 0, p.exentoItbis);
    // Costo fraccionado: dividir entre factor para comparar con el precio de la fracción
    const costoUltimo = fraccionado && factor > 0 ? p.costoUltimo / factor : p.costoUltimo;
    setCarrito(prev => [...prev, {
      key: uid(), productoId: p.id, nombre: p.nombre, codigo: p.codigo,
      unidad, cantidad: 0, cantidadStr: "", precioFinal, precio, exentoItbis: p.exentoItbis,
      itbis, subtotal,
      costoUltimo,
      categoriaCode: p.categoria.codigo,
      esServicio: p.esServicio,
    }]);
  }, [carrito]);

  const updateCantidad = useCallback((key: string, cantidadStr: string) => {
    const cantidad = parseFloat(cantidadStr) || 0;
    setCarrito(prev => prev.map(item => {
      if (item.key !== key) return item;
      const { precio, subtotal, itbis } = calcLinea(item.precioFinal, cantidad, item.exentoItbis);
      return { ...item, cantidad, cantidadStr, precio, subtotal, itbis };
    }));
  }, []);

  const updatePrecio = useCallback((key: string, precioFinal: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.key !== key) return item;
      const { precio, subtotal, itbis } = calcLinea(precioFinal, item.cantidad, item.exentoItbis);
      return { ...item, precioFinal, precio, subtotal, itbis };
    }));
  }, []);

  const quitarItem = (key: string) => setCarrito(prev => prev.filter(i => i.key !== key));

  const seleccionarCliente = (c: Cliente) => {
    setCliente(c);
    setTipoNcf(c.tipoComprobante === "B01" ? "B01" : c.tipoComprobante === "B14" ? "B14" : c.tipoComprobante === "B15" ? "B15" : "B02");
    setDireccionId(c.direcciones[0]?.id);
    setShowClienteSearch(false);
    setQueryCliente(""); setSugsCliente([]);
  };

  const agregarDireccion = async () => {
    if (!nuevaDireccion.trim()) return;
    const res = await guardarDireccionEntrega(cliente.id, { direccion: nuevaDireccion });
    if ("error" in res) { setError(res.error ?? "Error"); return; }
    const dir = { id: res.direccion!.id, etiqueta: res.direccion!.etiqueta, direccion: res.direccion!.direccion };
    setCliente(prev => ({ ...prev, direcciones: [...prev.direcciones, dir] }));
    setDireccionId(dir.id);
    setNuevaDireccion(""); setShowAgregarDir(false);
  };

  const enviarACaja = () => {
    setError(null);
    if (!carrito.length) { setError("Agrega al menos un producto"); return; }
    const lineas = carrito.filter(i => i.cantidad > 0);
    if (!lineas.length) { setError("Ingresa la cantidad de cada producto antes de enviar"); return; }

    // Advertencia de margen para el cajero antes de enviar
    const itemsNegativos = lineas.filter(i => nivelAlerta(i) === "negativo");
    if (itemsNegativos.length > 0) {
      const nombres = itemsNegativos.map(i => i.nombre).join(", ");
      const confirmar = window.confirm(
        `⚠ MARGEN NEGATIVO\n\nLos siguientes productos se están vendiendo por debajo del costo:\n\n${nombres}\n\n¿Deseas continuar?`
      );
      if (!confirmar) return;
    }

    startTransition(async () => {
      // Anotar en notas si hay márgenes bajos (para que el admin lo vea)
      const itemsBajos = lineas.filter(i => nivelAlerta(i) !== null);
      const notaAlerta = itemsBajos.length > 0
        ? `[ALERTA MARGEN: ${itemsBajos.map(i => `${i.codigo}(${calcMargen(i.precioFinal, i.costoUltimo, i.exentoItbis).toFixed(1)}%)`).join(", ")}]`
        : undefined;
      const notaFinal = [notas.trim(), notaAlerta].filter(Boolean).join(" | ") || undefined;

      const res = await crearVentaPendiente({ clienteId: cliente.id, turnoId, tipoNcf, lineas, direccionId, notas: notaFinal });
      if ("error" in res && res.error) { setError(res.error); return; }
      setEnviado(res.numero ?? null);
    });
  };

  const continuar = () => {
    startTransition(async () => {
      await clearVendedorActivo();
      // Recarga completa para que el server component re-lea la cookie borrada
      window.location.href = "/pdv";
    });
  };

  // Pantalla de confirmación
  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center ring-4 ring-green-200 dark:ring-green-900 animate-[pulse_1s_ease-out_1]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 tracking-tight">¡Enviado a caja!</p>
          <p className="text-sm text-muted-foreground">El cajero ya puede ver esta venta para procesar el pago</p>
        </div>
        <div className="w-full max-w-xs rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-5 space-y-3 text-left shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">Ticket</span>
            <span className="font-mono font-bold text-lg text-green-800 dark:text-green-300">{enviado}</span>
          </div>
          <div className="border-t border-green-200 dark:border-green-800 pt-3 space-y-1">
            <p className="font-semibold text-sm">{cliente.nombre}</p>
            <p className="text-sm text-muted-foreground">{carrito.length} artículo{carrito.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="border-t border-green-200 dark:border-green-800 pt-3">
            <p className="text-xs text-muted-foreground mb-0.5">Total a cobrar</p>
            <p className="text-3xl font-extrabold font-mono text-green-700 dark:text-green-300 tabular-nums">{fmt(total)}</p>
          </div>
        </div>
        <button
          onClick={continuar}
          disabled={isPending}
          className="mt-1 px-8 py-3 rounded-lg text-base font-bold active:scale-95 transition-all disabled:opacity-60"
          style={{ color: "#16a34a", border: "2px solid #16a34a", backgroundColor: "transparent" }}
        >
          {isPending ? "Cargando…" : "Continuar"}
        </button>
      </div>
    );
  }

  // Layout principal — h-full para llenar el espacio que le da la página
  return (
    <>
      {showClienteModal && (
        <ClienteRapidoModal
          onClose={() => setShowClienteModal(false)}
          onCreado={(c: ClienteRapidoResult) => { seleccionarCliente(c); setShowClienteModal(false); }}
        />
      )}

      <div className="flex h-full overflow-hidden">

        {/* PANEL IZQUIERDO — Catálogo */}
        <div className="flex flex-col w-[55%] min-w-0 border-r overflow-hidden">

          {/* Buscador */}
          <div className="px-3 py-2.5 border-b shrink-0" style={{ backgroundColor: "var(--card)" }}>
            <div className="relative">
              <input
                ref={searchRef}
                type="text" autoFocus
                value={queryProd}
                onChange={e => setQueryProd(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") { setQueryProd(""); setResultados([]); }
                  if (e.key === "Enter" && resultados.length === 1) agregarProducto(resultados[0]);
                }}
                placeholder="Código, barras o nombre del producto..."
                className="w-full h-10 rounded-lg border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {buscando && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">buscando…</span>
              )}
              {queryProd && !buscando && (
                <button
                  onClick={() => { setQueryProd(""); setResultados([]); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                >×</button>
              )}
            </div>
            {queryProd && resultados.length === 0 && !buscando && (
              <p className="text-xs text-muted-foreground mt-1.5 px-1">Sin resultados para «{queryProd}»</p>
            )}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-2.5">
            {productosVisibles.length === 0 && !queryProd && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                <p>No hay productos disponibles</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {productosVisibles.map((p) => {
                const stockColor = getStockColor(p.stockActual, p.stockMinimo);
                const nameColor  = getCategoryColor(p.categoria.codigo, p.categoria.nombre);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl overflow-hidden group transition-all"
                    style={{ backgroundColor: CARD_BG, border: "1px solid var(--border)" }}
                  >
                    {/* Botón principal */}
                    <button
                      onClick={() => agregarProducto(p)}
                      className="w-full p-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <p
                        className="text-xs font-bold leading-tight line-clamp-2 min-h-[2rem]"
                        style={{ color: nameColor }}
                      >
                        {p.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{p.codigo}</p>
                      <p className="text-sm font-bold mt-1.5 font-mono text-foreground">
                        {fmt(p.precioVenta)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">/{p.unidadMedida}</p>
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: stockColor }}>
                        Stock: {Number(p.stockActual).toFixed(1)}
                      </p>
                    </button>

                    {/* Botón fraccionado */}
                    {p.esFraccionable && p.factorFraccion && p.unidadFraccion && (
                      <button
                        onClick={() => agregarProducto(p, true)}
                        className="w-full border-t px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        Por {p.unidadFraccion} · {fmt(
                          p.precioFraccion != null
                            ? Number(p.precioFraccion)
                            : p.precioVenta / Number(p.factorFraccion)
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {!queryProd && productosVisibles.length > 0 && (
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Los {productosVisibles.length} productos más vendidos · Usa el buscador para ver más
              </p>
            )}
          </div>
        </div>

        {/* PANEL DERECHO — Carrito + cliente */}
        <div className="flex flex-col w-[45%] shrink-0 overflow-hidden" style={{ backgroundColor: "var(--card)" }}>

          {/* Sección cliente */}
          <div className="border-b p-3 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => { setShowClienteSearch(!showClienteSearch); setShowAgregarDir(false); }}
                  className="w-full flex items-center gap-2 h-9 px-3 rounded-lg border bg-background text-sm hover:bg-accent transition-colors text-left"
                >
                  <span className="flex-1 truncate font-medium">{cliente.nombre}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0",
                    tipoNcf === "B01" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" :
                    tipoNcf === "B14" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700" :
                    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  )}>{tipoNcf}</span>
                </button>

                {showClienteSearch && (
                  <div className="absolute left-0 top-full mt-1 w-80 border rounded-xl shadow-2xl z-50 p-3 space-y-2" style={{ backgroundColor: "var(--popover)", borderColor: "var(--border)" }}>
                    <button
                      onClick={() => seleccionarCliente({ ...consumidorFinal, rnc: null, tipoComprobante: "B02", telefono: null, direcciones: [] })}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-accent transition-colors font-medium"
                    >Consumidor Final</button>
                    <div className="border-t pt-2">
                      <input
                        type="text" autoFocus
                        value={queryCliente}
                        onChange={e => setQueryCliente(e.target.value)}
                        placeholder="Buscar por nombre, RNC o teléfono..."
                        className="w-full h-8 rounded-lg border bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    {sugsCliente.map(c => (
                      <button key={c.id} onClick={() => seleccionarCliente(c)}
                        className="w-full text-left px-2.5 py-2 text-xs hover:bg-accent rounded-lg transition-colors">
                        <p className="font-semibold">{c.nombre}</p>
                        {c.rnc && <p className="text-muted-foreground">{c.rnc}</p>}
                        {c.telefono && <p className="text-muted-foreground">{c.telefono}</p>}
                      </button>
                    ))}
                    <button
                      onClick={() => { setShowClienteSearch(false); setShowClienteModal(true); }}
                      className="w-full text-left px-2.5 py-2 text-xs text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium border border-dashed border-primary/30"
                    >Crear cliente nuevo</button>
                  </div>
                )}
              </div>

              <select
                value={tipoNcf}
                onChange={e => setTipoNcf(e.target.value as typeof tipoNcf)}
                className="h-9 rounded-lg border bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
              >
                <option value="B02">B02</option>
                <option value="B01">B01</option>
                <option value="B14">B14</option>
                <option value="B15">B15</option>
              </select>
            </div>

            {cliente.id !== consumidorFinal.id && cliente.direcciones.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={direccionId ?? ""}
                  onChange={e => setDireccionId(e.target.value || undefined)}
                  className="flex-1 h-8 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin dirección de entrega</option>
                  {cliente.direcciones.map(d => (
                    <option key={d.id} value={d.id}>{d.etiqueta} — {d.direccion}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAgregarDir(!showAgregarDir)}
                  className="h-8 px-2 rounded-lg border text-xs hover:bg-accent transition-colors shrink-0"
                >+Dir</button>
              </div>
            )}

            {cliente.id !== consumidorFinal.id && cliente.direcciones.length === 0 && (
              <button onClick={() => setShowAgregarDir(!showAgregarDir)} className="text-xs text-primary hover:underline">
                + Agregar dirección de entrega
              </button>
            )}

            {showAgregarDir && (
              <div className="flex gap-2">
                <input
                  type="text" autoFocus value={nuevaDireccion}
                  onChange={e => setNuevaDireccion(e.target.value)}
                  placeholder="Dirección completa..."
                  className="flex-1 h-8 rounded-lg border bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={e => { if (e.key === "Enter") agregarDireccion(); if (e.key === "Escape") setShowAgregarDir(false); }}
                />
                <button onClick={agregarDireccion} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Carrito — flex-1 con overflow interno */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <p className="text-sm">Toca un producto para agregarlo</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] text-muted-foreground uppercase tracking-wide" style={{ backgroundColor: "color-mix(in oklch, var(--border) 30%, transparent)" }}>
                    <th className="text-left px-3 py-2">Producto</th>
                    <th className="text-center px-1 py-2 w-20">Cant.</th>
                    <th className="text-right px-2 py-2 w-24">Precio</th>
                    <th className="text-right px-3 py-2 w-24">Total</th>
                    <th className="w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map(item => {
                    const alerta = nivelAlerta(item);
                    const margenPct = calcMargen(item.precioFinal, item.costoUltimo, item.exentoItbis);
                    return (
                    <tr key={item.key} className="border-b hover:bg-muted/20 transition-colors" style={{ borderColor: "color-mix(in oklch, var(--border) 35%, transparent)" }}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {alerta === "negativo" && (
                            <span title={`Margen negativo (${margenPct.toFixed(1)}%)`}
                              className="shrink-0 w-2 h-2 rounded-full bg-red-500" />
                          )}
                          {alerta === "bajo" && (
                            <span title={`Margen bajo: ${margenPct.toFixed(1)}% (mínimo 15%)`}
                              className="shrink-0 w-2 h-2 rounded-full bg-amber-400" />
                          )}
                          <p className="font-medium text-xs leading-tight">{item.nombre}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{item.codigo} · {item.unidad}{item.exentoItbis ? " · exento" : ""}</p>
                      </td>
                      <td className="px-1 py-2">
                        <input
                          type="number" min="0" step="0.001"
                          value={item.cantidadStr}
                          placeholder="0"
                          onChange={e => updateCantidad(item.key, e.target.value)}
                          className={cn(
                            "w-full text-center h-7 rounded border bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60",
                            item.cantidad === 0 && "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/20"
                          )}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {(puedeEditarPrecio || item.esServicio) ? (
                          <input
                            type="number" min="0" step="0.01" value={item.precioFinal || ""}
                            placeholder={item.esServicio ? "0.00" : undefined}
                            onChange={e => updatePrecio(item.key, parseFloat(e.target.value) || 0)}
                            onFocus={e => e.target.select()}
                            className={cn(
                              "w-full text-right h-7 rounded border bg-background px-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary",
                              item.esServicio && item.precioFinal === 0 && "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                            )}
                          />
                        ) : (
                          <span className="text-xs font-mono block text-right">{item.precioFinal.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                        {(item.subtotal + item.itbis).toFixed(2)}
                      </td>
                      <td className="px-1">
                        <button
                          onClick={() => quitarItem(item.key)}
                          className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center text-sm"
                        >×</button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            )}
          </div>

          {/* Totales + Botones — siempre visibles al fondo */}
          <div className="shrink-0 border-t" style={{ backgroundColor: "var(--card)" }}>
            {carrito.length > 0 && (
              <>
                <div className="px-3 py-2 space-y-0.5 text-xs" style={{ borderBottom: "1px solid color-mix(in oklch, var(--border) 40%, transparent)" }}>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal (sin ITBIS)</span>
                    <span className="font-mono">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>ITBIS 18%</span>
                    <span className="font-mono">{fmt(itbisTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span>TOTAL</span>
                    <span className="font-mono" style={{ color: "var(--accent-hex)" }}>{fmt(total)}</span>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <input
                    type="text" value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Notas (opcional)..."
                    className="w-full h-8 rounded-lg border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="mx-3 mb-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Botón enviar — verde, grande, siempre visible */}
            <div className="px-3 pb-3 space-y-2">
              <button
                onClick={enviarACaja}
                disabled={isPending || !carrito.length}
                className="w-full h-14 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                style={
                  carrito.length && !isPending
                    ? { backgroundColor: "#16a34a", color: "#fff", boxShadow: "0 4px 16px #16a34a44" }
                    : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }
                }
              >
                {isPending
                  ? "Enviando…"
                  : carrito.length > 0
                  ? `Enviar a caja · ${fmt(total)}`
                  : "Enviar a caja"}
              </button>

              {carrito.length > 0 && (
                <button
                  onClick={() => { setCarrito([]); setError(null); }}
                  className="w-full h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                >
                  Vaciar carrito
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
