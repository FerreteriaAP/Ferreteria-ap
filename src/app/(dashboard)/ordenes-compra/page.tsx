import Link from "next/link";
import { getOrdenesCompra } from "@/actions/ordenes-compra";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const fmt = (n: unknown) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
 BORRADOR: { label: "Borrador", className: "bg-muted text-muted-foreground" },
 ENVIADA: { label: "Enviada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
 RECIBIDA_PARCIAL: { label: "Recibida parcial", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
 RECIBIDA: { label: "Recibida", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
 CANCELADA: { label: "Cancelada", className: "bg-destructive/10 text-destructive" },
};

export default async function OrdenesCompraPage({
 searchParams,
}: {
 searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}) {
 const sp = await searchParams;
 const busqueda = sp.q ?? "";
 const estado = sp.estado ?? "";
 const page = Number(sp.page ?? "1");

 const { ordenes, total, pages } = await getOrdenesCompra({ busqueda, estado, page });

 return (
 <div className="space-y-5"> {/* Encabezado */}
 <div className="flex items-center justify-between gap-4"> <div> <h1 className="text-2xl font-bold">Órdenes de compra</h1> <p className="text-sm text-muted-foreground mt-0.5">{total} órdenes registradas</p> </div> <Link
 href="/ordenes-compra/nueva" className={cn(buttonVariants())}
 > + Nueva orden
 </Link> </div> {/* Filtros */}
 <form method="get" className="flex flex-wrap gap-2"> <input
 name="q" defaultValue={busqueda}
 placeholder="Buscar por número o suplidor..." className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm w-64" /> <select
 name="estado" defaultValue={estado}
 className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm" > <option value="">Todos los estados</option> {Object.entries(ESTADO_LABELS).map(([v, { label }]) => (
 <option key={v} value={v}>{label}</option> ))}
 </select> <button
 type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
 > Filtrar
 </button> {(busqueda || estado) && (
 <Link href="/ordenes-compra" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9")}> Limpiar
 </Link> )}
 </form> {/* Tabla */}
 <Card> <CardContent className="px-0 pb-0"> {ordenes.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground"> <p className="text-3xl mb-2"></p> <p className="font-medium"> {busqueda || estado ? "Sin resultados" : "Sin órdenes de compra"}
 </p> <p className="text-sm mt-1"> {busqueda || estado
 ? "Intenta ajustar los filtros" : "Crea tu primera orden de compra para empezar"}
 </p> {!busqueda && !estado && (
 <Link href="/ordenes-compra/nueva" className={cn(buttonVariants(), "mt-4")}> + Nueva orden
 </Link> )}
 </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Número</TableHead> <TableHead>Suplidor</TableHead> <TableHead>Estado</TableHead> <TableHead className="text-right">Total</TableHead> <TableHead className="text-center">Artículos</TableHead> <TableHead className="text-center">Compras</TableHead> <TableHead>Fecha</TableHead> <TableHead /> </TableRow> </TableHeader> <TableBody> {ordenes.map((o) => {
 const badge = ESTADO_LABELS[o.estado] ?? { label: o.estado, className: "bg-muted text-muted-foreground" };
 return (
 <TableRow key={o.id}> <TableCell className="font-mono text-xs">{o.numero}</TableCell> <TableCell className="font-medium">{o.suplidor?.nombre ?? "—"}</TableCell> <TableCell> <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}> {badge.label}
 </span> </TableCell> <TableCell className="text-right font-medium font-mono text-sm">{fmt(o.total)}</TableCell> <TableCell className="text-center"> <Badge variant="secondary">{o._count.detalles}</Badge> </TableCell> <TableCell className="text-center"> {o._count.compras > 0
 ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{o._count.compras}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
 </TableCell> <TableCell className="text-sm text-muted-foreground"> {new Date(o.createdAt).toLocaleDateString("es-DO")}
 </TableCell> <TableCell> <Link
 href={`/ordenes-compra/${o.id}`}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
 > Ver 
 </Link> </TableCell> </TableRow> );
 })}
 </TableBody> </Table> )}
 </CardContent> </Card> {/* Paginación */}
 {pages > 1 && (
 <div className="flex items-center justify-center gap-2"> {page > 1 && (
 <Link
 href={`/ordenes-compra?q=${busqueda}&estado=${estado}&page=${page - 1}`}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
 >  Anterior
 </Link> )}
 <span className="text-sm text-muted-foreground">Página {page} de {pages}</span> {page < pages && (
 <Link
 href={`/ordenes-compra?q=${busqueda}&estado=${estado}&page=${page + 1}`}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
 > Siguiente 
 </Link> )}
 </div> )}
 </div> );
}
