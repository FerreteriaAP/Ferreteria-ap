"use client";

import { useState, useTransition, useRef, type FormEvent } from "react";
import { buscarFacturasParaNC, crearNotaCredito, type NotaCreditoDetalleItem } from "@/actions/nota-credito";
import { cn } from "@/lib/utils";

const INPUT = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FacturaResult = Awaited<ReturnType<typeof buscarFacturasParaNC>>[number];
type DetalleVenta = FacturaResult["detalles"][number];

interface ItemNC {
 productoId: string;
 nombre: string;
 unidad: string;
 cantidadMax: number;
 cantidad: string; // string para input
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

 // Búsqueda de factura
 const [query, setQuery] = useState("");
 const [resultados, setResultados] = useState<FacturaResult[]>([]);
 const [buscando, setBuscando] = useState(false);
 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 // Factura seleccionada
 const [factura, setFactura] = useState<FacturaResult | null>(null);

 // Items a devolver
 const [items, setItems] = useState<ItemNC[]>([]);

 // Motivo
 const [motivo, setMotivo] = useState("");
 const [notas, setNotas] = useState("");

 const totalNC = items.reduce((s, i) => {
 const cant = parseFloat(i.cantidad) || 0;
 return s + cant * i.precioUnitario;
 }, 0);

 // Búsqueda con debounce
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
 // Inicializar items con cantidad 0
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

 const setItemCantidad = (pid: string, val: string) => setItems(prev => prev.map(i => i.productoId === pid ? { ...i, cantidad: val } : i));

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
 const res = await crearNotaCredito({
 ventaId: factura.id,
 turnoId,
 motivo,
 detalles,
 notas: notas || undefined,
 });
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk((res as { ok: true; numero: string }).numero);
 });
 };

 return (
 /* Overlay */
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}> <div className="w-full max-w-xl bg-background rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]"> {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"> <div> <h2 className="font-bold text-base"> Nota de crédito</h2> <p className="text-xs text-muted-foreground mt-0.5">El monto se acredita al saldo a favor del cliente</p> </div> <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">×</button> </div> {/* Contenido */}
 <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4"> {/* Buscador de factura */}
 <div className="space-y-1"> <label className="text-xs font-medium text-muted-foreground">Factura original</label> <div className="relative"> <input
 autoFocus
 type="text" value={query}
 onChange={e => handleQuery(e.target.value)}
 placeholder="Número de factura o nombre del cliente…" className={INPUT}
 /> {buscando && (
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse"> buscando…
 </span> )}
 {resultados.length > 0 && (
 <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"> {resultados.map(f => (
 <button key={f.id} type="button" onClick={() => seleccionarFactura(f)}
 className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0"> <div className="flex justify-between gap-3"> <div> <p className="text-sm font-mono font-bold text-primary">{f.numero}</p> <p className="text-xs">{f.cliente.nombre}</p> </div> <div className="text-right shrink-0"> <p className="text-sm font-mono font-bold">{fmt(Number(f.total))}</p> <p className="text-[10px] text-muted-foreground"> {new Date(f.fechaEmision).toLocaleDateString("es-DO")}
 </p> </div> </div> </button> ))}
 </div> )}
 </div> </div> {/* Artículos a devolver */}
 {factura && items.length > 0 && (
 <div className="space-y-2"> <p className="text-xs font-medium text-muted-foreground"> Cantidad a devolver por artículo (deja en 0 los que no se devuelven)
 </p> <div className="rounded-xl border overflow-hidden"> {items.map(i => (
 <div key={i.productoId}
 className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-muted/20 transition-colors"> <div className="flex-1 min-w-0"> <p className="text-sm font-medium truncate">{i.nombre}</p> <p className="text-xs text-muted-foreground"> Facturado: {i.cantidadMax} {i.unidad} · {fmt(i.precioUnitario)} c/u
 </p> </div> <div className="flex items-center gap-2 shrink-0"> <input
 type="number" min="0" step="0.01" max={i.cantidadMax}
 value={i.cantidad}
 onChange={e => setItemCantidad(i.productoId, e.target.value)}
 placeholder="0" className="w-20 h-8 rounded-lg border bg-background px-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/40" /> <span className="text-xs text-muted-foreground w-8">{i.unidad}</span> </div> </div> ))}
 </div> {/* Total crédito */}
 {totalNC > 0 && (
 <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-primary/5 border border-primary/20"> <span className="text-sm font-semibold">Crédito a aplicar</span> <span className="font-mono font-bold text-primary">{fmt(totalNC)}</span> </div> )}
 </div> )}

 {/* Motivo */}
 {factura && (
 <div className="space-y-1"> <label className="text-xs font-medium text-muted-foreground">Motivo de la devolución *</label> <input
 value={motivo}
 onChange={e => setMotivo(e.target.value)}
 placeholder="Producto defectuoso, error en pedido…" className={INPUT}
 required
 /> </div> )}

 {/* Notas adicionales */}
 {factura && (
 <div className="space-y-1"> <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label> <input
 value={notas}
 onChange={e => setNotas(e.target.value)}
 placeholder="Observaciones adicionales…" className={INPUT}
 /> </div> )}

 {/* Nota informativa */}
 {factura && (
 <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-300">  El crédito se sumará al <strong>saldo a favor</strong> de {factura.cliente.nombre}.
 El saldo actual es {fmt(Number(factura.cliente.saldoFavor))}.
 Podrán aplicarlo en su próximo pago en caja.
 </div> )}

 {error && <p className="text-sm text-destructive font-medium">{error}</p>}

 {/* Acciones */}
 <div className="flex gap-2 pt-1"> <button
 type="submit" disabled={isPending || !factura || totalNC <= 0}
 className={cn(
 "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
 isPending || !factura || totalNC <= 0
 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90" )}
 > {isPending ? "Generando…" : `Generar nota de crédito${totalNC > 0 ? ` (${fmt(totalNC)})` : ""}`}
 </button> <button type="button" onClick={onClose}
 className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-accent transition-colors"> Cancelar
 </button> </div> </form> </div> </div> );
}
