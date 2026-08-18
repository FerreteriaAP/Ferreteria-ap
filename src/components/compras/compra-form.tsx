"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearCompra, type CompraInput } from "@/actions/compras";
import { getProductoPorCodigo, buscarProductosPorKeyword, siguienteCodigoPorCategoria, crearProducto } from "@/actions/productos";
import { cn } from "@/lib/utils";

// Schemas 

const DetalleSchema = z.object({
 productoId: z.string().min(1),
 nombre: z.string(),
 codigo: z.string(),
 unidad: z.string(),
 cantidad: z.coerce.number().positive("Cantidad > 0"),
 costo: z.coerce.number().min(0),
 costoAnterior: z.coerce.number().optional(),
 itbisPct: z.coerce.number().default(0),
});

const FormSchema = z.object({
 suplidorId: z.string().min(1, "Suplidor requerido"),
 noFacturaSuplidor: z.string().optional(),
 ncf: z.string().optional(),
 tipoNcfCompra: z.string().optional(),
 ncfCodigoSeguridad: z.string().optional(),
 fechaFactura: z.string().min(1, "Fecha requerida"),
 fechaVencimiento: z.string().optional(),
 notas: z.string().optional(),
 detalles: z.array(DetalleSchema).min(1, "Agrega al menos un producto"),
});

type FormValues = z.infer<typeof FormSchema>;

// Schema nuevo producto 

const NuevoProductoSchema = z.object({
 nombre: z.string().min(2, "Mínimo 2 caracteres"),
 categoriaId: z.string().min(1, "Categoría requerida"),
 codigo: z.string().min(1, "Código requerido"),
 unidadMedida: z.string().min(1, "Unidad requerida"),
 costoUltimo: z.coerce.number().min(0, "Costo inválido"),
 porcentajeGanancia: z.coerce.number().min(0).default(30),
 precioVenta: z.coerce.number().min(0, "Precio requerido"),
 stockMinimo: z.coerce.number().min(0).default(0),
 codigoBarras: z.string().optional(),
});

type NuevoProductoValues = z.infer<typeof NuevoProductoSchema>;

// Constantes 

const TIPOS_NCF = [
 { value: "B01", label: "B01 — Crédito Fiscal" },
 { value: "B11", label: "B11 — Proveedores Informales" },
 { value: "B14", label: "B14 — Regímenes Especiales" },
 { value: "B15", label: "B15 — Gubernamentales" },
 { value: "E31", label: "E31 — Electrónico Proveedor" },
];

const UNIDADES = ["UND", "PIE", "M", "M2", "M3", "KG", "LB", "GLL", "FND", "CJA", "RLL", "PLG", "TN"];
const DRAFT_KEY = "ferreteria-compra-draft-v2";
const hoy = new Date().toISOString().split("T")[0];

// Tipos 

type Suplidor = { id: string; nombre: string; rnc: string | null };
type Categoria = { id: string; codigo: string; nombre: string };

