"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarCobro } from "@/actions/caja";
import { cn } from "@/lib/utils";

interface Props {
 movimientoId: string;
 monto: number;
}

export function CobroConfirmarBtn({ movimientoId, monto }: Props) {
 const [isPending, startTransition] = useTransition();
 const router = useRouter();

 const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

 const handleConfirmar = () => {
 if (!confirm(`¿Confirmar este pago de ${fmt(monto)}? Esta acción aplicará el abono a la factura.`)) return;
 startTransition(async () => {
 const res = await confirmarCobro(movimientoId);
 if ("error" in res && res.error) {
 alert(res.error);
 return;
 }
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
 > {isPending ? "Confirmando…" : " Confirmar pago"}
 </button> );
}
