"use client";

import { useState } from "react";
import Link from "next/link";
import { DespachoConfirmarModal } from "./despacho-confirmar-modal";
import { NuevoConduceBtn } from "@/components/caja/conduce-despacho-btn";

// Tipos 

interface DetalleItem {
 productoId: string;
 nombre: string;
 unidad: string;
 cantidad: number;
}

interface ConduceInfo {
 id: string;
 numero: string;
 fechaEmision: Date | string;
 clienteRecibio: boolean;
 fechaRecepcion: Date | string | null;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 detallesRecepcion: any;
}

interface VentaDespacho {
 ventaId: string;
 ventaNumero: string;
 ventaTotal: number;
 fechaEmision: Date | string;
 cliente: { nombre: string; rnc: string | null };
 detalles: DetalleItem[];
 conduces: ConduceInfo[];
}

interface Props {
 conduce: VentaDespacho;
}

// Helpers 

function fmt(n: number) {
 return `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string) {
 return new Date(d).toLocaleDateString("es-DO", {
 day: "2-digit", month: "short", year: "numeric",
 });
}

// Componente de una fila de conduce individual 

function ConduceRow({
 c,
 ventaId,
 ventaNumero,
 cliente,
 detalles,
}: {
 c: ConduceInfo;
 ventaId: string;
 ventaNumero: string;
 cliente: string;
 detalles: DetalleItem[];
}) {
 const [modal, setModal] = useState(false);
 const [entregado, setEntregado] = useState(c.clienteRecibio);
 const [fechaRec, setFechaRec] = useState(c.fechaRecepcion);

 // ítems que lleva este conduce (parcial o todos)
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const itemsConduce: any[] | null =
 Array.isArray(c.detallesRecepcion) && c.detallesRecepcion.length
 ? c.detallesRecepcion
 : null;

 return (
 <> <div className="flex items-start gap-3 py-3 px-4 border-b last:border-0"> {/* Info del conduce */}
 <div className="flex-1 min-w-0 space-y-1"> <div className="flex items-center gap-2 flex-wrap"> <span className="font-mono font-bold text-sm text-primary">{c.numero}</span> <span className="text-xs text-muted-foreground">{fmtDate(c.fechaEmision)}</span> {entregado ? (
 <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-full px-2 py-0.5 font-medium"> Entregado {fechaRec ? fmtDate(fechaRec) : ""}
 </span> ) : (
 <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-full px-2 py-0.5 font-medium">  Pendiente
 </span> )}
 {itemsConduce && (
 <span className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-700 rounded-full px-2 py-0.5 font-medium"> Parcial
 </span> )}
 </div> {/* Resumen de ítems del conduce */}
 {itemsConduce ? (
 <div className="text-xs text-muted-foreground"> {itemsConduce.map((item: any) => (
 <span key={item.productoId} className="mr-3"> {item.nombre}: <strong>{Number(item.cantEnviada).toLocaleString("es-DO", { maximumFractionDigits: 4 })}</strong> {item.unidad}
 </span> ))}
 </div> ) : (
 <div className="text-xs text-muted-foreground">Todos los artículos</div> )}
 </div> {/* Acciones */}
 <div className="flex items-center gap-2 shrink-0 flex-wrap"> <a
 href={`/ventas/${ventaId}/imprimir/conduce?conduceId=${c.id}`}
 target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 rounded-lg border font-medium hover:bg-accent transition-colors" > Imprimir
 </a> {!entregado && (
 <button
 onClick={() => setModal(true)}
 className="text-xs px-2.5 py-1.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors" > Confirmar
 </button> )}
 </div> </div> {modal && (
 <DespachoConfirmarModal
 conduceId={c.id}
 numero={c.numero}
 ventaNumero={ventaNumero}
 cliente={cliente}
 detalles={itemsConduce
 ? itemsConduce.map((i: any) => ({
 productoId: i.productoId,
 nombre: i.nombre,
 unidad: i.unidad,
 cantidad: Number(i.cantEnviada),
 }))
 : detalles}
 onClose={() => setModal(false)}
 onOk={() => {
 setModal(false);
 setEntregado(true);
 setFechaRec(new Date());
 }}
 /> )}
 </> );
}

// 
// Tarjeta principal — muestra una VENTA con todos sus conduces
// 

export function DespachoCard({ conduce: v }: Props) {
 return (
 <div className="rounded-xl border bg-card overflow-hidden space-y-0"> {/* Encabezado de la tarjeta */}
 <div className="flex items-start justify-between gap-3 flex-wrap p-5 border-b"> <div className="space-y-0.5"> <div className="flex items-center gap-2 flex-wrap"> <Link
 href={`/ventas/${v.ventaId}`}
 className="font-mono font-bold text-primary text-base hover:underline" > {v.ventaNumero}
 </Link> <span className="text-xs text-muted-foreground">{fmtDate(v.fechaEmision)}</span> <span className={[
 "text-[11px] rounded-full px-2 py-0.5 font-medium border",
 v.conduces.every(c => c.clienteRecibio)
 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-700" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-700" ].join(" ")}> {v.conduces.every(c => c.clienteRecibio) ? " Todo entregado" : " Pendiente"}
 </span> </div> <p className="text-sm font-semibold">{v.cliente.nombre}</p> {v.cliente.rnc && <p className="text-xs text-muted-foreground">{v.cliente.rnc}</p>}
 </div> <div className="text-right"> <p className="font-mono font-bold text-lg">{fmt(v.ventaTotal)}</p> <p className="text-xs text-muted-foreground">{v.conduces.length} conduce{v.conduces.length !== 1 ? "s" : ""}</p> </div> </div> {/* Lista de conduces */}
 <div className="divide-y-0"> {v.conduces.map(c => (
 <ConduceRow
 key={c.id}
 c={c}
 ventaId={v.ventaId}
 ventaNumero={v.ventaNumero}
 cliente={v.cliente.nombre}
 detalles={v.detalles}
 /> ))}
 </div> {/* Botones para crear nuevos conduces parciales */}
 {v.conduces.some(c => !c.clienteRecibio) && (
 <div className="px-4 py-3 bg-muted/20 border-t"> <p className="text-xs text-muted-foreground mb-2 font-medium">Crear nuevo despacho:</p> <NuevoConduceBtn
 ventaId={v.ventaId}
 detalles={v.detalles}
 conduces={v.conduces}
 /> </div> )}
 </div> );
}
