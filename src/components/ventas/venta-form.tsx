"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { crearCotizacion, buscarProductosVenta, type VentaInput } from "@/actions/ventas";
import { cn } from "@/lib/utils";

// Types 

type Cliente = {
 id: string;
 nombre: string;
 rnc: string | null;
 credito: string;
 limiteCredito: unknown;
 reglaPrecio: string | null;
 margenPrecio: unknown;
 direcciones: { id: string; etiqueta: string; direccion: string }[];
};

type ProductoSugerido = {
 id: string;
 codigo: string;
 nombre: string;
 unidadMedida: string;
 precioVenta: unknown;
 costoUltimo: number | null;
 stockActual: unknown;
 esFraccionable: boolean;
 unidadFraccion: string | null;
 factorFraccion: unknown;
 exentoItbis: boolean;
};

/** Calcula el precio Kolmen: costo × 1.18 × (1 + margen) — o costo × (1+margen) si exento */
function calcPrecioKolmen(costo: number, margen: number, exento: boolean): number {
 if (exento) return +(costo * (1 + margen)).toFixed(4);
 return +(costo * 1.18 * (1 + margen)).toFixed(4);
}

interface VentaFormProps {
 clientes: Cliente[];
}

interface DetalleRow {
 productoId: string;
 nombre: string;
 codigo: string;
 unidad: string; // unidad actual de venta
 unidadOriginal: string; // unidad completa (UND, SACO, etc.)
 unidadFraccion: string | null; // PIE, LB, etc.
 cantidad: number;
 precio: number; // precioFinal (con ITBIS incluido) por unidad actual
 precioCompleto: number; // precioFinal original por UND completa
 descuento: number; // %
 itbis: number; // monto RD$ de ITBIS para toda la línea
 exentoItbis: boolean; // true = exento (como agregados); false = precio incluye ITBIS
 stockActual: number; // en unidades originales
 esFraccionable: boolean;
 factorFraccion: number | null; // ej. 19 pies/tubo
 modoFraccionar: boolean; // true = vender por fracciones
}

/** Calcula precioBase (sin ITBIS) e itbis a partir del precio final */
function calcItbisLinea(precioFinal: number, cantidad: number, descuento: number, exento: boolean) {
 const precioBase = exento ? precioFinal : precioFinal / 1.18;
 const sub = precioBase * cantidad * (1 - descuento / 100);
 const itbis = exento ? 0 : +(sub * 0.18).toFixed(2);
 return { precioBase: +precioBase.toFixed(4), itbis };
}

const fmt = (n: number) => n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CREDITO_LABEL: Record<string, string> = {
 CONTADO: "Contado",
 DIAS_30: "30 Días",
 DIAS_45: "45 Días",
 DIAS_60: "60 Días",
};

// Componente 

