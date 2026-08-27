"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generarConduceDespacho } from "@/actions/ventas";
import { cn } from "@/lib/utils";

// Tipos 

interface Conduce {
 id: string; numero: string; clienteRecibio: boolean;
}

interface VentaCobrada {
 id: string;
 numero: string;
 total: number;
 createdAt: Date | string;
 pagosRecibidos: { metodo: string; monto: number }[];
 conduces: Conduce[];
}

interface Movimiento {
 id: string;
 tipo: string;
 subTipo: string | null;
 concepto: string;
 monto: number | string;
 fecha: Date | string;
}

interface Props {
 cobros: VentaCobrada[];
 movimientos: Movimiento[];
}

// Helper 

function fmt(n: number | string) {
 return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(d: Date | string) {
 return new Date(d).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
}

const SUBTIPO_LABEL: Record<string, string> = {
 GASTO: "Gasto",
 COMPRA_MERCANCIA: "Compra",
 PRESTAMO: "Préstamo",
 COBRO_CXC: "Cobro CxC",
};

// 
// Botón de conduce inline (solo crea, no imprime)
// 

function BtnConduce({ ventaId, conduceId, entregado }: {
 ventaId: string; conduceId?: string; entregado?: boolean;
}) {
 const router = useRouter();
 const [isPending, start] = useTransition();
 const [ok, setOk] = useState(!!conduceId);
 const [err, setErr] = useState<string | null>(null);

 if (entregado) {
 return <span className="text-xs text-green-600 font-medium"> Entregado</span>;
 }

 if (ok || conduceId) {
 return (
 <span className="text-xs text-blue-600 font-medium"> Conduce generado{" "}
 <Link href="/ventas/despachos" className="underline">ver despachos </Link> </span> );
 }

 return (
 <span className="inline-flex flex-col gap-0.5"> <button
 onClick={() => {
 setErr(null);
 start(async () => {
 const res = await generarConduceDespacho(ventaId);
 if ("error" in res && res.error) { setErr(res.error); return; }
 setOk(true);
 router.refresh();
 });
 }}
 disabled={isPending}
 className={cn(
 "text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-700 whitespace-nowrap",
 "hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400 transition-colors",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "Generando…" : "Conduce"}
 </button> {err && <span className="text-[10px] text-destructive">{err}</span>}
 </span> );
}

// 
// Panel de stat card expandible
// 

function StatPanel({ label, badge, accent, children }: {
 label: string;
 badge: string;
 accent?: boolean;
 children: React.ReactNode;
}) {
 const [open, setOpen] = useState(false);

 return (
 <div className={cn(
 "rounded-lg border transition-all",
 open
 ? "border-primary/40 bg-primary/5 dark:bg-primary/10 col-span-2" : accent
 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-muted/40" )}> {/* Header — clickable */}
 <button
 type="button" onClick={() => setOpen(v => !v)}
 className="w-full text-left px-3 py-2.5" > <p className={cn(
 "text-xs",
 accent ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground" )}> {label}
 </p> <div className="flex items-center justify-between gap-2 mt-0.5"> <p className={cn(
 "text-base font-bold font-mono",
 accent ? "text-amber-800 dark:text-amber-300" : "" )}> {badge}
 </p> <span className="text-muted-foreground text-xs">{open ? "" : ""}</span> </div> </button> {/* Expandable body */}
 {open && (
 <div className="border-t px-3 pb-3 pt-2 space-y-1"> {children}
 </div> )}
 </div> );
}

// 
// Componente principal exportado
// 

export function CajaStatExpandable({ cobros, movimientos }: Props) {
 const totalCobros = cobros.reduce((s, v) => s + Number(v.total), 0);

 return (
 <> {/* Cobros del turno */}
 <StatPanel
 label="Cobros del turno" badge={cobros.length > 0 ? `${cobros.length} · ${fmt(totalCobros)}` : "0"}
 > {cobros.length === 0 ? (
 <p className="text-xs text-muted-foreground py-1">Sin cobros aún</p> ) : (
 <div className="space-y-2"> {cobros.map(v => {
 const conduce = v.conduces?.[0] ?? null;
 return (
 <div key={v.id} className="flex items-center justify-between gap-3 py-1 border-b last:border-0"> <div className="flex items-center gap-1.5 flex-wrap min-w-0"> <span
 className="font-mono text-xs font-bold" > {v.numero}
 </span> <span className="text-[10px] text-muted-foreground">{fmtTime(v.createdAt)}</span> {v.pagosRecibidos.map((p, i) => (
 <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded"> {p.metodo}
 </span> ))} <BtnConduce
 ventaId={v.id}
 conduceId={conduce?.id}
 entregado={conduce?.clienteRecibio}
 /> </div> <span className="font-mono text-sm font-bold shrink-0">{fmt(v.total)}</span> </div> );
 })}
 <div className="pt-1"> <Link
 href="/ventas/despachos" className="text-xs text-primary hover:underline font-medium" > Ver todos los despachos 
 </Link> </div> </div> )}
 </StatPanel> {/* Movimientos de caja */}
 <StatPanel
 label="Movimientos caja" badge={String(movimientos.length)}
 > {movimientos.length === 0 ? (
 <p className="text-xs text-muted-foreground py-1">Sin movimientos aún</p> ) : (
 <div className="space-y-1"> {movimientos.map(m => (
 <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0 gap-2"> <div className="min-w-0"> <span className={cn(
 "inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mr-1.5",
 m.tipo === "ENTRADA" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" )}> {m.subTipo ? SUBTIPO_LABEL[m.subTipo] ?? m.subTipo : m.tipo}
 </span> <span className="text-muted-foreground">{m.concepto}</span> </div> <div className="flex items-center gap-1.5 shrink-0"> <span className="text-[10px] text-muted-foreground">{fmtTime(m.fecha)}</span> <span className={cn(
 "font-mono font-medium",
 m.tipo === "ENTRADA" ? "text-green-600" : "text-red-600" )}> {m.tipo === "SALIDA" ? "-" : "+"}{fmt(m.monto)}
 </span> </div> </div> ))}
 </div> )}
 </StatPanel> </> );
}
