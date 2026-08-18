"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarCobro, confirmarCobrosCliente } from "@/actions/caja";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Botón individual (sin cambios de interfaz) 

interface BtnSingleProps {
 movimientoId: string;
 monto: number;
}
export function CobroConfirmarBtn({ movimientoId, monto }: BtnSingleProps) {
 const [isPending, startTransition] = useTransition();
 const router = useRouter();

 const handleConfirmar = () => {
 if (!confirm(`¿Confirmar este pago de ${fmt(monto)}?`)) return;
 startTransition(async () => {
 const res = await confirmarCobro(movimientoId);
 if ("error" in res && res.error) { alert(res.error); return; }
 router.refresh();
 });
 };

 return (
 <button
 onClick={handleConfirmar}
 disabled={isPending}
 className={cn(
 "text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors",
 isPending
 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700 shadow-sm" )}
 > {isPending ? "Confirmando…" : " Confirmar"}
 </button> );
}

// Botón masivo global (confirmar TODOS los cobros pendientes) 

interface BtnGlobalProps {
 movimientoIds: string[];
 totalMonto: number;
 totalCobros: number;
}
export function CobrosTodosConfirmarBtn({ movimientoIds, totalMonto, totalCobros }: BtnGlobalProps) {
 const [isPending, startTransition] = useTransition();
 const router = useRouter();

 const handleConfirmarTodos = () => {
 if (!confirm(
 `¿Confirmar todos los ${totalCobros} pagos pendientes por ${fmt(totalMonto)}?\n` +
 `Esta acción aplicará todos los abonos a sus respectivas facturas.` )) return;

 startTransition(async () => {
 const res = await confirmarCobrosCliente(movimientoIds);
 if ("error" in res && res.error) { alert(res.error); return; }
 router.refresh();
 });
 };

 return (
 <button
 onClick={handleConfirmarTodos}
 disabled={isPending}
 className={cn(
 "text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
 isPending
 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700 shadow-sm" )}
 > {isPending ? "Confirmando…" : ` Confirmar todos (${fmt(totalMonto)})`}
 </button> );
}
