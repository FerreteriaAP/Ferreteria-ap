import { notFound } from "next/navigation";
import Link from "next/link";
import { getProducto } from "@/actions/productos";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface PageProps {
 params: Promise<{ id: string }>;
}


export default async function ProductoPage({ params }: PageProps) {
 const { id } = await params;
 const producto = await getProducto(id);

 if (!producto) notFound();

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const formatDOP = (n: any) => n !== null && n !== undefined ? `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}` : "—";

 const stockBajo =
 Number(producto.stockMinimo) > 0 &&
 Number(producto.stockActual) <= Number(producto.stockMinimo);

 const margen =
 Number(producto.costoUltimo) > 0
 ? (((Number(producto.precioVenta) - Number(producto.costoUltimo)) / Number(producto.costoUltimo)) * 100).toFixed(1)
 : null;

 return (
 <div className="space-y-5 max-w-5xl"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/productos">Productos</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>{producto.nombre}</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> {/* Header */}
 <div className="flex items-start justify-between"> <div className="space-y-1"> <div className="flex items-center gap-2 flex-wrap"> <h1 className="text-2xl font-bold">{producto.nombre}</h1> <Badge variant="secondary" className="font-mono">{producto.categoria.codigo}</Badge> {producto.esFraccionable && <Badge variant="outline">Fraccionable</Badge>}
 {!producto.activo && <Badge variant="destructive">Inactivo</Badge>}
 {stockBajo && <Badge variant="destructive"> Stock bajo</Badge>}
 </div> <p className="text-sm text-muted-foreground font-mono">{producto.codigo}</p> {producto.codigoBarras && (
 <p className="text-xs text-muted-foreground">Barras: {producto.codigoBarras}</p> )}
 </div> <Link href={`/productos/${id}/editar`} className={buttonVariants({ variant: "outline" })}> Editar
 </Link> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Stock */}
 <Card className={cn(stockBajo && "border-destructive/50")}> <CardHeader><CardTitle className="text-sm text-muted-foreground">Inventario</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <div className="flex justify-between"> <span className="text-muted-foreground">Stock actual</span> <span className={cn("font-bold text-lg", stockBajo ? "text-destructive" : "text-foreground")}> {Number(producto.stockActual).toLocaleString("es-DO")} {producto.unidadMedida}
 </span> </div> <div className="flex justify-between"> <span className="text-muted-foreground">Stock mínimo</span> <span>{Number(producto.stockMinimo).toLocaleString("es-DO")}</span> </div> {producto.stockMaximo && (
 <div className="flex justify-between"> <span className="text-muted-foreground">Stock máximo</span> <span>{Number(producto.stockMaximo).toLocaleString("es-DO")}</span> </div> )}
 {producto.esFraccionable && producto.unidadFraccion && (
 <div className="flex justify-between"> <span className="text-muted-foreground">Fracción</span> <span>{producto.factorFraccion?.toString()} {producto.unidadFraccion}</span> </div> )}
 </CardContent> </Card> {/* Precios */}
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Precios</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <div className="flex justify-between"> <span className="text-muted-foreground">Costo</span> <span>{formatDOP(producto.costoUltimo)}</span> </div> <div className="flex justify-between"> <span className="text-muted-foreground">% Ganancia</span> <span>{Number(producto.porcentajeGanancia)}%{margen ? ` (real: ${margen}%)` : ""}</span> </div> <div className="flex justify-between"> <span className="text-muted-foreground">Precio venta</span> <span className="font-bold">{formatDOP(producto.precioVenta)}</span> </div> {producto.precioMayoreo && (
 <div className="flex justify-between"> <span className="text-muted-foreground">Precio mayoreo</span> <span>{formatDOP(producto.precioMayoreo)}</span> </div> )}
 <div className="flex justify-between"> <span className="text-muted-foreground">Costo promedio</span> <span className="text-muted-foreground">{formatDOP(producto.costoPromedio)}</span> </div> </CardContent> </Card> {/* Info */}
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Categoría</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <div className="flex justify-between"> <span className="text-muted-foreground">Categoría</span> <span>{producto.categoria.nombre}</span> </div> <div className="flex justify-between"> <span className="text-muted-foreground">Unidad</span> <span>{producto.unidadMedida}</span> </div> {producto.descripcion && (
 <p className="text-muted-foreground text-xs mt-2 whitespace-pre-line">{producto.descripcion}</p> )}
 </CardContent> </Card> </div> {/* Accesos rápidos a históricos */}
 <div className="flex gap-3 flex-wrap"> <Link
 href={`/productos/${id}/movimientos`}
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card hover:bg-accent transition-colors text-sm font-medium" > Ver movimientos de inventario
 {producto.movimientos.length > 0 && (
 <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"> {producto.movimientos.length}+
 </span> )}
 </Link> <Link
 href={`/productos/${id}/compras`}
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card hover:bg-accent transition-colors text-sm font-medium" > Historial de compras
 </Link> </div> </div> );
}
