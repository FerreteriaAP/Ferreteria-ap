import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrdenCompra } from "@/actions/ordenes-compra";
import { OcActions } from "@/components/ordenes-compra/oc-actions";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { eliminarOrdenCompra } from "@/actions/ordenes-compra";
import { auth } from "@/lib/auth";

export const metadata = { title: "Orden de compra" };

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
 BORRADOR: { label: "Borrador", className: "bg-muted text-muted-foreground" },
 ENVIADA: { label: "Enviada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
 RECIBIDA_PARCIAL: { label: "Recibida parcial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
 RECIBIDA: { label: "Recibida", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
 CANCELADA: { label: "Cancelada", className: "bg-destructive/10 text-destructive" },
};

const fmt = (n: number | null | undefined) => n == null ? "—" : Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: Date | null | undefined) => d == null ? "—" : new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });

export default async function OrdenCompraPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const [oc, session] = await Promise.all([getOrdenCompra(id), auth()]);
 if (!oc) notFound();

 const rolUsuario = (session?.user as { rol?: string })?.rol ?? "";

 const badge = ESTADO_BADGE[oc.estado] ?? { label: oc.estado, className: "bg-muted text-muted-foreground" };
 const canSend = oc.estado === "BORRADOR";
 const canReceive = oc.estado === "ENVIADA" || oc.estado === "RECIBIDA_PARCIAL";
 const canCancel = oc.estado !== "RECIBIDA" && oc.estado !== "CANCELADA";

 return (
 <div className="space-y-6"> {/* Encabezado */}
 <div className="flex flex-wrap items-start justify-between gap-4"> <div> <div className="flex items-center gap-3"> <Link href="/ordenes-compra" className="text-sm text-muted-foreground hover:text-foreground">  Órdenes de compra
 </Link> </div> <h1 className="text-2xl font-bold mt-1 flex items-center gap-3"> {oc.numero}
 <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${badge.className}`}> {badge.label}
 </span> </h1> <p className="text-sm text-muted-foreground mt-1"> Suplidor: <strong>{oc.suplidor.nombre}</strong> {oc.usuario && <> · Creada por {oc.usuario.nombre}</>}
 </p> </div> {/* Acciones */}
 <div className="flex items-center gap-2 flex-wrap"> {/* Imprimir — siempre disponible */}
 <Link
 href={`/ordenes-compra/${oc.id}/imprimir`}
 target="_blank" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors" > Imprimir OC
 </Link> <OcActions
 id={oc.id}
 canSend={canSend}
 canReceive={canReceive}
 canCancel={canCancel}
 /> {/* Eliminar — solo BORRADOR y solo ADMINISTRADOR */}
 {rolUsuario === "ADMINISTRADOR" && oc.estado === "BORRADOR" && (
 <BtnEliminarDocumento
 id={oc.id}
 documento={oc.numero}
 accion={eliminarOrdenCompra}
 label=" Eliminar" variant="outline" /> )}
 </div> </div> {/* Datos generales */}
 <div className="grid gap-4 sm:grid-cols-3 rounded-lg border p-5"> <div> <p className="text-xs text-muted-foreground">Fecha creación</p> <p className="font-medium">{fmtDate(oc.createdAt)}</p> </div> <div> <p className="text-xs text-muted-foreground">Fecha entrega esperada</p> <p className="font-medium">{fmtDate(oc.fechaEntrega)}</p> </div> <div> <p className="text-xs text-muted-foreground">Total estimado</p> <p className="font-semibold text-lg">RD$ {fmt(Number(oc.total))}</p> {Number(oc.itbis) > 0 && (
 <p className="text-xs text-muted-foreground"> Subtotal RD$ {fmt(Number(oc.subtotal))} + ITBIS RD$ {fmt(Number(oc.itbis))}
 </p> )}
 </div> {oc.notas && (
 <div className="sm:col-span-3"> <p className="text-xs text-muted-foreground">Notas</p> <p className="text-sm">{oc.notas}</p> </div> )}
 </div> {/* Ítems */}
 <div className="rounded-lg border overflow-hidden"> <div className="px-5 py-3 bg-muted/30 border-b"> <h2 className="font-semibold text-sm">Productos solicitados</h2> </div> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b"> <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Producto</th> <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Pedido</th> <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Recibido</th> <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Pendiente</th> <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Costo est.</th> <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Subtotal</th> </tr> </thead> <tbody className="divide-y"> {oc.detalles.map((d) => {
 const recibido = Number(d.cantRecibida);
 const pedido = Number(d.cantidad);
 const pendiente = pedido - recibido;
 const pct = pedido > 0 ? (recibido / pedido) * 100 : 0;
 return (
 <tr key={d.id}> <td className="px-5 py-3"> <div className="font-medium">{d.producto.nombre}</div> <div className="text-xs text-muted-foreground">{d.producto.codigo}</div> </td> <td className="px-4 py-3 text-right font-mono text-xs">{fmt(pedido)}</td> <td className="px-4 py-3 text-right"> <div className="font-mono text-xs">{fmt(recibido)}</div> {pedido > 0 && (
 <div className="mt-1 h-1 w-16 ml-auto bg-muted rounded-full overflow-hidden"> <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} /> </div> )}
 </td> <td className={`px-4 py-3 text-right font-mono text-xs ${pendiente > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}> {fmt(pendiente)}
 </td> <td className="px-4 py-3 text-right font-mono text-xs"> RD$ {fmt(Number(d.costo))}
 </td> <td className="px-5 py-3 text-right font-mono text-xs font-semibold"> RD$ {fmt(Number(d.subtotal))}
 </td> </tr> );
 })}
 </tbody> <tfoot className="border-t bg-muted/20"> <tr> <td colSpan={5} className="px-5 py-3 text-right font-semibold text-sm">Total estimado</td> <td className="px-5 py-3 text-right font-mono font-bold">RD$ {fmt(Number(oc.total))}</td> </tr> </tfoot> </table> </div> </div> {/* Compras generadas */}
 {oc.compras.length > 0 && (
 <div className="rounded-lg border overflow-hidden"> <div className="px-5 py-3 bg-muted/30 border-b"> <h2 className="font-semibold text-sm">Compras generadas</h2> </div> <div className="divide-y"> {oc.compras.map((c) => (
 <div key={c.id} className="flex items-center justify-between px-5 py-3"> <div> <Link href={`/compras/${c.id}`} className="font-medium hover:underline text-sm"> {c.numero}
 </Link> <p className="text-xs text-muted-foreground">{fmtDate(c.fechaFactura)}</p> </div> <div className="text-right"> <p className="font-mono text-sm font-semibold">RD$ {fmt(Number(c.total))}</p> <span className={`text-xs px-2 py-0.5 rounded-full ${
 c.estadoPago === "PAGADO" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800" }`}> {c.estadoPago === "PAGADO" ? "Pagada" : "Pendiente"}
 </span> </div> </div> ))}
 </div> </div> )}
 </div> );
}
