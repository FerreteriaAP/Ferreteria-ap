"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { procesarNomina, marcarNominaPagada, recalcularPrestamosNomina, eliminarNomina } from "@/actions/nominas";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { cn } from "@/lib/utils";

interface Props {
 nominaId: string;
 numero: string;
 estado: string;
}

const hoy = new Date().toISOString().split("T")[0];

export function NominaAcciones({ nominaId, numero, estado }: Props) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [syncing, setSyncing] = useState(false);
 const [syncMsg, setSyncMsg] = useState<string | null>(null);
 const [fechaPago, setFechaPago] = useState(hoy);

 const run = async (fn: () => Promise<{ ok?: boolean; error?: string }>) => {
 setLoading(true);
 await fn();
 setLoading(false);
 router.refresh();
 };

 const syncPrestamos = async () => {
 setSyncing(true);
 setSyncMsg(null);
 const res = await recalcularPrestamosNomina(nominaId);
 setSyncing(false);
 if ("error" in res && res.error) {
 setSyncMsg(` ${res.error}`);
 } else {
 setSyncMsg(" Préstamos sincronizados");
 router.refresh();
 setTimeout(() => setSyncMsg(null), 4000);
 }
 };

 return (
 <div className="flex flex-wrap items-center gap-2"> {/* Sincronizar préstamos — disponible en BORRADOR y PROCESADA */}
 {estado !== "PAGADA" && (
 <div className="flex items-center gap-2"> <button
 onClick={syncPrestamos}
 disabled={syncing || loading}
 title="Actualiza los montos de préstamos desde los registros de caja del período" className={cn(
 buttonVariants({ variant: "outline", size: "sm" }),
 (syncing || loading) && "opacity-50 pointer-events-none" )}
 > {syncing ? "Sincronizando…" : " Sincronizar préstamos"}
 </button> {syncMsg && (
 <span className={`text-xs font-medium ${syncMsg.startsWith("") ? "text-green-600" : "text-destructive"}`}> {syncMsg}
 </span> )}
 </div> )}

 {estado === "BORRADOR" && (
 <button
 onClick={() => run(() => procesarNomina(nominaId))}
 disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), loading && "opacity-50 pointer-events-none")}
 > {loading ? "..." : "Procesar nómina"}
 </button> )}

 {estado === "PROCESADA" && (
 <div className="flex items-center gap-2"> <Input
 type="date" value={fechaPago}
 onChange={(e) => setFechaPago(e.target.value)}
 className="h-8 w-36" /> <button
 onClick={() => run(() => marcarNominaPagada(nominaId, fechaPago))}
 disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), loading && "opacity-50 pointer-events-none")}
 > {loading ? "..." : "Marcar pagada"}
 </button> </div> )}

 {/* Eliminar — solo BORRADOR */}
 {estado === "BORRADOR" && (
 <BtnEliminarDocumento
 id={nominaId}
 documento={numero}
 accion={eliminarNomina}
 label=" Eliminar" /> )}
 </div> );
}
