"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generarConduceDespacho } from "@/actions/ventas";
import { cn } from "@/lib/utils";

// Tipos 

interface ConduceInfo {
 id: string;
 numero: string;
 clienteRecibio: boolean;
}

interface VentaRow {
 id: string;
 numero: string;
 total: number | string;
 createdAt: Date | string;
 pagosRecibidos: { metodo: string; monto: number | string }[];
 conduces: ConduceInfo[];
}

interface Props {
 ventas: VentaRow[];
 /** "simple" = vista caja: solo "Generar conduce" / "Conduce generado". Sin opciones de entrega. */
 modo?: "simple" | "completo";
}

// Helpers 

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(n: any) {
 return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

// Botón simple (solo para cajera) 

function BtnConduceCajera({ ventaId, conduceId }: {
 ventaId: string;
 conduceId?: string;
}) {
 const router = useRouter();
 const [isPending, start] = useTransition();
 const [ok, setOk] = useState(!!conduceId);
 const [err, setErr] = useState<string | null>(null);

 if (ok) {
 return (
 <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400"> Conduce generado
 </span> );
 }

 return (
 <div className="space-y-0.5"> <button
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
 "text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors",
 "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "Generando…" : " Generar conduce"}
 </button> {err && <p className="text-[10px] text-destructive">{err}</p>}
 </div> );
}

// 

export function VentasTurnoTable({ ventas, modo = "simple" }: Props) {
 if (ventas.length === 0) {
 return (
 <p className="px-4 py-6 text-center text-sm text-muted-foreground"> No hay ventas en este turno
 </p> );
 }

 return (
 <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="bg-muted/30 text-xs text-muted-foreground border-b"> <th className="text-left px-4 py-2">Factura</th> <th className="text-left px-3 py-2">Hora</th> <th className="text-left px-3 py-2">Método</th> <th className="text-right px-4 py-2">Total</th> <th className="text-left px-4 py-2">Despacho</th> </tr> </thead> <tbody> {ventas.map(v => {
 const conduce = v.conduces?.[0] ?? null;
 return (
 <tr key={v.id} className="border-b hover:bg-muted/20"> <td className="px-4 py-2 font-mono font-medium"> <span className="hover:text-primary hover:underline cursor-default">{v.numero}</span> </td> <td className="px-3 py-2 text-muted-foreground"> {new Date(v.createdAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
 </td> <td className="px-3 py-2"> <div className="flex flex-wrap gap-1"> {v.pagosRecibidos.map((p, i) => (
 <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"> {p.metodo}
 </span> ))}
 </div> </td> <td className="px-4 py-2 text-right font-mono font-medium"> {fmt(v.total)}
 </td> <td className="px-4 py-2"> {/* En modo simple (caja) solo muestra generar/generado, sin opciones de entrega */}
 <BtnConduceCajera ventaId={v.id} conduceId={conduce?.id} /> </td> </tr> );
 })}
 </tbody> <tfoot> <tr className="border-t bg-muted/30"> <td colSpan={3} className="px-4 py-2 text-sm font-semibold">Total</td> <td className="px-4 py-2 text-right font-mono font-bold"> {fmt(ventas.reduce((s, v) => s + Number(v.total), 0))}
 </td> <td /> </tr> </tfoot> </table> </div> );
}
