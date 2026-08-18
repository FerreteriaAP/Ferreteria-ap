"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
 nombre: string;
 rnc?: string | null;
 count: number;
 totalSaldo: number;
 totalVencido: number;
 etiqueta:     string; // "factura" | "compra"
 defaultOpen?: boolean;
 accion?: React.ReactNode; // botón/link extra en el header
 children: React.ReactNode;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function GrupoColapsable({
 nombre,
 rnc,
 count,
 totalSaldo,
 totalVencido,
 etiqueta,
 defaultOpen = false,
 accion,
 children,
}: Props) {
 const [open, setOpen] = useState(defaultOpen);

 return (
 <div className={cn(
 "rounded-lg border bg-card overflow-hidden transition-shadow",
 open && "shadow-sm" )}> {/* Header clicable */}
 <button
 type="button" onClick={() => setOpen((o) => !o)}
 className={cn(
 "w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
 "bg-muted/30 hover:bg-muted/50 border-b border-transparent",
 open && "border-b-border" )}
 > {/* Izquierda: ícono + nombre + badges */}
 <div className="flex items-center gap-2 min-w-0"> {open
 ? <ChevronDown className="shrink-0 h-4 w-4 text-muted-foreground" /> : <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground" /> }
 <span className="font-semibold text-sm truncate">{nombre}</span> {rnc && (
 <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline"> RNC: {rnc}
 </span> )}
 <span className="text-xs text-muted-foreground shrink-0"> · {count} {etiqueta}{count !== 1 ? "s" : ""}
 </span> </div> {/* Derecha: acción + vencido + total */}
 <div className="flex items-center gap-3 shrink-0"> {totalVencido > 0 && (
 <span className="text-destructive font-medium text-xs hidden sm:inline"> Vencido: {fmt(totalVencido)}
 </span> )}
 <div className="text-right"> <span className="font-bold text-sm tabular-nums">{fmt(totalSaldo)}</span> {totalVencido > 0 && (
 <div className="text-[10px] text-destructive sm:hidden font-medium"> {fmt(totalVencido)} vencido
 </div> )}
 </div> {/* Botón/link extra — detiene la propagación para no abrir/cerrar el acordeón */}
 {accion && (
 <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}> {accion}
 </span> )}
 </div> </button> {/* Detalle desplegable */}
 {open && (
 <div className="divide-y animate-in slide-in-from-top-2 duration-150"> {children}
 </div> )}
 </div> );
}
