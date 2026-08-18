import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCompra } from "@/actions/compras";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { eliminarCompra } from "@/actions/compras";
import { cn } from "@/lib/utils";

interface PageProps {
 params: Promise<{ id: string }>;
 searchParams: Promise<{ from?: string }>;
}

const estadoVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
 PENDIENTE: "destructive",
 PAGADO_PARCIAL: "secondary",
 PAGADO: "outline",
};

const estadoLabel: Record<string, string> = {
 PENDIENTE: "Pendiente", PAGADO_PARCIAL: "Pago parcial", PAGADO: "Pagado",
};

export default async function CompraPage({ params, searchParams }: PageProps) {
 const { id } = await params;
 const { from } = await searchParams;
 const compra = await getCompra(id);
 if (!compra) notFound();

 const session = await auth();
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const rolUsuario = ((session?.user) as any)?.rol ?? "";

 const formatDOP = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

 const totalPagado = compra.pagos.reduce((s, p) => s + Number(p.monto), 0);
 const saldo = Number(compra.total) - totalPagado;

 return (
 <div className="space-y-5 max-w-5xl"> <Breadcrumb> <BreadcrumbList> {from === "cxp" ? (
 <> <BreadcrumbItem><BreadcrumbLink href="/contabilidad">Contabilidad</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbLink href="/contabilidad/cxp">Cuentas por Pagar</BreadcrumbLink></BreadcrumbItem> </> ) : (
 <BreadcrumbItem><BreadcrumbLink href="/compras">Compras</BreadcrumbLink></BreadcrumbItem> )}
 <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>{compra.numero}</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> {/* Header */}
 <div className="flex items-start justify-between"> <div className="space-y-1"> <div className="flex items-center gap-2"> <h1 className="text-2xl font-bold">{compra.numero}</h1> <Badge variant={estadoVariant[compra.estadoPago]}> {estadoLabel[compra.estadoPago] ?? compra.estadoPago}
 </Badge> </div> <p className="text-sm text-muted-foreground"> {compra.suplidor.nombre}
 {compra.noFacturaSuplidor ? ` — Factura: ${compra.noFacturaSuplidor}` : ""}
 </p> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Datos de la compra</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <Row label="Suplidor" value={compra.suplidor.nombre} /> <Row label="Fecha" value={new Date(compra.fechaFactura).toLocaleDateString("es-DO")} /> <Row label="Vencimiento" value={compra.fechaVencimiento ? new Date(compra.fechaVencimiento).toLocaleDateString("es-DO") : "—"} /> <Separator className="my-1" /> <Row label="Subtotal" value={formatDOP(compra.subtotal)} /> <Row label="ITBIS" value={formatDOP(compra.itbis)} /> <Row label="Total" value={formatDOP(compra.total)} bold /> <Row label="Pagado" value={formatDOP(totalPagado)} /> <Row label="Saldo" value={formatDOP(saldo)} bold={saldo > 0} /> </CardContent> </Card> </div> {/* Detalles */}
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Productos comprados</CardTitle></CardHeader> <CardContent className="px-0 pb-0"> <Table> <TableHeader> <TableRow> <TableHead>Código</TableHead> <TableHead>Producto</TableHead> <TableHead className="text-right">Cantidad</TableHead> <TableHead className="text-right">Costo unit.</TableHead> <TableHead className="text-right">ITBIS</TableHead> <TableHead className="text-right">Subtotal</TableHead> </TableRow> </TableHeader> <TableBody> {compra.detalles.map((d) => (
 <TableRow key={d.id}> <TableCell className="font-mono text-xs">{d.producto.codigo}</TableCell> <TableCell> <Link href={`/productos/${d.producto.id}`} className="hover:underline"> {d.producto.nombre}
 </Link> {d.costoAnterior && Number(d.costoAnterior) !== Number(d.costo) && (
 <Badge variant="destructive" className="ml-2 text-xs"> Antes: {formatDOP(d.costoAnterior)}
 </Badge> )}
 </TableCell> <TableCell className="text-right">{Number(d.cantidad).toLocaleString("es-DO")}</TableCell> <TableCell className="text-right">{formatDOP(d.costo)}</TableCell> <TableCell className="text-right">{formatDOP(d.itbis)}</TableCell> <TableCell className="text-right font-medium">{formatDOP(d.subtotal)}</TableCell> </TableRow> ))}
 </TableBody> </Table> </CardContent> </Card> {/* Pagos */}
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Historial de pagos</CardTitle></CardHeader> <CardContent> {compra.pagos.length === 0 ? (
 <p className="text-sm text-muted-foreground">Sin pagos registrados</p> ) : (
 <div className="space-y-2"> {compra.pagos.map((p) => (
 <div key={p.id} className="flex justify-between items-center text-sm border rounded p-2"> <div> <span className="font-medium">{formatDOP(p.monto)}</span> <span className="text-muted-foreground ml-2">{p.metodo}</span> {p.referencia && <span className="text-xs text-muted-foreground ml-1">({p.referencia})</span>}
 </div> <span className="text-xs text-muted-foreground"> {new Date(p.fecha).toLocaleDateString("es-DO")}
 </span> </div> ))}
 </div> )}
 </CardContent> </Card> {/* Eliminar compra — solo si no tiene pagos y solo ADMINISTRADOR */}
 {rolUsuario === "ADMINISTRADOR" && compra.pagos.length === 0 && (
 <div className="flex justify-end"> <BtnEliminarDocumento
 id={id}
 documento={compra.numero}
 accion={eliminarCompra}
 label=" Eliminar compra" variant="ghost" /> </div> )}
 </div> );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
 return (
 <div className="flex justify-between"> <span className="text-muted-foreground">{label}</span> <span className={bold ? "font-bold" : ""}>{value}</span> </div> );
}
