"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
 marcarConduceEntregado,
 crearConduceParcial,
 type ItemConduceParcial,
} from "@/actions/ventas";
import { cn } from "@/lib/utils";

// Props 

interface Props {
 ventaId: string;
 conduceId?: string; // conduce específico para marcar entregado
 entregado?: boolean; // ya fue entregado
 /** Variant: "row" para tabla, "card" para panel post-pago */
 variant?: "row" | "card";
}

// Modal de conduce parcial 

interface DetalleItem {
 productoId: string;
 nombre: string;
 unidad: string;
 cantidad: number; // cantidad total en la factura
}

interface ModalParcialProps {
 ventaId: string;
 detalles: DetalleItem[];
 onClose: () => void;
 onOk: (conduceId: string) => void;
}

function ModalConduceParcial({ ventaId, detalles, onClose, onOk }: ModalParcialProps) {
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [observaciones, setObs] = useState("");

 // Cantidad seleccionada por ítem (inicializa con la cantidad total)
 const [cantidades, setCantidades] = useState<Record<string, number>>(
 Object.fromEntries(detalles.map(d => [d.productoId, d.cantidad]))
 );
 // Ítems seleccionados (todos por defecto)
 const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>(
 Object.fromEntries(detalles.map(d => [d.productoId, true]))
 );

 const toggleItem = (pid: string) => setSeleccionados(prev => ({ ...prev, [pid]: !prev[pid] }));

 const setCant = (pid: string, v: number) => setCantidades(prev => ({ ...prev, [pid]: v }));

 const handleSubmit = () => {
 const items: ItemConduceParcial[] = detalles
 .filter(d => seleccionados[d.productoId] && cantidades[d.productoId] > 0)
 .map(d => ({
 productoId: d.productoId,
 nombre: d.nombre,
 unidad: d.unidad,
 cantEnviada: cantidades[d.productoId],
 }));

 if (!items.length) { setError("Selecciona al menos un ítem"); return; }

 setError(null);
 start(async () => {
 const res = await crearConduceParcial(ventaId, items, observaciones || undefined);
 if ("error" in res && res.error) { setError(res.error); return; }
 if ("conduceId" in res && res.conduceId) onOk(res.conduceId);
 });
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"> <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"> {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b"> <h2 className="font-bold text-base"> Conduce parcial</h2> <button
 onClick={onClose}
 className="text-muted-foreground hover:text-foreground text-xl leading-none" >×</button> </div> <div className="px-5 py-4 space-y-4"> <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-300"> <strong>Cantidades pendientes de entrega.</strong> Ajusta lo que va en <em>este viaje</em>; el sistema descuenta automáticamente de lo que queda.
 Ejemplo: quedan 6 sacos  este conduce lleva <strong>3</strong>  el próximo conduce arranca con 3 sacos pendientes.
 </div> {/* Tabla de ítems */}
 <div className="border rounded-lg overflow-hidden"> <table className="w-full text-sm"> <thead> <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide"> <th className="w-8 px-3 py-2 text-center"></th> <th className="px-3 py-2 text-left">Artículo</th> <th className="px-3 py-2 text-right">Pendiente</th> <th className="px-3 py-2 text-right">Este viaje </th> </tr> </thead> <tbody> {detalles.map((d, i) => (
 <tr key={d.productoId} className={cn(i % 2 === 0 ? "bg-background" : "bg-muted/30")}> <td className="px-3 py-2 text-center"> <input
 type="checkbox" checked={seleccionados[d.productoId] ?? true}
 onChange={() => toggleItem(d.productoId)}
 className="w-4 h-4 cursor-pointer" /> </td> <td className="px-3 py-2"> <span className="font-medium">{d.nombre}</span> <span className="text-xs text-muted-foreground ml-1">({d.unidad})</span> </td> <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs"> {Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })} {d.unidad}
 </td> <td className="px-3 py-2 text-right"> <input
 type="number" min={0.01}
 max={d.cantidad}
 step={0.01}
 value={cantidades[d.productoId] ?? d.cantidad}
 disabled={!seleccionados[d.productoId]}
 onChange={e => setCant(d.productoId, parseFloat(e.target.value) || 0)}
 className={cn(
 "w-24 text-right border-2 rounded-lg px-2 py-1.5 text-sm tabular-nums font-semibold",
 "bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
 !seleccionados[d.productoId] && "opacity-40 cursor-not-allowed",
 seleccionados[d.productoId] && cantidades[d.productoId] < d.cantidad
 ? "border-amber-400 text-amber-700 dark:text-amber-400" : "border-border" )}
 /> </td> </tr> ))}
 </tbody> </table> </div> {/* Observaciones */}
 <div> <label className="text-xs font-medium text-muted-foreground block mb-1"> Observaciones (opcional)
 </label> <textarea
 value={observaciones}
 onChange={e => setObs(e.target.value)}
 rows={2}
 placeholder="Chofer, vehículo, sector de entrega…" className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-background" /> </div> {error && (
 <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p> )}

 <div className="flex gap-2 justify-end pt-1"> <button
 type="button" onClick={onClose}
 className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors" > Cancelar
 </button> <button
 type="button" onClick={handleSubmit}
 disabled={isPending}
 className={cn(
 "px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors",
 isPending && "opacity-50 cursor-not-allowed" )}
 style={{ backgroundColor: "var(--accent-hex)", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent-hex) 35%, transparent)" }}
 > {isPending ? "Creando…" : "🚚 Crear conduce"}
 </button> </div> </div> </div> </div> );
}

// 
// Botón principal — se usa en la tarjeta de conduce de despacho en ventas/[id]
// 