interface CompraFormProps {
 suplidores: Suplidor[];
 categorias: Categoria[];
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

type ProductoSimilar = {
 id: string; nombre: string; codigo: string;
 costoUltimo: number; stockActual: number;
 precioVenta: number; porcentajeGanancia: number;
};

// Componente principal 

export function CompraForm({ suplidores, categorias }: CompraFormProps) {
 const router = useRouter();
 const [serverError, setServerError] = useState<string | null>(null);

 // Búsqueda
 const [busqueda, setBusqueda] = useState("");
 const [buscando, setBuscando] = useState(false);
 const [sugerencias, setSugerencias] = useState<ProductoSimilar[]>([]);
 const [mostrarSug, setMostrarSug] = useState(false);
 const [ultimaBusqueda, setUltimaBusqueda] = useState("");
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 // Alertas de precio
 const [alertaPrecios, setAlertaPrecios] = useState<AlertaPrecio[]>([]);
 const preciosRef = useRef<Record<string, { precioVenta: number; porcentajeGanancia: number }>>({});

 // Modal nuevo producto
 const [modalAbierto, setModalAbierto] = useState(false);
 const [nombreInicial, setNombreInicial] = useState("");
 const [costoInicial, setCostoInicial] = useState(0);

 // Borrador
 const [draftDisponible, setDraftDisponible] = useState(false);

 // Formulario
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const form = useForm<FormValues>({
 resolver: zodResolver(FormSchema) as any,
 defaultValues: { suplidorId: "", fechaFactura: hoy, detalles: [] },
 });

 const { fields: detalles, append, remove, update } = useFieldArray({
 control: form.control,
 name: "detalles",
 });

 const watchedDetalles = form.watch("detalles") ?? [];
 const watchedSuplidor = form.watch("suplidorId");
 const watchedTipoNcf = form.watch("tipoNcfCompra");

 // Detectar borrador al montar
 useEffect(() => {
 try {
 const saved = localStorage.getItem(DRAFT_KEY);
 if (saved) {
 const parsed = JSON.parse(saved);
 if (parsed?.detalles?.length > 0 || parsed?.suplidorId) setDraftDisponible(true);
 }
 } catch { /* ignorar */ }
 }, []);

 // Auto-guardar borrador cada 2 s
 const allValues = form.watch();
 useEffect(() => {
 const t = setTimeout(() => {
 try {
 const v = form.getValues();
 if (v.detalles.length > 0 || !!v.suplidorId || !!v.noFacturaSuplidor) {
 localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
 }
 } catch { /* ignorar */ }
 }, 2000);
 return () => clearTimeout(t);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [JSON.stringify(allValues)]);

 const restaurarBorrador = () => {
 try {
 const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
 form.reset({ ...draft, fechaFactura: draft.fechaFactura ?? hoy });
 setDraftDisponible(false);
 } catch { /* ignorar */ }
 };

 const descartarBorrador = () => {
 try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignorar */ }
 setDraftDisponible(false);
 };

 // Agregar producto a la tabla
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const agregarProducto = useCallback((prod: any) => {
 const idx = detalles.findIndex((d) => d.productoId === prod.id);
 if (idx >= 0) {
 update(idx, { ...detalles[idx], cantidad: detalles[idx].cantidad + 1 });
 } else {
 preciosRef.current[prod.id] = {
 precioVenta: Number(prod.precioVenta ?? 0),
 porcentajeGanancia: Number(prod.porcentajeGanancia ?? 30),
 };
 append({
 productoId: prod.id,
 nombre: prod.nombre,
 codigo: prod.codigo,
 unidad: prod.unidadMedida,
 cantidad: 1,
 costo: Number(prod.costoUltimo),
 costoAnterior: Number(prod.costoUltimo),
 itbisPct: 0,
 });
 }
 setBusqueda("");
 setSugerencias([]);
 setMostrarSug(false);
 setUltimaBusqueda("");
 }, [detalles, append, update]);

 // Búsqueda de productos
 const ejecutarBusqueda = useCallback(async () => {
 if (!busqueda.trim()) return;
 setBuscando(true);
 setUltimaBusqueda(busqueda.trim());
 setSugerencias([]);
 setMostrarSug(false);
 try {
 const prod = await getProductoPorCodigo(busqueda.trim());
 if (prod) { agregarProducto(prod); return; }
 const res = await buscarProductosPorKeyword(busqueda.trim());
 if (res.length === 1) { agregarProducto(res[0]); }
 else if (res.length > 1) { setSugerencias(res as ProductoSimilar[]); setMostrarSug(true); }
 } finally {
 setBuscando(false);
 }
 }, [busqueda, agregarProducto]);

 const handleBusquedaChange = (v: string) => {
 setBusqueda(v);
 setMostrarSug(false);
 setUltimaBusqueda("");
 if (debounceRef.current) clearTimeout(debounceRef.current);
 if (v.trim().length < 2) { setSugerencias([]); return; }
 debounceRef.current = setTimeout(async () => {
 const res = await buscarProductosPorKeyword(v.trim());
 setSugerencias(res as ProductoSimilar[]);
 setMostrarSug(res.length > 0);
 }, 300);
 };

 // Alerta de cambio de precio
 const checkAlertaPrecio = (index: number, nuevoCosto: number) => {
 const detalle = detalles[index];
 if (!detalle) return;
 const costoAnterior = detalle.costoAnterior ?? detalle.costo;
 const precios = preciosRef.current[detalle.productoId];
 const pvActual = precios?.precioVenta ?? 0;

 if (costoAnterior > 0 && Math.abs((nuevoCosto - costoAnterior) / costoAnterior) > 0.05) {
 const ratio = pvActual > 0 ? pvActual / costoAnterior : 1;
 const sugerido = Math.round(nuevoCosto * ratio * 100) / 100;
 setAlertaPrecios((prev) => [
 ...prev.filter((a) => a.productoId !== detalle.productoId),
 { productoId: detalle.productoId, nombre: detalle.nombre, costoAnterior, nuevoCosto, precioVentaActual: pvActual, nuevoPrecioVenta: sugerido, aplicar: true },
 ]);
 } else {
 setAlertaPrecios((prev) => prev.filter((a) => a.productoId !== detalle.productoId));
 }
 };

 // Totales
 const subtotal = watchedDetalles.reduce((s, d) => s + (Number(d.cantidad)||0) * (Number(d.costo)||0), 0);
 const totalItbis = watchedDetalles.reduce((s, d) => {
 const sub = (Number(d.cantidad)||0) * (Number(d.costo)||0);
 return s + sub * ((Number(d.itbisPct)||0) / 100);
 }, 0);
 const total = subtotal + totalItbis;

 // Submit
 const onSubmit: SubmitHandler<FormValues> = async (values) => {
 setServerError(null);
 try {
 const ajustesPrecio = alertaPrecios
 .filter((a) => a.aplicar && a.nuevoPrecioVenta > 0)
 .map((a) => ({ productoId: a.productoId, nuevoPrecioVenta: a.nuevoPrecioVenta }));

 const detallesTransformados = values.detalles.map((d) => ({
 productoId: d.productoId,
 cantidad: d.cantidad,
 costo: d.costo,
 itbis: (d.cantidad * d.costo) * ((d.itbisPct || 0) / 100),
 }));

 const result = await crearCompra({
 ...values,
 detalles: detallesTransformados,
 ajustesPrecio,
 } as CompraInput);

 if ("error" in result && result.error) {
 const errs = result.error as Record<string, string[]>;
 setServerError(Object.values(errs).flat()[0] ?? "Error al guardar");
 return;
 }
 const id = "id" in result ? result.id : "";
 if (!id) { setServerError("La compra se guardó pero no se recibió el ID."); return; }
 try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignorar */ }
 router.push(`/compras/${id}`);
 } catch (e) {
 console.error("[CompraForm]", e);
 setServerError("Error inesperado al guardar. Revisa la consola del navegador.");
 }
 };

