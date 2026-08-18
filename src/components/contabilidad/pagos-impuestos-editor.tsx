"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { upsertPagoImpuesto } from "@/actions/impuestos";
import {
 TIPOS_IMPUESTO,
 LABELS_IMPUESTO,
 type PagoImpuestoRow,
 type TipoImpuesto,
} from "@/lib/impuestos-config";
import { cn } from "@/lib/utils";

interface Props {
 mes: number;
 anio: number;
 pagos: Record<TipoImpuesto, PagoImpuestoRow | null>;
}

// Botón de submit con estado de carga 

function SubmitBtn() {
 const { pending } = useFormStatus();
 return (
 <button
 type="submit" disabled={pending}
 className={cn(
 "h-8 px-4 rounded-md text-xs font-medium transition-colors shrink-0",
 pending
 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90" )}
 > {pending ? "Guardando…" : "Guardar"}
 </button> );
}

// Fila de un impuesto 

function TaxRow({
 tipo,
 mes,
 anio,
 data,
}: {
 tipo: TipoImpuesto;
 mes: number;
 anio: number;
 data: PagoImpuestoRow | null;
}) {
 const cfg = LABELS_IMPUESTO[tipo];
 const [state, formAction] = useActionState(upsertPagoImpuesto, null);

 const defaultMonto = data?.monto ?? 0;
 const defaultPagado = data?.pagado ?? false;
 // fechaPago  YYYY-MM-DD para el input type="date"
 const defaultFecha = data?.fechaPago
 ? data.fechaPago.slice(0, 10)
 : "";

 const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

 return (
 <div className={cn(
 "rounded-lg border p-4 transition-colors",
 data?.pagado ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10" : "bg-card" )}> {/* Encabezado de la fila */}
 <div className="flex items-start justify-between gap-4 mb-3"> <div> <p className="font-semibold text-sm flex items-center gap-1.5"> <span>{cfg.icon}</span> {cfg.label}
 {data?.pagado && (
 <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full ml-1 font-medium"> Pagado
 </span> )}
 </p> <p className="text-xs text-muted-foreground mt-0.5">{cfg.hint}</p> </div> {data && (
 <p className={cn(
 "font-mono font-bold text-sm shrink-0",
 data.pagado ? "text-green-700 dark:text-green-400" : "text-foreground" )}> {fmt(data.monto)}
 </p> )}
 </div> {/* Formulario */}
 <form action={formAction} className="space-y-3"> <input type="hidden" name="tipo" value={tipo} /> <input type="hidden" name="mes" value={mes} /> <input type="hidden" name="anio" value={anio} /> <div className="flex flex-wrap items-end gap-3"> {/* Monto */}
 <div className="flex-1 min-w-[140px]"> <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1"> Monto (RD$)
 </label> <input
 type="number" name="monto" step="0.01" min="0" defaultValue={defaultMonto}
 placeholder="0.00" className="w-full h-8 rounded-md border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" /> </div> {/* Fecha de pago */}
 <div className="flex-1 min-w-[140px]"> <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1"> Fecha de pago
 </label> <input
 type="date" name="fechaPago" defaultValue={defaultFecha}
 className="w-full h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /> </div> {/* Referencia */}
 <div className="flex-1 min-w-[140px]"> <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1"> # Referencia / Comprobante
 </label> <input
 type="text" name="referencia" defaultValue={data?.referencia ?? ""}
 placeholder="Opcional" className="w-full h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /> </div> {/* Pagado toggle + guardar */}
 <div className="flex items-end gap-3 shrink-0 pb-0.5"> <label className="flex items-center gap-2 cursor-pointer select-none group"> <div className="relative"> <input
 type="checkbox" name="pagado" value="1" defaultChecked={defaultPagado}
 className="sr-only peer" /> <div className={cn(
 "w-10 h-5 rounded-full border-2 transition-colors",
 "peer-checked:bg-green-500 peer-checked:border-green-500",
 "bg-muted border-muted-foreground/30" )} /> <div className={cn(
 "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
 "peer-checked:translate-x-5" )} /> </div> <span className="text-xs font-medium text-muted-foreground">Pagado</span> </label> <SubmitBtn /> </div> </div> {/* Notas (colapsada) */}
 <div> <input
 type="text" name="notas" defaultValue={data?.notas ?? ""}
 placeholder="Notas adicionales (opcional)" className="w-full h-7 rounded-md border bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" /> </div> {/* Feedback */}
 {state?.error && (
 <p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-md"> {state.error}
 </p> )}
 {state?.success && (
 <p className="text-xs text-green-700 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20 px-3 py-1.5 rounded-md"> Guardado correctamente
 </p> )}
 </form> </div> );
}

// Editor completo 

export function PagosImpuestosEditor({ mes, anio, pagos }: Props) {
 const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

 const totalPagado = TIPOS_IMPUESTO.reduce((s, t) => s + (pagos[t]?.monto ?? 0), 0);
 const totalRegistros = TIPOS_IMPUESTO.filter((t) => pagos[t] !== null).length;
 const todoPagado = TIPOS_IMPUESTO.every((t) => pagos[t]?.pagado ?? false);

 return (
 <div className="space-y-3"> {TIPOS_IMPUESTO.map((tipo) => (
 <TaxRow
 key={tipo}
 tipo={tipo}
 mes={mes}
 anio={anio}
 data={pagos[tipo]}
 /> ))}

 {/* Resumen */}
 {totalRegistros > 0 && (
 <div className={cn(
 "flex items-center justify-between rounded-lg border-2 px-5 py-3",
 todoPagado
 ? "border-green-400/50 bg-green-50/30 dark:bg-green-950/10" : "border-amber-400/40 bg-amber-50/20 dark:bg-amber-950/10" )}> <div> <p className="text-sm font-bold"> Total otros impuestos
 </p> <p className="text-xs text-muted-foreground mt-0.5"> {totalRegistros} de {TIPOS_IMPUESTO.length} tipos registrados
 {todoPagado ? " · Todos pagados " : ""}
 </p> </div> <p className={cn(
 "font-mono font-bold text-lg",
 todoPagado ? "text-green-700 dark:text-green-400" : "text-foreground" )}> {fmt(totalPagado)}
 </p> </div> )}
 </div> );
}
