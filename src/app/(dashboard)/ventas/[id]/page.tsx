import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getVenta } from "@/actions/ventas";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AvanzarVentaButtons } from "@/components/ventas/avanzar-venta-buttons";
import { RecalcularKolmenBtn } from "@/components/ventas/recalcular-kolmen-btn";
import { ConduceDespachoBtn, NuevoConduceBtn } from "@/components/caja/conduce-despacho-btn";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { eliminarVenta } from "@/actions/ventas";
import { cn } from "@/lib/utils";

interface PageProps {
 params: Promise<{ id: string }>;
 searchParams: Promise<{ from?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtDOP = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const tipoLabel: Record<string, string> = {
 COTIZACION: "Cotización", ORDEN_VENTA: "Orden de Venta",
 CONDUCE: "Conduce", FACTURADA: "Factura", CANCELADA: "Cancelada",
};
const tipoVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
 COTIZACION: "outline", ORDEN_VENTA: "secondary",
 CONDUCE: "default", FACTURADA: "default", CANCELADA: "destructive",
};
const credLabel: Record<string, string> = {
 CONTADO: "Contado", DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días",
};

const PASOS = ["COTIZACION", "ORDEN_VENTA", "CONDUCE", "FACTURADA"];

function WorkflowStepper({ tipo }: { tipo: string }) {
 const cancelada = tipo === "CANCELADA";
 return (
 <div className="flex items-center gap-0 text-xs"> {PASOS.map((paso, i) => {
 const done = PASOS.indexOf(tipo) > i || tipo === paso;
 const current = tipo === paso;
 return (
 <div key={paso} className="flex items-center"> <div className={cn(
 "px-3 py-1 rounded-full border text-xs font-medium whitespace-nowrap",
 cancelada ? "border-destructive/30 text-destructive/50" :
 current ? "bg-primary text-primary-foreground border-primary" :
 done ? "bg-primary/10 text-primary border-primary/30" :
 "border-muted text-muted-foreground" )}> {i + 1}. {tipoLabel[paso]}
 </div> {i < PASOS.length - 1 && (
 <div className={cn("h-px w-4 sm:w-8", done && !cancelada ? "bg-primary/40" : "bg-muted")} /> )}
 </div> );
 })}
 </div> );
}

// Determina la ruta de impresión según el tipo del documento
function printHref(tipo: string, id: string): string {
 if (tipo === "COTIZACION") return `/ventas/${id}/imprimir/cotizacion`;
 if (tipo === "ORDEN_VENTA") return `/ventas/${id}/imprimir/cotizacion`; // usa misma plantilla
 if (tipo === "CONDUCE") return `/ventas/${id}/imprimir/conduce`;
 if (tipo === "FACTURADA") return `/ventas/${id}/imprimir/factura`;
 return "#";
}

export default async function VentaPage({ params, searchParams }: PageProps) {
 const { id } = await params;
 const { from } = await searchParams;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const venta = (await getVenta(id)) as any;
 if (!venta) notFound();

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const totalPagado = venta.pagosRecibidos.reduce((s: number, p: any) => s + Number(p.monto), 0);
 const saldo = Number(venta.total) - totalPagado;

 // Datos del conduce más reciente (si existe)
 const ultimoConduce = venta.conduces?.[0] ?? null;
 const conduceId = ultimoConduce?.id ?? undefined;
 const conduceRecibido = ultimoConduce?.clienteRecibio ?? false;

 // Rol del usuario para controlar acciones restringidas
 const session = await auth();
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const rolUsuario = ((session?.user) as any)?.rol ?? "";

 // Todos los conduces entregados — se usa para ocultar los botones "Nuevo conduce" // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const todosEntregados = venta.conduces.length > 0 &&
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 venta.conduces.every((c: any) => c.clienteRecibio);

 // Items para el selector de conduce parcial
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const detallesParaConduce = venta.detalles.map((d: any) => ({
 productoId: d.productoId,
 nombre: d.descripcion || d.producto.nombre,
 unidad: d.unidad ?? d.producto.unidadMedida ?? "",
 cantidad: Number(d.cantidad),
 }));

 return (
 <div className="space-y-5 max-w-5xl"> <Breadcrumb> <BreadcrumbList> {from === "cxc" ? (
 <> <BreadcrumbItem><BreadcrumbLink href="/contabilidad">Contabilidad</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbLink href="/contabilidad/cxc">Cuentas por Cobrar</BreadcrumbLink></BreadcrumbItem> </> ) : (
 <BreadcrumbItem><BreadcrumbLink href="/ventas">Ventas</BreadcrumbLink></BreadcrumbItem> )}
 <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>{venta.numero}</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> {/* Encabezado */}
 <div className="flex items-start justify-between gap-4 flex-wrap"> <div className="space-y-2"> <div className="flex items-center gap-2 flex-wrap"> <h1 className="text-2xl font-bold">{venta.numero}</h1> <Badge variant={tipoVariant[venta.tipo]}>{tipoLabel[venta.tipo] ?? venta.tipo}</Badge> </div> <WorkflowStepper tipo={venta.tipo} /> </div> <div className="flex items-center gap-2 flex-wrap justify-end"> {/* Botón imprimir documento actual */}
 {venta.tipo !== "CANCELADA" && (
 <Link
 href={printHref(venta.tipo, id)}
 target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5")}
 > Imprimir {tipoLabel[venta.tipo]}
 </Link> )}
 {/* Reimprimir etapas anteriores */}
 {["ORDEN_VENTA","CONDUCE","FACTURADA"].includes(venta.tipo) && (
 <Link
 href={`/ventas/${id}/imprimir/cotizacion`}
 target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 text-xs")}
 > Cotización
 </Link> )}
 {["CONDUCE","FACTURADA"].includes(venta.tipo) && (
 <Link
 href={`/ventas/${id}/imprimir/conduce`}
 target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 text-xs")}
 > Conduce
 </Link> )}
 {/* Recalcular precios Kolmen */}
 {venta.cliente.reglaPrecio === "MARGEN_COSTO" &&
 !["FACTURADA", "CANCELADA"].includes(venta.tipo) && (
 <RecalcularKolmenBtn
 ventaId={id}
 margen={Number(venta.cliente.margenPrecio ?? 15)}
 /> )}
 <Link href="/ventas/nueva" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}> + Nueva cotización
 </Link> </div> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Columna principal */}
 <div className="md:col-span-2 space-y-4"> {/* Datos del documento */}
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Datos del documento</CardTitle></CardHeader> <CardContent className="grid grid-cols-2 gap-y-2 text-sm"> <span className="text-muted-foreground">Cliente</span> <div className="flex items-center gap-2"> <Link href={`/contactos/${venta.cliente.id}`} className="hover:underline font-medium"> {venta.cliente.nombre}
 </Link> {venta.cliente.reglaPrecio === "MARGEN_COSTO" && (
 <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300/50"> precio especial
 </span> )}
 </div> {venta.cliente.rnc && <> <span className="text-muted-foreground">RNC</span> <span>{venta.cliente.rnc}</span> </>}
 <span className="text-muted-foreground">Crédito</span> <span>{credLabel[venta.credito] ?? venta.credito}</span> <span className="text-muted-foreground">Fecha emisión</span> <span>{new Date(venta.fechaEmision).toLocaleDateString("es-DO")}</span> {venta.fechaVencimiento && <> <span className="text-muted-foreground">Vencimiento</span> <span>{new Date(venta.fechaVencimiento).toLocaleDateString("es-DO")}</span> </>}
 {venta.ncf && <> <span className="text-muted-foreground">NCF</span> <span className="font-mono">{venta.ncf} ({venta.tipoNcf})</span> </>}
 {venta.notas && <> <span className="text-muted-foreground">Notas</span> <span className="text-xs">{venta.notas}</span> </>}
 </CardContent> </Card> {/* Productos */}
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Productos</CardTitle></CardHeader> <CardContent className="px-0 pb-0"> <Table> <TableHeader> <TableRow> <TableHead>Código</TableHead> <TableHead>Producto</TableHead> <TableHead className="text-right">Cant.</TableHead> <TableHead className="text-right">Precio</TableHead> <TableHead className="text-right">Dscto</TableHead> <TableHead className="text-right">ITBIS</TableHead> <TableHead className="text-right">Subtotal</TableHead> </TableRow> </TableHeader> <TableBody> {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {venta.detalles.map((d: any) => (
 <TableRow key={d.id}> <TableCell className="font-mono text-xs">{d.producto.codigo}</TableCell> <TableCell> <Link href={`/productos/${d.productoId}`} className="hover:underline"> {d.descripcion || d.producto.nombre}
 </Link> <div className="text-xs text-muted-foreground">{d.producto.unidadMedida}</div> </TableCell> <TableCell className="text-right tabular-nums"> {Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </TableCell> <TableCell className="text-right tabular-nums">{fmtDOP(d.precio)}</TableCell> <TableCell className="text-right"> {Number(d.descuento) > 0 ? `${Number(d.descuento)}%` : "—"}
 </TableCell> <TableCell className="text-right tabular-nums">{fmtDOP(d.itbis)}</TableCell> <TableCell className="text-right font-medium tabular-nums">{fmtDOP(d.subtotal)}</TableCell> </TableRow> ))}
 </TableBody> </Table> <div className="px-4 py-3 space-y-1 text-sm"> <div className="flex justify-between"> <span className="text-muted-foreground">Subtotal</span> <span className="tabular-nums">{fmtDOP(venta.subtotal)}</span> </div> {Number(venta.descuento) > 0 && (
 <div className="flex justify-between text-destructive"> <span>Descuento</span> <span className="tabular-nums">- {fmtDOP(venta.descuento)}</span> </div> )}
 <div className="flex justify-between"> <span className="text-muted-foreground">ITBIS</span> <span className="tabular-nums">{fmtDOP(venta.itbis)}</span> </div> <Separator /> <div className="flex justify-between font-bold text-base"> <span>Total</span> <span className="tabular-nums">{fmtDOP(venta.total)}</span> </div> </div> </CardContent> </Card> {/* Conduces de despacho — solo para FACTURADA */}
 {venta.tipo === "FACTURADA" && (
 <Card> <CardHeader> <div className="flex items-center justify-between flex-wrap gap-2"> <CardTitle className="text-sm text-muted-foreground">Conduces de despacho</CardTitle> {!todosEntregados && (
 <NuevoConduceBtn ventaId={id} detalles={detallesParaConduce} conduces={venta.conduces} /> )}
 </div> </CardHeader> <CardContent> {venta.conduces.length === 0 ? (
 <p className="text-sm text-muted-foreground">Sin conduces generados. Usa los botones de arriba para crear uno.</p> ) : (
 <div className="space-y-2"> {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {venta.conduces.map((c: any) => (
 <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0 flex-wrap gap-2"> <div className="flex items-center gap-2 flex-wrap"> <span className="font-mono font-medium">{c.numero}</span> <span className="text-xs text-muted-foreground"> {new Date(c.fechaEmision).toLocaleDateString("es-DO")}
 </span> {/* Link de impresión SIEMPRE visible — independiente del estado de entrega */}
 <Link
 href={`/ventas/${id}/imprimir/conduce?conduceId=${c.id}`}
 target="_blank" className="text-xs text-primary hover:underline font-medium" > Imprimir
 </Link> </div> <ConduceDespachoBtn
 ventaId={id}
 conduceId={c.id}
 entregado={c.clienteRecibio}
 variant="card" /> </div> ))}
 </div> )}
 </CardContent> </Card> )}

 {/* Conduces del flujo normal (ORDEN_VENTA  CONDUCE) */}
 {venta.tipo !== "FACTURADA" && venta.conduces.length > 0 && (
 <Card> <CardHeader> <div className="flex items-center justify-between flex-wrap gap-2"> <CardTitle className="text-sm text-muted-foreground">Conduces</CardTitle> {/* Permitir conduces adicionales (p.ej. 2do viaje) en estado CONDUCE */}
 {venta.tipo === "CONDUCE" && !todosEntregados && (
 <NuevoConduceBtn ventaId={id} detalles={detallesParaConduce} conduces={venta.conduces} /> )}
 </div> </CardHeader> <CardContent className="space-y-2"> {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {venta.conduces.map((c: any) => (
 <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"> <div> <span className="font-mono font-medium">{c.numero}</span> {c.firmaChofer && (
 <span className="text-xs text-muted-foreground ml-2">Chofer: {c.firmaChofer}</span> )}
 {c.clienteRecibio ? (
 <span className="ml-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5"> Recibido {c.fechaRecepcion ? new Date(c.fechaRecepcion).toLocaleDateString("es-DO") : ""}
 </span> ) : (
 <span className="ml-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">  Pendiente recepción
 </span> )}
 </div> <div className="flex items-center gap-2"> <span className="text-xs text-muted-foreground"> {new Date(c.fechaEmision).toLocaleDateString("es-DO")}
 </span> <Link
 href={`/ventas/${id}/imprimir/conduce?conduceId=${c.id}`}
 target="_blank" className="text-xs text-primary hover:underline" > Imprimir
 </Link> </div> </div> ))}
 </CardContent> </Card> )}

 {/* Pagos */}
 {venta.pagosRecibidos.length > 0 && (
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Pagos recibidos</CardTitle></CardHeader> <CardContent> {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {venta.pagosRecibidos.map((p: any) => (
 <div key={p.id} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0"> <div> <span className="font-medium tabular-nums">{fmtDOP(p.monto)}</span> <span className="text-muted-foreground ml-2 text-xs">{p.metodo}</span> {p.referencia && <span className="text-xs text-muted-foreground ml-1">({p.referencia})</span>}
 </div> <span className="text-xs text-muted-foreground"> {new Date(p.fecha).toLocaleDateString("es-DO")}
 </span> </div> ))}
 <div className="pt-2 flex justify-between text-sm font-medium"> <span>Saldo pendiente</span> <span className={cn("tabular-nums", saldo > 0 ? "text-destructive" : "text-green-600")}> {fmtDOP(saldo)}
 </span> </div> </CardContent> </Card> )}
 </div> {/* Panel lateral */}
 <div className="space-y-4"> {/* Acciones del flujo */}
 {venta.tipo !== "CANCELADA" && venta.tipo !== "FACTURADA" && (
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Acciones</CardTitle></CardHeader> <CardContent> <AvanzarVentaButtons
 ventaId={id}
 tipo={venta.tipo}
 conduceId={conduceId}
 conduceRecibido={conduceRecibido}
 detalles={venta.detalles.map((d: any) => ({
 productoId: d.productoId,
 nombre: d.descripcion || d.producto.nombre,
 unidad: d.unidad ?? d.producto.unidadMedida,
 cantidad: Number(d.cantidad),
 }))}
 /> </CardContent> </Card> )}

 {/* Eliminar — solo cotizaciones/órdenes sin pagos, y solo ADMINISTRADOR */}
 {rolUsuario === "ADMINISTRADOR" && (venta.tipo === "COTIZACION" || venta.tipo === "ORDEN_VENTA") && (
 <div className="flex justify-end"> <BtnEliminarDocumento
 id={id}
 documento={venta.numero}
 accion={eliminarVenta}
 label=" Eliminar documento" variant="ghost" /> </div> )}
 </div> </div> </div> );
}
