"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { enviarOrdenCompra, cancelarOrdenCompra } from "@/actions/ordenes-compra";
import { cn } from "@/lib/utils";

interface Props {
 id: string;
 canSend: boolean;
 canReceive: boolean;
 canCancel: boolean;
}

export function OcActions({ id, canSend, canReceive, canCancel }: Props) {
 const router = useRouter();
 const [loading, setLoading] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 async function handleEnviar() {
 setLoading("enviar");
 setError(null);
 const res = await enviarOrdenCompra(id);
 setLoading(null);
 if ("error" in res) {
 setError(typeof res.error === "string" ? res.error : "Error al enviar");
 } else {
 router.refresh();
 }
 }

 async function handleCancelar() {
 if (!confirm("¿Cancelar esta orden de compra? Esta acción no se puede revertir.")) return;
 setLoading("cancelar");
 setError(null);
 const res = await cancelarOrdenCompra(id);
 setLoading(null);
 if ("error" in res) {
 setError(typeof res.error === "string" ? res.error : "Error al cancelar");
 } else {
 router.refresh();
 }
 }

 return (
 <div className="flex flex-col items-end gap-2"> {error && (
 <p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded">{error}</p> )}
 <div className="flex gap-2 flex-wrap justify-end"> {canSend && (
 <button
 onClick={handleEnviar}
 disabled={loading === "enviar"}
 className={cn(buttonVariants({ variant: "outline" }), "border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950")}
 > {loading === "enviar" ? "Enviando..." : " Marcar como enviada"}
 </button> )}

 {canReceive && (
 <Link
 href={`/ordenes-compra/${id}/recibir`}
 className={cn(buttonVariants(), "bg-green-600 hover:bg-green-700")}
 > Confirmar recepción
 </Link> )}

 {canCancel && (
 <button
 onClick={handleCancelar}
 disabled={loading === "cancelar"}
 className={cn(buttonVariants({ variant: "ghost" }), "text-destructive hover:text-destructive hover:bg-destructive/10")}
 > {loading === "cancelar" ? "Cancelando..." : "Cancelar orden"}
 </button> )}
 </div> </div> );
}
