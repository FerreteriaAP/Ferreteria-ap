import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ q?: string; page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

function diasVencida(fecha: Date): number {
 return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

export default async function CxPPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const busqueda = params.q ?? "";
 const page = Number(params.page ?? 1);
 const pageSize = 30;
 const skip = (page - 1) * pageSize;

 const where: Prisma.CuentaPorPagarWhereInput = {
 estado: { not: "PAGADO" },
 ...(busqueda ? {
 OR: [
 { suplidor: { nombre: { contains: busqueda, mode: "insensitive" } } },
 { compra: { numero: { contains: busqueda, mode: "insensitive" } } },
 ],
 } : {}),
 };

 const [cxps, total] = await Promise.all([
 prisma.cuentaPorPagar.findMany({
 where,
 skip,
 take: pageSize,
 orderBy: { fechaVencimiento: "asc" },
 include: {
 suplidor: { select: { nombre: true } },
 compra: { select: { numero: true } },
 },
 }),
 prisma.cuentaPorPagar.count({ where }),
 ]);

 const pages = Math.ceil(total / pageSize);
 const totalSaldo = cxps.reduce((s, c) => s + Number(c.saldo), 0);

 const vencidas = cxps.filter((c) => diasVencida(c.fechaVencimiento) > 0);
 const totalVencido = vencidas.reduce((s, c) => s + Number(c.saldo), 0);

 return (
 <div className="space-y-5"> <div> <h1 className="text-2xl font-bold">Cuentas por Pagar</h1> <p className="text-sm text-muted-foreground mt-0.5"> {total} pendientes — Saldo: {fmt(totalSaldo)} — Vencido: <span className="text-destructive">{fmt(totalVencido)}</span> </p> </div> <Card> <CardHeader className="pb-3 pt-4 px-4"> <form method="GET"> <Input
 name="q" defaultValue={busqueda}
 placeholder="Buscar suplidor o número de compra..." className="max-w-sm" /> </form> </CardHeader> <CardContent className="px-0 pb-0"> {cxps.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground"> <div className="text-4xl mb-2"></div> <p className="font-medium">Sin cuentas pendientes por pagar</p> </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Compra</TableHead> <TableHead>Suplidor</TableHead> <TableHead>Vencimiento</TableHead> <TableHead>Días vencida</TableHead> <TableHead className="text-right">Monto</TableHead> <TableHead className="text-right">Pagado</TableHead> <TableHead className="text-right">Saldo</TableHead> <TableHead>Estado</TableHead> </TableRow> </TableHeader> <TableBody> {cxps.map((c) => {
 const dias = diasVencida(c.fechaVencimiento);
 return (
 <TableRow key={c.id}> <TableCell className="font-mono text-xs"> <Link href={`/compras/${c.compraId}`} className="hover:underline font-medium"> {c.compra.numero}
 </Link> </TableCell> <TableCell className="text-sm">{c.suplidor.nombre}</TableCell> <TableCell className="text-sm"> {new Date(c.fechaVencimiento).toLocaleDateString("es-DO")}
 </TableCell> <TableCell> {dias > 0 ? (
 <span className={dias > 30 ? "text-destructive font-medium" : "text-orange-600"}> {dias} días
 </span> ) : (
 <span className="text-muted-foreground">Al día</span> )}
 </TableCell> <TableCell className="text-right">{fmt(c.monto)}</TableCell> <TableCell className="text-right">{fmt(c.montoPagado)}</TableCell> <TableCell className="text-right font-medium">{fmt(c.saldo)}</TableCell> <TableCell> <Badge variant={dias > 0 ? "destructive" : "outline"} className="text-xs"> {dias > 0 ? `Vencida` : "Al día"}
 </Badge> </TableCell> </TableRow> );
 })}
 </TableBody> </Table> )}
 </CardContent> </Card> {pages > 1 && (
 <div className="flex justify-center gap-2"> {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
 <Link key={p} href={`/cxp?q=${busqueda}&page=${p}`}
 className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}> {p}
 </Link> ))}
 </div> )}
 </div> );
}