export function ConduceDespachoBtn({ ventaId, conduceId: conduceIdProp, entregado, variant = "row" }: Props) {
 const router = useRouter();
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [localEntregado, setLocalEntregado] = useState(entregado ?? false);

 // Marcar como entregado 

 const handleEntregado = () => {
 if (!conduceIdProp) return;
 setError(null);
 start(async () => {
 const res = await marcarConduceEntregado(conduceIdProp);
 if ("error" in res && res.error) { setError(res.error); return; }
 setLocalEntregado(true);
 router.refresh();
 });
 };

 // Ya entregado 

 if (localEntregado) {
 return (
 <span className={cn(
 "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
 "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" )}> Entregado
 </span> );
 }

 // Conduce generado pero pendiente de entrega 

 if (conduceIdProp) {
 return (
 <div className={cn("flex items-center gap-1.5", variant === "card" && "flex-wrap")}> <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"> Pendiente
 </span> <button
 onClick={handleEntregado}
 disabled={isPending}
 className={cn(
 "text-xs px-2.5 py-1 rounded-lg border border-green-300 text-green-700",
 "hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "…" : " Marcar entregado"}
 </button> {error && <span className="text-xs text-destructive">{error}</span>}
 </div> );
 }

 return null;
}

// 
// Botones de "Nuevo conduce completo" y "Nuevo conduce parcial" // Se usan en la tarjeta de conduces en ventas/[id]/page.tsx
// 

// Un conduce existente (sólo lo que necesitamos para calcular pendientes)
interface ConduceExistente {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 detallesRecepcion: any; // null | Array<{productoId, cantEnviada, ...}>
 clienteRecibio: boolean;
}

interface NuevoConduceProps {
 ventaId: string;
 detalles: DetalleItem[]; // ítems TOTALES de la orden/factura
 conduces?: ConduceExistente[]; // conduces ya creados (para calcular pendientes)
}

export function NuevoConduceBtn({ ventaId, detalles, conduces = [] }: NuevoConduceProps) {
 const router = useRouter();
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [showModal, setShowModal] = useState(false);
 const [conduceCreado, setConduceCreado] = useState<string | null>(null);

 // Calcular ítems PENDIENTES de entrega 
 // Reglas:
 // • Conduce parcial (tiene detallesRecepcion): siempre descuenta exactamente lo enviado
 // • Conduce completo (sin detallesRecepcion) YA RECIBIDO: descuenta todos los ítems
 // • Conduce completo (sin detallesRecepcion) AÚN EN TRÁNSITO: NO descuenta
 // (está de camino pero el usuario puede querer crear un conduce paralelo para el resto)
 const pendientes = useMemo<DetalleItem[]>(() => {
 const enviados: Record<string, number> = {};

 for (const c of conduces) {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const det: any[] | null = Array.isArray(c.detallesRecepcion) && c.detallesRecepcion.length
 ? c.detallesRecepcion
 : null;

 if (det) {
 // Conduce con ítems específicos — descuenta exactamente lo enviado
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 for (const item of det) {
 enviados[item.productoId] = (enviados[item.productoId] ?? 0) + Number(item.cantEnviada);
 }
 } else if (c.clienteRecibio) {
 // Conduce completo (sin tracking) que ya fue confirmado recibido  descuenta todo
 for (const d of detalles) {
 enviados[d.productoId] = (enviados[d.productoId] ?? 0) + d.cantidad;
 }
 }
 // Conduce completo aún en tránsito (sin tracking, no recibido)  no descontar
 }

 return detalles
 .map(d => ({ ...d, cantidad: d.cantidad - (enviados[d.productoId] ?? 0) }))
 .filter(d => d.cantidad > 0.0001);
 }, [detalles, conduces]);

 // Conduce completo = enviar TODO lo que falta 
 const handleCompleto = () => {
 if (!pendientes.length) return;
 setError(null);
 setConduceCreado(null);
 start(async () => {
 const items: ItemConduceParcial[] = pendientes.map(d => ({
 productoId: d.productoId,
 nombre: d.nombre,
 unidad: d.unidad,
 cantEnviada: d.cantidad,
 }));
 const res = await crearConduceParcial(ventaId, items);
 if ("error" in res && res.error) { setError(res.error); return; }
 if ("conduceId" in res && res.conduceId) {
 setConduceCreado(res.conduceId);
 router.refresh();
 }
 });
 };

 const handleParcialOk = (conduceId: string) => {
 setShowModal(false);
 setConduceCreado(conduceId);
 router.refresh();
 };

 // Si ya todo fue entregado no mostrar botones
 if (!pendientes.length) return null;

 return (
 <> <div className="flex items-center gap-2 flex-wrap"> <button
 onClick={handleCompleto}
 disabled={isPending}
 className={cn(
 "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
 "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "Generando…" : " Enviar todo lo pendiente"}
 </button> <button
 onClick={() => { setConduceCreado(null); setShowModal(true); }}
 disabled={isPending}
 className={cn(
 "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
 "border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30",
 isPending && "opacity-50 cursor-not-allowed" )}
 > Envío parcial…
 </button> {error && <span className="text-xs text-destructive">{error}</span>}
 {/* Enlace de impresión — evita bloqueo de popup al abrir desde callback async */}
 {conduceCreado && (
 <a
 href={`/ventas/${ventaId}/imprimir/conduce?conduceId=${conduceCreado}`}
 target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 dark:text-green-400 font-medium hover:underline flex items-center gap-1" > Conduce listo — Imprimir
 </a> )}
 </div> {showModal && (
 <ModalConduceParcial
 ventaId={ventaId}
 detalles={pendientes}
 onClose={() => setShowModal(false)}
 onOk={handleParcialOk}
 /> )}
 </> );
}
