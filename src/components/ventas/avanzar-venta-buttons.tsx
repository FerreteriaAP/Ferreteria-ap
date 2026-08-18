"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
 avanzarCotizacion,
 crearConduce,
 facturarVenta,
 cancelarVenta,
 confirmarRecepcionConduce,
 type ItemRecepcion,
} from "@/actions/ventas";
import { cn } from "@/lib/utils";

interface DetalleResumen {
 productoId: string;
 nombre: string;
 unidad: string;
 cantidad: number;
}

interface Props {
 ventaId: string;
 tipo: string;
 conduceId?: string;
 conduceRecibido: boolean;
 detalles?: DetalleResumen[];
}

export function AvanzarVentaButtons({
 ventaId, tipo, conduceId, conduceRecibido, detalles = [],
}: Props) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Conduce form
 const [mostrarConduce, setMostrarConduce] = useState(false);
 const [entregado, setEntregado] = useState("");
 const [recibido, setRecibido] = useState("");
 const [chofer, setChofer] = useState("");
 const [obsConduce, setObsConduce] = useState("");

 // Factura form
 const [mostrarFactura, setMostrarFactura] = useState(false);
 const [ncf, setNcf] = useState("");
 const [tipoNcf, setTipoNcf] = useState("B02");

 // Recepción por ítem
 const [mostrarRecepcion, setMostrarRecepcion] = useState(false);
 // Estado mutable por fila: { cantRecibida, devuelto, nota }
 const [itemsRecepcion, setItemsRecepcion] = useState<
 Array<{ cantRecibida: number; devuelto: boolean; nota: string }> >([]);

 // Inicializa items de recepción al abrir el formulario
 const abrirRecepcion = () => {
 setItemsRecepcion(
 detalles.map((d) => ({ cantRecibida: d.cantidad, devuelto: false, nota: "" }))
 );
 setMostrarRecepcion(true);
 };

 const actualizarItem = (i: number, campo: "cantRecibida" | "devuelto" | "nota", valor: number | boolean | string) => {
 setItemsRecepcion((prev) => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it)
 );
 };

 const run = async (fn: () => Promise<{ error?: string; ok?: boolean; id?: string; numero?: string }>) => {
 setLoading(true);
 setError(null);
 const result = await fn();
 setLoading(false);
 if ("error" in result && result.error) {
 setError(result.error as string);
 return;
 }
 router.refresh();
 };

 const confirmarRecepcion = () => {
 if (!conduceId) return;
 const payload: ItemRecepcion[] = detalles.map((d, i) => ({
 productoId: d.productoId,
 nombre: d.nombre,
 unidad: d.unidad,
 cantEnviada: d.cantidad,
 cantRecibida: itemsRecepcion[i]?.devuelto ? 0 : (itemsRecepcion[i]?.cantRecibida ?? d.cantidad),
 devuelto: itemsRecepcion[i]?.devuelto ?? false,
 nota: itemsRecepcion[i]?.nota || undefined,
 }));
 run(() => confirmarRecepcionConduce(conduceId, payload));
 };

 if (tipo === "CANCELADA" || tipo === "FACTURADA") return null;

 return (
 <div className="space-y-3"> {error && (
 <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{error}</p> )}

 {/* COT  OV */}
 {tipo === "COTIZACION" && (
 <button
 onClick={() => run(() => avanzarCotizacion(ventaId))}
 disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "..." : "Convertir a Orden de Venta"}
 </button> )}

 {/* OV  Conduce */}
 {tipo === "ORDEN_VENTA" && !mostrarConduce && (
 <button
 onClick={() => setMostrarConduce(true)}
 className={cn(buttonVariants({ size: "sm" }), "w-full")}
 > Crear Conduce
 </button> )}

 {tipo === "ORDEN_VENTA" && mostrarConduce && (
 <div className="space-y-2 border rounded-md p-3 text-sm"> <p className="font-semibold text-sm">Datos del conduce</p> {[
 { label: "Entregado por", val: entregado, set: setEntregado },
 { label: "Recibido por", val: recibido, set: setRecibido },
 { label: "Chofer", val: chofer, set: setChofer },
 ].map(({ label, val, set }) => (
 <div key={label} className="space-y-1"> <Label className="text-xs">{label}</Label> <Input value={val} onChange={(e) => set(e.target.value)} className="h-8" placeholder="Nombre" /> </div> ))}
 <div className="space-y-1"> <Label className="text-xs">Observaciones</Label> <Input value={obsConduce} onChange={(e) => setObsConduce(e.target.value)} className="h-8" /> </div> <div className="flex gap-2 pt-1"> <button
 onClick={() => run(() => crearConduce(ventaId, {
 firmaEntregado: entregado || undefined,
 firmaRecibido: recibido || undefined,
 firmaChofer: chofer || undefined,
 observaciones: obsConduce || undefined,
 }))}
 disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "flex-1", loading && "opacity-50 pointer-events-none")}
 > {loading ? "..." : "Confirmar conduce"}
 </button> <button
 onClick={() => setMostrarConduce(false)}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
 > Cancelar
 </button> </div> </div> )}

 {/* CONDUCE — Recepción pendiente: formulario por ítem */}
 {tipo === "CONDUCE" && !conduceRecibido && conduceId && !mostrarRecepcion && (
 <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2"> <p className="text-xs font-semibold text-amber-800"> Pendiente: confirmar recepción de mercancía
 </p> <p className="text-[11px] text-amber-700"> Obligatorio antes de emitir la factura. Revisa las cantidades recibidas.
 </p> <button
 onClick={abrirRecepcion}
 className={cn(
 buttonVariants({ size: "sm" }),
 "w-full bg-amber-600 hover:bg-amber-700 border-0" )}
 > Registrar recepción del cliente
 </button> </div> )}

 {/* Formulario detallado de recepción */}
 {tipo === "CONDUCE" && !conduceRecibido && conduceId && mostrarRecepcion && (
 <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 space-y-3"> <p className="text-xs font-semibold text-amber-800">Recepción por producto</p> <div className="space-y-2 max-h-72 overflow-y-auto pr-1"> {detalles.map((d, i) => {
 const item = itemsRecepcion[i] ?? { cantRecibida: d.cantidad, devuelto: false, nota: "" };
 return (
 <div key={d.productoId} className="bg-white rounded border p-2 space-y-1.5 text-xs"> <div className="flex justify-between items-start gap-2"> <span className="font-medium text-sm leading-tight">{d.nombre}</span> <span className="text-muted-foreground whitespace-nowrap"> {d.cantidad} {d.unidad}
 </span> </div> <div className="grid grid-cols-2 gap-2"> <div className="space-y-0.5"> <Label className="text-[10px] text-muted-foreground">Cant. recibida</Label> <Input
 type="text" inputMode="decimal" value={item.devuelto ? "0" : String(item.cantRecibida)}
 disabled={item.devuelto}
 onChange={(e) => {
 const v = parseFloat(e.target.value.replace(",", "."));
 if (!isNaN(v) && v >= 0) actualizarItem(i, "cantRecibida", v);
 else if (e.target.value === "") actualizarItem(i, "cantRecibida", 0);
 }}
 className="h-7 text-right" /> </div> <div className="space-y-0.5"> <Label className="text-[10px] text-muted-foreground">Nota (opcional)</Label> <Input
 type="text" value={item.nota}
 onChange={(e) => actualizarItem(i, "nota", e.target.value)}
 placeholder="ej. golpeado, faltante..." className="h-7" /> </div> </div> <label className="flex items-center gap-1.5 cursor-pointer w-fit"> <input
 type="checkbox" checked={item.devuelto}
 onChange={(e) => actualizarItem(i, "devuelto", e.target.checked)}
 className="h-3.5 w-3.5" /> <span className="text-[11px] text-muted-foreground">Devuelto / no recibido</span> </label> </div> );
 })}
 </div> <div className="flex gap-2 pt-1"> <button
 onClick={confirmarRecepcion}
 disabled={loading}
 className={cn(
 buttonVariants({ size: "sm" }),
 "flex-1 bg-amber-600 hover:bg-amber-700 border-0",
 loading && "opacity-50 pointer-events-none" )}
 > {loading ? "..." : " Confirmar recepción"}
 </button> <button
 onClick={() => setMostrarRecepcion(false)}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
 > Cancelar
 </button> </div> </div> )}

 {tipo === "CONDUCE" && conduceRecibido && (
 <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 border border-green-200"> Recepción confirmada — ya puedes emitir la factura
 </p> )}

 {/* Facturar — solo disponible con recepción confirmada */}
 {tipo === "CONDUCE" && conduceRecibido && !mostrarFactura && (
 <button
 onClick={() => setMostrarFactura(true)}
 className={cn(buttonVariants({ size: "sm" }), "w-full")}
 > Emitir Factura
 </button> )}

 {tipo === "ORDEN_VENTA" && !mostrarFactura && (
 <button
 onClick={() => setMostrarFactura(true)}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
 > Facturar (sin conduce)
 </button> )}

 {(tipo === "CONDUCE" && conduceRecibido || tipo === "ORDEN_VENTA") && mostrarFactura && (
 <div className="space-y-2 border rounded-md p-3 text-sm"> <p className="font-semibold text-sm">Datos de la factura</p> <div className="space-y-1"> <Label className="text-xs">Tipo NCF</Label> <Select value={tipoNcf} onValueChange={(v) => setTipoNcf((v ?? "B02") as string)}> <SelectTrigger className="h-8"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="B01">B01 — Crédito Fiscal</SelectItem> <SelectItem value="B02">B02 — Consumidor Final</SelectItem> <SelectItem value="B14">B14 — Régimen Especial</SelectItem> <SelectItem value="B15">B15 — Gubernamental</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1"> <Label className="text-xs">NCF</Label> <Input
 value={ncf}
 onChange={(e) => setNcf(e.target.value)}
 className="h-8 font-mono" placeholder="B020000000001" /> </div> <div className="flex gap-2 pt-1"> <button
 onClick={() => run(() => facturarVenta(ventaId, { ncf, tipoNcf }))}
 disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "flex-1", loading && "opacity-50 pointer-events-none")}
 > {loading ? "..." : "Confirmar factura"}
 </button> <button
 onClick={() => setMostrarFactura(false)}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
 > Cancelar
 </button> </div> </div> )}

 {(tipo === "COTIZACION" || tipo === "ORDEN_VENTA") && (
 <> <Separator /> <button
 onClick={() => {
 if (!confirm("¿Cancelar este documento?")) return;
 run(() => cancelarVenta(ventaId));
 }}
 disabled={loading}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full text-destructive hover:text-destructive")}
 > Cancelar documento
 </button> </> )}
 </div> );
}