 const onValidationError = (errs: Record<string, unknown>) => {
 const labels: Record<string, string> = {
 suplidorId: "Suplidor",
 fechaFactura: "Fecha de factura",
 detalles: "Productos (agrega al menos uno)",
 };
 const firstKey = Object.keys(errs)[0];
 const label = labels[firstKey] ?? firstKey;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const msg = (errs[firstKey] as any)?.message ?? "campo requerido";
 setServerError(`${label}: ${msg}`);
 window.scrollTo({ top: 0, behavior: "smooth" });
 };

 const { errors, isSubmitting } = form.formState;

 // 
 return (
 <> {/* Modal nuevo producto */}
 <NuevoProductoModal
 abierto={modalAbierto}
 onClose={() => setModalAbierto(false)}
 nombreInicial={nombreInicial}
 costoInicial={costoInicial}
 categorias={categorias}
 onProductoCreado={(prod) => { setModalAbierto(false); agregarProducto(prod); }}
 /> <form onSubmit={form.handleSubmit(onSubmit as any, onValidationError as any)} className="space-y-6 max-w-4xl"> {/* Banner: borrador */}
 {draftDisponible && (
 <div className="flex items-center justify-between gap-3 flex-wrap rounded-md border bg-muted/60 px-4 py-3"> <p className="text-sm font-medium"> Hay un borrador guardado de una compra anterior</p> <div className="flex gap-2"> <button type="button" onClick={restaurarBorrador}
 className={cn(buttonVariants({ variant: "outline" }), "h-8 text-xs")}> Restaurar
 </button> <button type="button" onClick={descartarBorrador}
 className={cn(buttonVariants({ variant: "ghost" }), "h-8 text-xs text-muted-foreground")}> Descartar
 </button> </div> </div> )}

 {/* Error servidor */}
 {serverError && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"> {serverError}
 </div> )}

