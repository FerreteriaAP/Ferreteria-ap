"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { confirmarRecepcionOC, type RecepcionInput } from "@/actions/ordenes-compra";
import { cn } from "@/lib/utils";

interface ItemOC {
 id: string;
 productoId: string;
 nombre: string;
 codigo: string;
 unidad: string;
 cantidad: number;
 cantRecibida: number;
 costo: number;
}

interface Props {
 ordenId: string;
 suplidorId: string;
 items: ItemOC[];
}

const TIPOS_NCF = [
 { value: "B01", label: "B01 — Crédito Fiscal" },
 { value: "B11", label: "B11 — Proveedores Informales" },
 { value: "B14", label: "B14 — Regímenes Especiales" },
 { value: "B15", label: "B15 — Gubernamentales" },
 { value: "E31", label: "E31 — Electrónico Proveedor" },
];

const hoy = new Date().toISOString().split("T")[0];
const fmt = (n: number) => n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RecepcionOcForm({ ordenId, suplidorId, items }: Props) {
 const router = useRouter();

 // Datos de la compra/factura
 const [factura, setFactura] = useState({
 noFacturaSuplidor: "",
 ncf: "",
 tipoNcfCompra: "",
 fechaFactura: hoy,
 fechaVencimiento: "",
 notas: "",
 });

 // Cantidades recibidas y costos (editables por item)
 const [itemsState, setItemsState] = useState(
 items.map((it) => ({
 ...it,
 cantRecibidaInput: it.cantidad - it.cantRecibida, // pendiente de recibir
 costoInput: it.costo,
 itbisPct: 0,
 }))
 );

 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 function updateItem(idx: number, field: string, value: number) {
 setItemsState((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
 );
 }

 // Cálculos
 const subtotal = itemsState.reduce((s, it) => s + it.cantRecibidaInput * it.costoInput, 0);
 const totalItbis = itemsState.reduce((s, it) => s + it.cantRecibidaInput * it.costoInput * (it.itbisPct / 100), 0);
 const total = subtotal + totalItbis;

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setSubmitting(true);
 setError(null);

 const payload: RecepcionInput = {
 suplidorId,
 noFacturaSuplidor: factura.noFacturaSuplidor || undefined,
 ncf: factura.ncf || undefined,
 tipoNcfCompra: factura.tipoNcfCompra || undefined,
 fechaFactura: factura.fechaFactura,
 fechaVencimiento: factura.fechaVencimiento || undefined,
 notas: factura.notas || undefined,
 items: itemsState.map((it) => ({
 productoId: it.productoId,
 nombre: it.nombre,
 ordenDetalleId: it.id,
 cantPedida: it.cantidad,
 cantRecibida: it.cantRecibidaInput,
 costo: it.costoInput,
 itbisPct: it.itbisPct,
 })),
 };

 try {
 const res = await confirmarRecepcionOC(ordenId, payload);
 if ("error" in res) {
 setError(typeof res.error === "string" ? res.error : "Verifica los datos");
 } else {
 router.push(`/compras/${res.id}`);
 }
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-5"> {error && (
 <div className="rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3"> {error}
 </div> )}

 {/* Datos de la factura del suplidor */}
 <Card> <CardHeader><CardTitle className="text-base">Datos de la factura del suplidor</CardTitle></CardHeader> <CardContent className="grid gap-4 sm:grid-cols-3"> <div className="space-y-1.5"> <Label>No. Factura suplidor</Label> <Input
 placeholder="001-00001" value={factura.noFacturaSuplidor}
 onChange={(e) => setFactura((f) => ({ ...f, noFacturaSuplidor: e.target.value }))}
 /> </div> <div className="space-y-1.5"> <Label>Tipo NCF</Label> <Select onValueChange={(v) => setFactura((f) => ({ ...f, tipoNcfCompra: String(v ?? "") }))}> <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger> <SelectContent> {TIPOS_NCF.map((t) => (
 <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem> ))}
 </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>NCF</Label> <Input
 placeholder="B0100000001" value={factura.ncf}
 onChange={(e) => setFactura((f) => ({ ...f, ncf: e.target.value }))}
 /> </div> <div className="space-y-1.5"> <Label>Fecha de factura *</Label> <Input
 type="date" required
 value={factura.fechaFactura}
 onChange={(e) => setFactura((f) => ({ ...f, fechaFactura: e.target.value }))}
 /> </div> <div className="space-y-1.5"> <Label>Fecha vencimiento (CxP)</Label> <Input
 type="date" min={factura.fechaFactura}
 value={factura.fechaVencimiento}
 onChange={(e) => setFactura((f) => ({ ...f, fechaVencimiento: e.target.value }))}
 /> <p className="text-xs text-muted-foreground">Dejar vacío si es pago al contado</p> </div> <div className="space-y-1.5 sm:col-span-3"> <Label>Notas</Label> <Textarea
 rows={2}
 value={factura.notas}
 onChange={(e) => setFactura((f) => ({ ...f, notas: e.target.value }))}
 /> </div> </CardContent> </Card> {/* Ítems recibidos */}
 <Card> <CardHeader> <CardTitle className="text-base">Productos recibidos</CardTitle> <p className="text-xs text-muted-foreground mt-0.5"> Ajusta la cantidad recibida, el costo real y el ITBIS por línea
 </p> </CardHeader> <CardContent> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b"> <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Producto</th> <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Pedido</th> <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Ya recibido</th> <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground w-28">Cant. a recibir</th> <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground w-36">Costo unit.</th> <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground w-24">ITBIS %</th> <th className="text-right py-2 pl-3 text-xs font-medium text-muted-foreground">Subtotal</th> </tr> </thead> <tbody className="divide-y"> {itemsState.map((it, i) => {
 const pendiente = it.cantidad - it.cantRecibida;
 const sub = it.cantRecibidaInput * it.costoInput;
 const itbisAmt = sub * (it.itbisPct / 100);
 return (
 <tr key={it.id} className={pendiente <= 0 ? "opacity-40" : ""}> <td className="py-3 pr-4"> <div className="font-medium">{it.nombre}</div> <div className="text-xs text-muted-foreground">{it.codigo} · {it.unidad}</div> </td> <td className="py-3 px-3 text-right font-mono text-xs"> {it.cantidad} {it.unidad}
 </td> <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground"> {it.cantRecibida > 0 ? `${it.cantRecibida} ${it.unidad}` : "—"}
 </td> <td className="py-3 px-3"> <Input
 type="number" step="0.0001" min="0" max={pendiente}
 className="h-8 text-right font-mono" value={it.cantRecibidaInput}
 onChange={(e) => updateItem(i, "cantRecibidaInput", Math.min(Number(e.target.value), pendiente))}
 disabled={pendiente <= 0}
 /> </td> <td className="py-3 px-3"> <Input
 type="number" step="0.01" min="0" className="h-8 text-right font-mono" value={it.costoInput}
 onChange={(e) => updateItem(i, "costoInput", Number(e.target.value))}
 disabled={pendiente <= 0}
 /> </td> <td className="py-3 px-3"> <Input
 type="number" step="1" min="0" max="100" className="h-8 text-right font-mono" value={it.itbisPct}
 onChange={(e) => updateItem(i, "itbisPct", Number(e.target.value))}
 disabled={pendiente <= 0}
 /> </td> <td className="py-3 pl-3 text-right font-mono text-xs"> <div className="font-semibold">{fmt(sub)}</div> {itbisAmt > 0 && (
 <div className="text-muted-foreground">ITBIS: {fmt(itbisAmt)}</div> )}
 </td> </tr> );
 })}
 </tbody> </table> </div> {/* Totales */}
 <div className="mt-4 pt-4 border-t flex justify-end"> <div className="space-y-1 text-right min-w-64"> <div className="flex justify-between gap-8 text-sm"> <span className="text-muted-foreground">Subtotal</span> <span className="font-mono">RD$ {fmt(subtotal)}</span> </div> {totalItbis > 0 && (
 <div className="flex justify-between gap-8 text-sm"> <span className="text-muted-foreground">ITBIS</span> <span className="font-mono">RD$ {fmt(totalItbis)}</span> </div> )}
 <div className="flex justify-between gap-8 font-semibold border-t pt-1 mt-1"> <span>Total</span> <span className="font-mono">RD$ {fmt(total)}</span> </div> </div> </div> </CardContent> </Card> {/* Acciones */}
 <div className="flex gap-3 justify-end"> <a href={`/ordenes-compra/${ordenId}`} className={cn(buttonVariants({ variant: "outline" }))}> Cancelar
 </a> <button
 type="submit" disabled={submitting}
 className={cn(buttonVariants(), "bg-green-600 hover:bg-green-700", submitting && "opacity-60 pointer-events-none")}
 > {submitting ? "Procesando..." : " Confirmar recepción y crear compra"}
 </button> </div> </form> );
}
