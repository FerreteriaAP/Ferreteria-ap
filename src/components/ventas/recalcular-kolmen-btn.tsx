"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { recalcularPreciosKolmen } from "@/actions/ventas";

interface Props {
 ventaId: string;
 margen: number; // porcentaje, ej. 15
}

export function RecalcularKolmenBtn({ ventaId, margen }: Props) {
 const [isPending, start] = useTransition();
 const router = useRouter();

 const handleRecalcular = () => {
 if (!confirm(
 `¿Recalcular precios con los costos actuales?\n\n` +
 `Fórmula: Costo + ITBIS × ${margen}% ganancia\n\n` +
 `Esta acción actualizará todos los precios de la orden con el costo más reciente de cada producto. ` +
 `Asegúrate de haber registrado las compras del suplidor antes de continuar.` )) return;

 start(async () => {
 const res = await recalcularPreciosKolmen(ventaId);
 if ("error" in res && res.error) {
 alert(res.error);
 return;
 }
 router.refresh();
 });
 };

 return (
 <button
 onClick={handleRecalcular}
 disabled={isPending}
 className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50" title="Actualizar precios con los costos más recientes del inventario" > {isPending ? (
 <> Recalculando…</> ) : (
 <> Recalcular precios Kolmen ({margen}%)</> )}
 </button> );
}
