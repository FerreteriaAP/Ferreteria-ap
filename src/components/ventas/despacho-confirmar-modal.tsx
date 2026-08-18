"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarRecepcionConduce, type ItemRecepcion } from "@/actions/ventas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Tipos 

interface DetalleItem {
 productoId: string;
 nombre: string;
 unidad: string;
 cantidad: number;
}

interface Props {
 conduceId: string;
 numero: string; // número del conduce (para mostrar en cabecera)
 ventaNumero: string;
 cliente: string;
 detalles: DetalleItem[];
 onClose: () => void;
 onOk: () => void;
}

// 

export function DespachoConfirmarModal({
 conduceId, numero, ventaNumero, cliente, detalles, onClose, onOk,
}: Props) {
 const router = useRouter();
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);

 // Estado mutable por producto — idéntico al de AvanzarVentaButtons
 const [items, setItems] = useState<
 Array<{ cantRecibida: number; devuelto: boolean; nota: string }> >(() => detalles.map(d => ({ cantRecibida: d.cantidad, devuelto: false, nota: "" })));

 const actualizar = (
 i: number,
 campo: "cantRecibida" | "devuelto" | "nota",
 valor: number | boolean | string,
 ) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it));

 const confirmar = () => {
 setError(null);
 const payload: ItemRecepcion[] = detalles.map((d, i) => ({
 productoId: d.productoId,
 nombre: d.nombre,
 unidad: d.unidad,
 cantEnviada: d.cantidad,
 cantRecibida: items[i]?.devuelto ? 0 : (items[i]?.cantRecibida ?? d.cantidad),
 devuelto: items[i]?.devuelto ?? false,
 nota: items[i]?.nota || undefined,
 }));

 start(async () => {
 const res = await confirmarRecepcionConduce(conduceId, payload);
 if ("error" in res && res.error) { setError(res.error); return; }
 router.refresh();
 onOk();
 });
 };

 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}
 > <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"> {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b"> <div> <h2 className="text-base font-bold"> Confirmar entrega</h2> <p className="text-xs text-muted-foreground mt-0.5"> Conduce {numero} · Factura {ventaNumero} · {cliente}
 </p> </div> <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl"></button> </div> {/* Instrucción */}
 <div className="px-5 pt-4 pb-2"> <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2"> Verifica cada producto con el cliente. Si recibió menos o devolvió algo, actualiza la cantidad y marca "Devuelto".
 </p> </div> {/* Lista de productos — mismo diseño que AvanzarVentaButtons */}
 <div className="px-5 py-2 overflow-y-auto flex-1 space-y-2"> {detalles.map((d, i) => {
 const item = items[i] ?? { cantRecibida: d.cantidad, devuelto: false, nota: "" };
 return (
 <div key={d.productoId} className="bg-muted/30 rounded-lg border p-3 space-y-2 text-xs"> <div className="flex justify-between items-start gap-2"> <span className="font-semibold text-sm leading-tight">{d.nombre}</span> <span className="text-muted-foreground whitespace-nowrap font-mono"> {d.cantidad} {d.unidad}
 </span> </div> <div className="grid grid-cols-2 gap-2"> <div className="space-y-1"> <Label className="text-[10px] text-muted-foreground">Cant. recibida</Label> <Input
 type="text" inputMode="decimal" value={item.devuelto ? "0" : String(item.cantRecibida)}
 disabled={item.devuelto}
 onChange={e => {
 const v = parseFloat(e.target.value.replace(",", "."));
 if (!isNaN(v) && v >= 0) actualizar(i, "cantRecibida", v);
 else if (e.target.value === "") actualizar(i, "cantRecibida", 0);
 }}
 className="h-8 text-right font-mono" /> </div> <div className="space-y-1"> <Label className="text-[10px] text-muted-foreground">Nota (opcional)</Label> <Input
 type="text" value={item.nota}
 onChange={e => actualizar(i, "nota", e.target.value)}
 placeholder="golpeado, faltante…" className="h-8" /> </div> </div> <label className="flex items-center gap-1.5 cursor-pointer w-fit select-none"> <input
 type="checkbox" checked={item.devuelto}
 onChange={e => actualizar(i, "devuelto", e.target.checked)}
 className="h-3.5 w-3.5" /> <span className="text-[11px] text-muted-foreground">Devuelto / no recibido</span> </label> </div> );
 })}
 </div> {/* Footer */}
 <div className="px-5 py-4 border-t space-y-3"> {error && (
 <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2"> {error}</p> )}
 <div className="flex gap-3"> <button
 onClick={onClose}
 className="flex-1 h-10 rounded-xl border text-sm font-medium hover:bg-accent transition-colors" > Cancelar
 </button> <button
 onClick={confirmar}
 disabled={isPending}
 className={cn(
 "flex-1 h-10 rounded-xl text-sm font-bold transition-colors",
 !isPending
 ? "bg-green-600 text-white hover:bg-green-700" : "bg-muted text-muted-foreground cursor-not-allowed" )}
 > {isPending ? "Guardando…" : " Confirmar entrega"}
 </button> </div> </div> </div> </div> );
}