export function VentaForm({ clientes }: VentaFormProps) {
 const router = useRouter();
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);

 // Encabezado
 const [clienteId, setClienteId] = useState("");
 const [direccionId, setDireccionId] = useState("");
 const [credito, setCredito] = useState<"CONTADO" | "DIAS_30" | "DIAS_45" | "DIAS_60">("CONTADO");
 const [fechaEntrega, setFechaEntrega] = useState("");
 const [notas, setNotas] = useState("");

 // Productos
 const [detalles, setDetalles] = useState<DetalleRow[]>([]);
 const [busqueda, setBusqueda] = useState("");
 const [buscando, setBuscando] = useState(false);
 const [sugerencias, setSugerencias] = useState<ProductoSugerido[]>([]);
 const [mostrarSug, setMostrarSug] = useState(false);
 const busquedaRef = useRef<HTMLInputElement>(null);

 const cliente = clientes.find((c) => c.id === clienteId);
 const direcciones = cliente?.direcciones ?? [];

 // Al cambiar cliente: resetear dirección y auto-rellenar crédito
 useEffect(() => {
 setDireccionId("");
 if (cliente?.credito && cliente.credito !== "CONTADO") {
 setCredito(cliente.credito as "DIAS_30" | "DIAS_45" | "DIAS_60");
 } else {
 setCredito("CONTADO");
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [clienteId]);

 // Búsqueda con debounce
 useEffect(() => {
 if (busqueda.trim().length < 2) { setSugerencias([]); setMostrarSug(false); return; }
 const t = setTimeout(async () => {
 setBuscando(true);
 const res = await buscarProductosVenta(busqueda.trim());
 setSugerencias(res as ProductoSugerido[]);
 setMostrarSug(res.length > 0);
 setBuscando(false);
 }, 300);
 return () => clearTimeout(t);
 }, [busqueda]);

 // Agregar producto: siempre inicia en modo UND completa
 const agregarProducto = useCallback((prod: ProductoSugerido) => {
 setMostrarSug(false);
 setBusqueda("");
 setError(null);

 const factor = prod.factorFraccion ? Number(prod.factorFraccion) : null;
 const esExento = prod.exentoItbis ?? false;

 // Precio: Kolmen usa costo×1.18×(1+margen); resto usa precioVenta 
 const clienteSeleccionado = clientes.find(c => c.id === clienteId);
 const esKolmen = clienteSeleccionado?.reglaPrecio === "MARGEN_COSTO" && clienteSeleccionado.margenPrecio != null;
 let pventa = Number(prod.precioVenta);
 if (esKolmen && prod.costoUltimo != null && Number(prod.costoUltimo) > 0) {
 const margen = Number(clienteSeleccionado!.margenPrecio) / 100;
 pventa = calcPrecioKolmen(Number(prod.costoUltimo), margen, esExento);
 }

 const idx = detalles.findIndex((d) => d.productoId === prod.id);
 if (idx >= 0) {
 setDetalles((prev) => prev.map((d, i) => i === idx ? { ...d, cantidad: d.cantidad + 1 } : d)
 );
 return;
 }

 const { itbis: itbisInicial } = calcItbisLinea(pventa, 1, 0, esExento);
 setDetalles((prev) => [
 ...prev,
 {
 productoId: prod.id,
 nombre: prod.nombre,
 codigo: prod.codigo,
 unidad: prod.unidadMedida,
 unidadOriginal: prod.unidadMedida,
 unidadFraccion: prod.unidadFraccion ?? null,
 cantidad: 1,
 precio: pventa,
 precioCompleto: pventa,
 descuento: 0,
 itbis: itbisInicial,
 exentoItbis: esExento,
 stockActual: Number(prod.stockActual),
 esFraccionable: prod.esFraccionable,
 factorFraccion: factor,
 modoFraccionar: false,
 },
 ]);
 busquedaRef.current?.focus();
 }, [detalles, clienteId, clientes]);

 // Toggle fraccionamiento: cambia precioFinal, unidad y resetea cantidad a 1
 const toggleFraccionar = (i: number) => {
 setDetalles((prev) => prev.map((d, idx) => {
 if (idx !== i || !d.esFraccionable || !d.factorFraccion) return d;
 const nuevoModo = !d.modoFraccionar;
 const nuevoPrecio = nuevoModo
 ? +(d.precioCompleto / d.factorFraccion).toFixed(4)
 : d.precioCompleto;
 const nuevaUnidad = nuevoModo
 ? (d.unidadFraccion ?? d.unidadOriginal)
 : d.unidadOriginal;
 const { itbis } = calcItbisLinea(nuevoPrecio, 1, 0, d.exentoItbis);
 return {
 ...d,
 modoFraccionar: nuevoModo,
 precio: nuevoPrecio,
 unidad: nuevaUnidad,
 cantidad: 1,
 itbis,
 };
 })
 );
 };

 const actualizarDetalle = (i: number, campo: keyof DetalleRow, valor: number | string | boolean) => {
 setDetalles((prev) => prev.map((d, idx) => {
 if (idx !== i) return d;
 const updated = { ...d, [campo]: valor };
 // Recalcular ITBIS en cualquier cambio que afecte el monto
 const precio = campo === "precio" ? Number(valor) : d.precio;
 const cantidad = campo === "cantidad" ? Number(valor) : d.cantidad;
 const descuento = campo === "descuento" ? Number(valor) : d.descuento;
 const exento = campo === "exentoItbis" ? Boolean(valor) : d.exentoItbis;
 if (["precio", "cantidad", "descuento", "exentoItbis"].includes(campo)) {
 updated.itbis = calcItbisLinea(precio, cantidad, descuento, exento).itbis;
 }
 return updated;
 })
 );
 };

 const remover = (i: number) => setDetalles((prev) => prev.filter((_, idx) => idx !== i));

 // Totales — subtotal es la base SIN ITBIS; precio ingresado = precioFinal (ITBIS incluido)
 const subtotal = detalles.reduce((s, d) => {
 const { precioBase } = calcItbisLinea(d.precio, d.cantidad, d.descuento, d.exentoItbis);
 return s + precioBase * d.cantidad * (1 - d.descuento / 100);
 }, 0);
 const totalItbis = detalles.reduce((s, d) => s + d.itbis, 0);
 const totalGeneral = subtotal + totalItbis;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError(null);
 if (!clienteId) { setError("Selecciona un cliente"); return; }
 if (detalles.length === 0) { setError("Agrega al menos un producto"); return; }
 const invalidos = detalles.filter((d) => !d.cantidad || d.cantidad <= 0 || !d.precio || d.precio <= 0);
 if (invalidos.length > 0) { setError("Revisa las cantidades y precios — todos deben ser mayores a cero"); return; }

 setLoading(true);
 try {
 const result = await crearCotizacion({
 clienteId,
 direccionId: direccionId || undefined,
 credito,
 fechaEntrega: fechaEntrega || undefined,
 notas: notas || undefined,
 detalles: detalles.map((d) => {
 const { precioBase } = calcItbisLinea(d.precio, d.cantidad, d.descuento, d.exentoItbis);
 return {
 productoId: d.productoId,
 unidad: d.unidad,
 cantidad: d.cantidad,
 precio: precioBase,
 precioFinal: d.precio,
 exentoItbis: d.exentoItbis,
 descuento: d.descuento,
 itbis: d.itbis,
 };
 }),
 } as VentaInput);

 setLoading(false);
 if ("error" in result) { setError(String(result.error) || "Error al guardar la cotización"); return; }
 router.push(`/ventas/${result.id}`);
 } catch (err) {
 setLoading(false);
 setError(err instanceof Error ? err.message : "Error inesperado al guardar");
 }
 };

 return (
 <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-5xl"> {error && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"> {error}
 </div> )}

 {/* Encabezado */}
 <Card> <CardHeader><CardTitle className="text-base">Datos del cliente</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5 sm:col-span-2"> <div className="flex items-center justify-between"> <Label>Cliente *</Label> <a
 href="/contactos/nuevo?tipo=CLIENTE" target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs gap-1")}
 > + Crear cliente
 </a> </div> <Select value={clienteId} onValueChange={(v) => setClienteId((v ?? "") as string)}> <SelectTrigger> {/* Renderizamos el label explícitamente para evitar que Radix muestre el CUID */}
 <SelectValue placeholder="Seleccionar cliente..."> {clienteId
 ? (clientes.find((c) => c.id === clienteId)?.nombre ?? "")
 : null}
 </SelectValue> </SelectTrigger> <SelectContent> {clientes.map((c) => (
 <SelectItem key={c.id} value={c.id}> {c.nombre}{c.rnc ? ` — ${c.rnc}` : ""}
 </SelectItem> ))}
 </SelectContent> </Select> </div> {direcciones.length > 0 && (
 <div className="space-y-1.5"> <Label>Dirección de entrega</Label> <Select value={direccionId} onValueChange={(v) => setDireccionId((v ?? "") as string)}> <SelectTrigger> <SelectValue placeholder="Dirección (opcional)"> {direccionId
 ? (() => { const d = direcciones.find((d) => d.id === direccionId); return d ? `${d.etiqueta}: ${d.direccion}` : null; })()
 : null}
 </SelectValue> </SelectTrigger> <SelectContent> {direcciones.map((dir) => (
 <SelectItem key={dir.id} value={dir.id}> {dir.etiqueta}: {dir.direccion}
 </SelectItem> ))}
 </SelectContent> </Select> </div> )}

 <div className="space-y-1.5"> <Label>Condición de pago</Label> <Select value={credito} onValueChange={(v) => setCredito((v ?? "CONTADO") as typeof credito)}> <SelectTrigger> {/* Formato explícito: "45 Días" en vez del enum "DIAS_45" */}
 <SelectValue> {CREDITO_LABEL[credito] ?? credito}
 </SelectValue> </SelectTrigger> <SelectContent> <SelectItem value="CONTADO">Contado</SelectItem> <SelectItem value="DIAS_30">30 Días</SelectItem> <SelectItem value="DIAS_45">45 Días</SelectItem> <SelectItem value="DIAS_60">60 Días</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Fecha de entrega</Label> <Input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} /> </div> <div className="space-y-1.5 sm:col-span-2"> <Label>Notas</Label> <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /> </div> </CardContent> </Card> {/* Productos */}
 <Card> <CardHeader><CardTitle className="text-base">Productos</CardTitle></CardHeader> <CardContent className="space-y-4"> {/* Buscador con sugerencias */}
 <div className="relative max-w-lg"> <div className="flex gap-2"> <Input
 ref={busquedaRef}
 placeholder="Código, código de barras o nombre del producto..." value={busqueda}
 onChange={(e) => setBusqueda(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Escape") { setMostrarSug(false); setBusqueda(""); }
 }}
 onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
 autoComplete="off" /> {buscando && (
 <span className="self-center text-xs text-muted-foreground px-2">Buscando...</span> )}
 </div> {/* Dropdown de sugerencias */}
 {mostrarSug && sugerencias.length > 0 && (
 <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-72 overflow-y-auto"> {sugerencias.map((s) => {
 const factor = s.factorFraccion ? Number(s.factorFraccion) : null;
 return (
 <button
 key={s.id}
 type="button" onClick={() => agregarProducto(s)}
 className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0" > <div className="flex items-center justify-between gap-2"> <div> <span className="font-medium text-sm">{s.nombre}</span> {s.esFraccionable && s.unidadFraccion && (
 <Badge variant="secondary" className="ml-2 text-[10px]"> Fraccionable — {s.unidadFraccion}
 </Badge> )}
 <div className="text-xs text-muted-foreground mt-0.5"> {s.codigo}
 {s.esFraccionable && factor && (
 <> · {factor} {s.unidadFraccion} por {s.unidadMedida}</> )}
 </div> </div> <div className="text-right shrink-0"> <div className="text-xs font-semibold"> RD$ {fmt(Number(s.precioVenta))} /{s.unidadMedida}
 </div> {s.esFraccionable && factor && (
 <div className="text-[10px] text-primary"> RD$ {fmt(Number(s.precioVenta) / factor)} /{s.unidadFraccion}
 </div> )}
 <div className="text-[10px] text-muted-foreground"> Stock: {Number(s.stockActual).toLocaleString("es-DO", { maximumFractionDigits: 2 })} {s.unidadMedida}
 </div> </div> </div> </button> );
 })}
 </div> )}

 {busqueda.trim().length >= 2 && !buscando && sugerencias.length === 0 && (
 <p className="text-xs text-muted-foreground mt-1">No se encontró ningún producto con «{busqueda}»</p> )}
 </div> {/* Tabla de detalles */}
 {detalles.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground border rounded-lg"> <p className="text-sm">Escribe el código, código de barras o parte del nombre para buscar un producto</p> </div> ) : (
 <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow> <TableHead>Código</TableHead> <TableHead>Producto</TableHead> <TableHead className="text-right w-28">Cantidad</TableHead> <TableHead className="text-right w-32">Precio</TableHead> <TableHead className="text-right w-20">Dscto %</TableHead> <TableHead className="text-center w-20">ITBIS</TableHead> <TableHead className="text-right">Subtotal</TableHead> <TableHead className="w-8" /> </TableRow> </TableHeader> <TableBody> {detalles.map((d, i) => {
 const { precioBase } = calcItbisLinea(d.precio, d.cantidad, d.descuento, d.exentoItbis);
 const sub = precioBase * d.cantidad * (1 - d.descuento / 100);
 // Calcular equivalente en UND originales para avisar stock bajo
 const cantOrig = d.modoFraccionar && d.factorFraccion
 ? d.cantidad / d.factorFraccion
 : d.cantidad;
 const stockBajo = cantOrig > d.stockActual;

 return (
 <TableRow key={d.productoId + i}> <TableCell className="font-mono text-xs">{d.codigo}</TableCell> <TableCell> <div className="flex items-center gap-1.5 flex-wrap"> <span className="font-medium text-sm">{d.nombre}</span> {stockBajo && (
 <Badge variant="destructive" className="text-xs"> Stock bajo</Badge> )}
 </div> <div className="flex items-center gap-1.5 mt-0.5 flex-wrap"> <span className="text-xs text-muted-foreground">{d.unidad}</span> {/* Botón toggle fraccionamiento */}
 {d.esFraccionable && d.factorFraccion && (
 <button
 type="button" onClick={() => toggleFraccionar(i)}
 title={d.modoFraccionar
 ? `Cambiar a vender por ${d.unidadOriginal} completa` : `Cambiar a vender por ${d.unidadFraccion ?? "fracción"}`}
 className={cn(
 "text-[10px] px-1.5 py-0.5 rounded border transition-colors font-medium",
 d.modoFraccionar
 ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-muted-foreground/30 hover:bg-accent" )}
 > {d.modoFraccionar
 ? ` por ${d.unidadFraccion}` : `÷ Fraccionar`}
 </button> )}
 {d.modoFraccionar && d.factorFraccion && (
 <span className="text-[10px] text-primary"> = {fmt(d.cantidad / d.factorFraccion)} {d.unidadOriginal}
 </span> )}
 </div> </TableCell> {/* Cantidad — type text para evitar validación nativa */}
 <TableCell> <Input
 type="text" inputMode="decimal" value={d.cantidad === 0 ? "" : String(d.cantidad)}
 onChange={(e) => {
 const v = parseFloat(e.target.value.replace(",", "."));
 if (!isNaN(v) && v >= 0) actualizarDetalle(i, "cantidad", v);
 else if (e.target.value === "") actualizarDetalle(i, "cantidad", 0);
 }}
 className="text-right h-8 w-24" /> </TableCell> {/* Precio final (ITBIS incluido) */}
 <TableCell> <Input
 type="text" inputMode="decimal" value={d.precio === 0 ? "" : String(d.precio)}
 onChange={(e) => {
 const v = parseFloat(e.target.value.replace(",", "."));
 if (!isNaN(v) && v >= 0) actualizarDetalle(i, "precio", v);
 else if (e.target.value === "") actualizarDetalle(i, "precio", 0);
 }}
 className="text-right h-8 w-32" /> <p className="text-[10px] text-muted-foreground text-right mt-0.5"> {d.exentoItbis ? `base · por ${d.unidad}` : `c/ITBIS · por ${d.unidad}`}
 </p> {!d.exentoItbis && d.precio > 0 && (
 <p className="text-[10px] text-primary text-right"> base RD$ {fmt(precioBase)} + {fmt(d.itbis / (d.cantidad || 1))} ITBIS
 </p> )}
 </TableCell> {/* Descuento */}
 <TableCell> <Input
 type="text" inputMode="decimal" value={d.descuento === 0 ? "" : String(d.descuento)}
 placeholder="0" onChange={(e) => {
 const v = parseFloat(e.target.value.replace(",", "."));
 if (!isNaN(v) && v >= 0 && v <= 100) actualizarDetalle(i, "descuento", v);
 else if (e.target.value === "") actualizarDetalle(i, "descuento", 0);
 }}
 className="text-right h-8 w-20" /> </TableCell> {/* ITBIS — solo muestra el valor en RD$ */}
 <TableCell className="text-right tabular-nums"> {d.exentoItbis
 ? <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1">EXENTO</span> : <span className="font-mono text-sm">RD$ {fmt(d.itbis)}</span> }
 </TableCell> {/* Subtotal */}
 <TableCell className="text-right font-medium whitespace-nowrap"> RD$ {fmt(sub)}
 </TableCell> {/* Quitar */}
 <TableCell> <button
 type="button" onClick={() => remover(i)}
 className="text-destructive hover:text-destructive/80 text-sm px-1" > </button> </TableCell> </TableRow> );
 })}
 </TableBody> </Table> </div> )}

 {/* Totales */}
 {detalles.length > 0 && (
 <div className="flex justify-end"> <div className="space-y-1 text-sm min-w-56"> <div className="flex justify-between"> <span className="text-muted-foreground">Subtotal:</span> <span>RD$ {fmt(subtotal)}</span> </div> <div className="flex justify-between"> <span className="text-muted-foreground">ITBIS:</span> <span>RD$ {fmt(totalItbis)}</span> </div> <Separator /> <div className="flex justify-between font-bold text-base"> <span>Total:</span> <span>RD$ {fmt(totalGeneral)}</span> </div> </div> </div> )}
 </CardContent> </Card> <div className="flex items-center gap-3"> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants(), loading && "opacity-50 pointer-events-none")}
 > {loading ? "Guardando..." : "Crear cotización"}
 </button> <button type="button" onClick={() => router.back()} className={cn(buttonVariants({ variant: "outline" }))}> Cancelar
 </button> </div> </form> );
}