 {/* Alertas de cambio de precio */}
 {alertaPrecios.length > 0 && (
 <Card className="border-orange-300 dark:border-orange-700"> <CardHeader className="pb-2"> <CardTitle className="text-base text-orange-700 dark:text-orange-400"> Cambio de costo detectado
 </CardTitle> <p className="text-xs text-muted-foreground"> El costo cambió más de 5%. Ajusta el precio de venta antes de guardar.
 </p> </CardHeader> <CardContent className="space-y-3"> {alertaPrecios.map((a) => {
 const pct = ((a.nuevoCosto - a.costoAnterior) / a.costoAnterior) * 100;
 return (
 <div key={a.productoId} className="rounded-md border bg-muted/40 p-3 space-y-3"> <div className="flex items-center justify-between gap-2 flex-wrap"> <span className="font-medium text-sm">{a.nombre}</span> <Badge variant={pct < 0 ? "outline" : "destructive"} className="text-xs"> {pct > 0 ? "+" : ""}{pct.toFixed(1)}% en costo
 </Badge> </div> <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"> <div className="space-y-0.5"> <p className="text-xs text-muted-foreground">Costo anterior</p> <p className="font-medium">RD$ {a.costoAnterior.toFixed(2)}</p> </div> <div className="space-y-0.5"> <p className="text-xs text-muted-foreground">Costo nuevo</p> <p className="font-medium">RD$ {a.nuevoCosto.toFixed(2)}</p> </div> <div className="space-y-0.5"> <p className="text-xs text-muted-foreground">Precio venta actual</p> <p className="font-medium">RD$ {a.precioVentaActual.toFixed(2)}</p> </div> <div className="space-y-1"> <p className="text-xs text-muted-foreground">Nuevo precio venta</p> <div className="flex items-center gap-1"> <span className="text-xs text-muted-foreground">RD$</span> <Input
 type="number" step="0.01" min="0" value={a.nuevoPrecioVenta}
 onChange={(e) => setAlertaPrecios((prev) => prev.map((x) => x.productoId === a.productoId
 ? { ...x, nuevoPrecioVenta: Number(e.target.value) } : x))}
 className="h-8 w-28 text-right" /> </div> </div> </div> <label className="flex items-center gap-2 cursor-pointer select-none"> <input type="checkbox" checked={a.aplicar}
 onChange={(e) => setAlertaPrecios((prev) => prev.map((x) => x.productoId === a.productoId
 ? { ...x, aplicar: e.target.checked } : x))}
 className="w-4 h-4 rounded" /> <span className="text-sm">Actualizar precio de venta al guardar</span> </label> </div> );
 })}
 </CardContent> </Card> )}

 {/* */}
 {/* SECCIÓN 1: Datos de la factura */}
 {/* */}
 <Card> <CardHeader><CardTitle className="text-base">Datos de la factura</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Suplidor — ocupa toda la fila */}
 <div className="space-y-1.5 sm:col-span-2"> <Label>Suplidor *</Label> <Select
 value={watchedSuplidor ?? ""}
 onValueChange={(v) => form.setValue("suplidorId", v ?? "")}
 > <SelectTrigger> <SelectValue placeholder="— Seleccionar suplidor —" /> </SelectTrigger> <SelectContent> {suplidores.map((s) => (
 <SelectItem key={s.id} value={s.id}> {s.nombre}
 {s.rnc && <span className="text-muted-foreground ml-1.5 text-xs">RNC: {s.rnc}</span>}
 </SelectItem> ))}
 </SelectContent> </Select> {errors.suplidorId && <p className="text-xs text-destructive">{errors.suplidorId.message}</p>}
 </div> <div className="space-y-1.5"> <Label htmlFor="noFacturaSuplidor">N° Factura del suplidor</Label> <Input id="noFacturaSuplidor" placeholder="FAC-0001" {...form.register("noFacturaSuplidor")} /> </div> <div className="space-y-1.5"> <Label htmlFor="fechaFactura">Fecha de factura *</Label> <Input id="fechaFactura" type="date" {...form.register("fechaFactura")} /> {errors.fechaFactura && <p className="text-xs text-destructive">{errors.fechaFactura.message}</p>}
 </div> <div className="space-y-1.5"> <Label>Tipo de NCF del suplidor</Label> <Select
 value={watchedTipoNcf ?? ""}
 onValueChange={(v) => {
 form.setValue("tipoNcfCompra", v || undefined);
 if (!v) { form.setValue("ncf", ""); form.setValue("ncfCodigoSeguridad", ""); }
 }}
 > <SelectTrigger> <SelectValue placeholder="Sin NCF" /> </SelectTrigger> <SelectContent> <SelectItem value="none">Sin NCF</SelectItem> {TIPOS_NCF.map((t) => (
 <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem> ))}
 </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label> <Input id="fechaVencimiento" type="date" {...form.register("fechaVencimiento")} /> <p className="text-xs text-muted-foreground">Si tiene crédito, genera CxP automáticamente</p> </div> {watchedTipoNcf && watchedTipoNcf !== "none" && (
 <div className="space-y-1.5"> <Label htmlFor="ncf">Número de NCF</Label> <Input
 id="ncf" placeholder={watchedTipoNcf === "E31" ? "E310000000001" : "B010000000001"}
 {...form.register("ncf")}
 /> <p className="text-xs text-muted-foreground"> {watchedTipoNcf === "E31" ? "NCF electrónico (13 caracteres)" : "NCF físico (13 dígitos)"}
 </p> </div> )}

 {watchedTipoNcf === "E31" && (
 <div className="space-y-1.5"> <Label htmlFor="ncfCodigoSeguridad"> Código de seguridad
 <span className="text-xs text-muted-foreground ml-1">(E31)</span> </Label> <Input id="ncfCodigoSeguridad" placeholder="Ej. 12345678" {...form.register("ncfCodigoSeguridad")} /> </div> )}

 <div className="space-y-1.5 sm:col-span-2"> <Label htmlFor="notas">Notas</Label> <Textarea id="notas" rows={2} placeholder="Observaciones sobre esta compra..." {...form.register("notas")} /> </div> </CardContent> </Card> {/* */}
 {/* SECCIÓN 2: Productos */}
 {/* */}
 <Card> <CardHeader><CardTitle className="text-base">Productos</CardTitle></CardHeader> <CardContent className="space-y-4"> {/* Búsqueda */}
 <div className="space-y-1.5"> <Label>Buscar y agregar producto</Label> <p className="text-xs text-muted-foreground"> Escribe el código exacto o parte del nombre y presiona{" "}
 <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>{" "}
 o haz clic en <strong>Agregar</strong> </p> <div className="relative flex gap-2 max-w-xl"> <div className="relative flex-1"> <Input
 placeholder="Código, código de barras, o nombre del producto..." value={busqueda}
 onChange={(e) => handleBusquedaChange(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ejecutarBusqueda())}
 onBlur={() => setTimeout(() => setMostrarSug(false), 200)}
 onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
 autoComplete="off" /> {/* Desplegable de sugerencias */}
 {mostrarSug && sugerencias.length > 0 && (
 <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-background shadow-lg max-h-56 overflow-y-auto"> {sugerencias.map((s) => (
 <button key={s.id} type="button" onMouseDown={() => agregarProducto(s)}
 className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"> <span> <span className="font-mono text-xs text-muted-foreground mr-2">{s.codigo}</span> {s.nombre}
 </span> <span className="text-xs text-muted-foreground shrink-0">Stock: {s.stockActual}</span> </button> ))}
 </div> )}
 </div> <button
 type="button" onClick={ejecutarBusqueda}
 disabled={buscando || !busqueda.trim()}
 className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}> {buscando ? "Buscando..." : "Agregar"}
 </button> </div> {/* Sin resultados  botón crear */}
 {ultimaBusqueda && !buscando && sugerencias.length === 0 && !mostrarSug && (
 <div className="flex items-center gap-3 flex-wrap rounded-md border border-dashed px-4 py-3 bg-muted/30"> <p className="text-sm text-muted-foreground flex-1"> No se encontró <strong>"{ultimaBusqueda}"</strong> en el inventario
 </p> <button
 type="button" onClick={() => { setNombreInicial(ultimaBusqueda); setCostoInicial(0); setModalAbierto(true); }}
 className={cn(buttonVariants({ variant: "outline" }), "h-8 text-xs shrink-0")}> + Crear producto nuevo
 </button> </div> )}
 </div> {/* Tabla de detalles */}
 {detalles.length === 0 ? (
 <div className="rounded-md border border-dashed py-10 text-center text-muted-foreground"> <p className="text-sm">Agrega productos usando la búsqueda de arriba</p> </div> ) : (
 <div className="overflow-x-auto rounded-md border"> <Table> <TableHeader> <TableRow> <TableHead className="w-24">Código</TableHead> <TableHead>Producto</TableHead> <TableHead className="text-right w-28">Cantidad</TableHead> <TableHead className="text-right w-36">Costo (RD$)</TableHead> <TableHead className="text-center w-24">ITBIS</TableHead> <TableHead className="text-right w-36">Subtotal</TableHead> <TableHead className="w-8"></TableHead> </TableRow> </TableHeader> <TableBody> {detalles.map((d, i) => {
 const wd = watchedDetalles[i];
 const cant = Number(wd?.cantidad) || 0;
 const costo = Number(wd?.costo) || 0;
 const pct = Number(wd?.itbisPct) || 0;
 const sub = cant * costo;
 const itbisAmt = sub * pct / 100;
 const costoAnt = d.costoAnterior ?? d.costo;
 const cambio5 = costoAnt > 0 && Math.abs((costo - costoAnt) / costoAnt) > 0.05;

 return (
 <TableRow key={d.id}> <TableCell className="font-mono text-xs text-muted-foreground">{d.codigo}</TableCell> <TableCell> <p className="font-medium text-sm leading-tight">{d.nombre}</p> <p className="text-xs text-muted-foreground">{d.unidad}</p> {cambio5 && (
 <Badge variant="destructive" className="mt-0.5 text-xs"> Precio cambió</Badge> )}
 </TableCell> <TableCell> <Input
 type="number" step="0.0001" min="0.0001" className="text-right h-8" {...form.register(`detalles.${i}.cantidad`)}
 /> </TableCell> <TableCell> <Input
 type="number" step="0.01" min="0" className="text-right h-8" {...form.register(`detalles.${i}.costo`, {
 onChange: (e) => checkAlertaPrecio(i, Number(e.target.value)),
 })}
 /> </TableCell> <TableCell> <Select
 value={String(pct)}
 onValueChange={(v) => form.setValue(`detalles.${i}.itbisPct`, Number(v))}
 > <SelectTrigger className="h-8 text-center"> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="0">0%</SelectItem> <SelectItem value="18">18%</SelectItem> </SelectContent> </Select> {itbisAmt > 0 && (
 <p className="text-[0.65rem] text-muted-foreground text-center mt-0.5"> +RD${itbisAmt.toFixed(2)}
 </p> )}
 </TableCell> <TableCell className="text-right"> <p className="font-medium text-sm"> RD$ {(sub + itbisAmt).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
 </p> {itbisAmt > 0 && (
 <p className="text-xs text-muted-foreground"> {sub.toFixed(2)} + ITBIS
 </p> )}
 </TableCell> <TableCell> <button type="button" onClick={() => remove(i)}
 className="text-muted-foreground hover:text-destructive transition-colors text-sm px-1"> </button> </TableCell> </TableRow> );
 })}
 </TableBody> </Table> </div> )}

 {errors.detalles && !Array.isArray(errors.detalles) && (
 <p className="text-xs text-destructive">{(errors.detalles as { message?: string }).message}</p> )}

 {/* Totales */}
 {detalles.length > 0 && (
 <div className="flex justify-end pt-1"> <div className="space-y-1 text-sm w-56"> <div className="flex justify-between text-muted-foreground"> <span>Subtotal sin ITBIS</span> <span>RD$ {subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span> </div> <div className="flex justify-between text-muted-foreground"> <span>ITBIS (18%)</span> <span>RD$ {totalItbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span> </div> <Separator /> <div className="flex justify-between font-bold text-base"> <span>Total</span> <span>RD$ {total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span> </div> </div> </div> )}
 </CardContent> </Card> <Separator /> <div className="flex items-center gap-3"> <button
 type="submit" disabled={isSubmitting}
 className={cn(buttonVariants(), isSubmitting && "opacity-50 pointer-events-none")}
 > {isSubmitting ? "Guardando..." : "Registrar compra"}
 </button> <button
 type="button" onClick={() => router.back()}
 className={cn(buttonVariants({ variant: "outline" }))}
 > Cancelar
 </button> <p className="text-xs text-muted-foreground ml-1"> Borrador guardado automáticamente
 </p> </div> </form> </> );
}

// Modal: Crear producto nuevo 

interface NuevoProductoModalProps {
 abierto: boolean;
 onClose: () => void;
 nombreInicial: string;
 costoInicial: number;
 categorias: Categoria[];
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 onProductoCreado: (prod: any) => void;
}

function NuevoProductoModal({
 abierto, onClose, nombreInicial, costoInicial, categorias, onProductoCreado,
}: NuevoProductoModalProps) {
 const [duplicados, setDuplicados] = useState<ProductoSimilar[]>([]);
 const [ignorarDup, setIgnorarDup] = useState(false);
 const [guardando, setGuardando] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [genCod, setGenCod] = useState(false);
 const debDupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const npForm = useForm<NuevoProductoValues>({
 resolver: zodResolver(NuevoProductoSchema) as any,
 defaultValues: {
 nombre: "", categoriaId: "", codigo: "",
 unidadMedida: "UND", costoUltimo: costoInicial,
 porcentajeGanancia: 30, precioVenta: 0, stockMinimo: 0, codigoBarras: "",
 },
 });

 const watchCosto = npForm.watch("costoUltimo");
 const watchPct = npForm.watch("porcentajeGanancia");
 const watchCatId = npForm.watch("categoriaId");
 const watchNombre = npForm.watch("nombre");

 useEffect(() => {
 if (!abierto) return;
 npForm.reset({
 nombre: nombreInicial, categoriaId: "", codigo: "",
 unidadMedida: "UND", costoUltimo: costoInicial,
 porcentajeGanancia: 30,
 precioVenta: costoInicial > 0 ? Math.round(costoInicial * 1.30 * 100) / 100 : 0,
 stockMinimo: 0, codigoBarras: "",
 });
 setDuplicados([]); setIgnorarDup(false); setError(null);
 if (nombreInicial.length >= 3) buscarDups(nombreInicial);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [abierto, nombreInicial, costoInicial]);

 // Auto-calcular precio de venta
 useEffect(() => {
 const c = Number(watchCosto) || 0;
 const p = Number(watchPct) || 30;
 npForm.setValue("precioVenta", Math.round(c * (1 + p / 100) * 100) / 100);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [watchCosto, watchPct]);

 // Auto-generar código al seleccionar categoría
 useEffect(() => {
 if (!watchCatId) return;
 setGenCod(true);
 siguienteCodigoPorCategoria(watchCatId)
 .then((cod) => npForm.setValue("codigo", cod))
 .finally(() => setGenCod(false));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [watchCatId]);

 // Detectar duplicados (debounced)
 const buscarDups = async (q: string) => {
 if (q.trim().length < 3) { setDuplicados([]); return; }
 const res = await buscarProductosPorKeyword(q.trim());
 setDuplicados(res as ProductoSimilar[]);
 };

 useEffect(() => {
 if (debDupRef.current) clearTimeout(debDupRef.current);
 debDupRef.current = setTimeout(() => buscarDups(watchNombre || ""), 400);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [watchNombre]);

 const onGuardar = async (values: NuevoProductoValues) => {
 if (duplicados.length > 0 && !ignorarDup) {
 setError("Se encontraron productos similares. Marca 'No es un duplicado' para continuar.");
 return;
 }
 setGuardando(true); setError(null);
 try {
 const result = await crearProducto({
 ...values,
 esFraccionable: false,
 exentoItbis: false,
 stockActual: 0,
 activo: true,
 });
 if ("error" in result && result.error) {
 const errs = result.error as Record<string, string[]>;
 setError(Object.values(errs).flat()[0] ?? "Error al crear producto");
 return;
 }
 if ("id" in result && result.id) {
 onProductoCreado({
 id: result.id, nombre: values.nombre, codigo: values.codigo,
 unidadMedida: values.unidadMedida, costoUltimo: values.costoUltimo,
 stockActual: 0, precioVenta: values.precioVenta,
 porcentajeGanancia: values.porcentajeGanancia,
 });
 }
 } catch (e) {
 console.error(e);
 setError("Error inesperado al crear el producto.");
 } finally {
 setGuardando(false);
 }
 };

 const npErrors = npForm.formState.errors;

 return (
 <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}> <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"> <DialogHeader> <DialogTitle>Nuevo producto</DialogTitle> </DialogHeader> {/* Alerta de duplicados */}
 {duplicados.length > 0 && (
 <div className="rounded-md border bg-muted/40 p-3 space-y-2"> <p className="text-sm font-medium"> Producto similar ya existe</p> <div className="space-y-1"> {duplicados.map((d) => (
 <div key={d.id} className="flex items-center justify-between text-xs"> <span> <Badge variant="outline" className="font-mono mr-1.5 text-xs">{d.codigo}</Badge> {d.nombre}
 </span> <span className="text-muted-foreground">Stock: {d.stockActual}</span> </div> ))}
 </div> <label className="flex items-center gap-2 cursor-pointer mt-1"> <input type="checkbox" checked={ignorarDup}
 onChange={(e) => { setIgnorarDup(e.target.checked); setError(null); }}
 className="w-4 h-4 rounded" /> <span className="text-sm">No es un duplicado — guardar de todas formas</span> </label> </div> )}

 {error && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"> {error}
 </div> )}

 <form onSubmit={npForm.handleSubmit(onGuardar as any)} className="space-y-4"> <div className="space-y-1.5"> <Label>Nombre del producto *</Label> <Input placeholder="Ej. Cemento Panam 42.5 kg" {...npForm.register("nombre")} /> {npErrors.nombre && <p className="text-xs text-destructive">{npErrors.nombre.message}</p>}
 </div> <div className="grid grid-cols-2 gap-3"> <div className="space-y-1.5"> <Label>Categoría *</Label> <Select
 value={npForm.watch("categoriaId") ?? ""}
 onValueChange={(v) => npForm.setValue("categoriaId", v ?? "")}
 > <SelectTrigger> <SelectValue placeholder="Seleccionar..." /> </SelectTrigger> <SelectContent> {categorias.map((c) => (
 <SelectItem key={c.id} value={c.id}> <span className="font-mono text-xs mr-1 text-muted-foreground">{c.codigo}</span> {c.nombre}
 </SelectItem> ))}
 </SelectContent> </Select> {npErrors.categoriaId && <p className="text-xs text-destructive">{npErrors.categoriaId.message}</p>}
 </div> <div className="space-y-1.5"> <Label>Código interno *</Label> <Input
 placeholder={genCod ? "Generando..." : "Auto al seleccionar cat."}
 {...npForm.register("codigo")}
 /> {npErrors.codigo && <p className="text-xs text-destructive">{npErrors.codigo.message}</p>}
 </div> </div> <div className="grid grid-cols-2 gap-3"> <div className="space-y-1.5"> <Label>Unidad de medida</Label> <Select
 value={npForm.watch("unidadMedida") ?? "UND"}
 onValueChange={(v) => npForm.setValue("unidadMedida", v ?? "UND")}
 > <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
 </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Stock mínimo <span className="text-xs text-muted-foreground">(alerta)</span></Label> <Input type="number" step="0.01" min="0" placeholder="0" {...npForm.register("stockMinimo")} /> </div> </div> <div className="grid grid-cols-3 gap-3"> <div className="space-y-1.5"> <Label>Costo (RD$) *</Label> <Input type="number" step="0.01" min="0" placeholder="0.00" {...npForm.register("costoUltimo")} /> {npErrors.costoUltimo && <p className="text-xs text-destructive">{npErrors.costoUltimo.message}</p>}
 </div> <div className="space-y-1.5"> <Label>% Ganancia</Label> <Input type="number" step="0.1" min="0" placeholder="30" {...npForm.register("porcentajeGanancia")} /> </div> <div className="space-y-1.5"> <Label>Precio venta (RD$) *</Label> <Input type="number" step="0.01" min="0" placeholder="0.00" {...npForm.register("precioVenta")} /> <p className="text-[0.65rem] text-muted-foreground">Auto-calculado</p> </div> </div> <div className="space-y-1.5"> <Label>Código de barras <span className="text-xs text-muted-foreground">(opcional)</span></Label> <Input placeholder="EAN-13 o UPC" {...npForm.register("codigoBarras")} /> </div> <DialogFooter className="gap-2"> <button type="button" onClick={onClose}
 className={cn(buttonVariants({ variant: "outline" }))}> Cancelar
 </button> <button
 type="submit" disabled={guardando || (duplicados.length > 0 && !ignorarDup)}
 className={cn(
 buttonVariants(),
 (guardando || (duplicados.length > 0 && !ignorarDup)) && "opacity-50 pointer-events-none" )}> {guardando ? "Guardando..." : "Crear y agregar a la compra"}
 </button> </DialogFooter> </form> </DialogContent> </Dialog> );
}
