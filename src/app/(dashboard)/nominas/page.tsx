import Link from "next/link";
import { getNominas } from "@/actions/nominas";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NominaForm } from "@/components/nominas/nomina-form";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
 BORRADOR: "outline",
 PROCESADA: "secondary",
 PAGADA: "default",
};

const periodoLabel: Record<string, string> = {
 PRIMERA_QUINCENA: "1ra Quincena",
 SEGUNDA_QUINCENA: "2da Quincena",
};

const meses = ["", "Enero","Febrero","Marzo","Abril","Mayo","Junio",
 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function NominasPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const page = Number(params.page ?? 1);

 const { nominas, total, pages } = await getNominas(page);

 return (
 <div className="space-y-5"> <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold">Nóminas</h1> <p className="text-sm text-muted-foreground mt-0.5">{total} registros</p> </div> <Link
 href="/nominas/prestamos" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
 > Reporte de Préstamos
 </Link> </div> <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Crear nómina */}
 <Card className="lg:col-span-1"> <CardHeader className="pb-2"> <h2 className="font-semibold text-base">Crear nómina</h2> <p className="text-xs text-muted-foreground">Se calculan automáticamente TSS, AFP, SFS y SAM</p> </CardHeader> <CardContent> <NominaForm /> </CardContent> </Card> {/* Historial */}
 <div className="lg:col-span-2"> <Card> <CardContent className="px-0 pb-0"> {nominas.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground"> <div className="text-4xl mb-2"></div> <p>Sin nóminas creadas</p> </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Número</TableHead> <TableHead>Período</TableHead> <TableHead>Empleados</TableHead> <TableHead className="text-right">Total bruto</TableHead> <TableHead className="text-right">Total neto</TableHead> <TableHead>Estado</TableHead> <TableHead className="w-20">Acciones</TableHead> </TableRow> </TableHeader> <TableBody> {nominas.map((n) => (
 <TableRow key={n.id}> <TableCell className="font-mono text-xs">{n.numero}</TableCell> <TableCell className="text-sm"> {periodoLabel[n.periodo]} — {meses[n.mes]} {n.anio}
 </TableCell> <TableCell className="text-center">{n._count.empleados}</TableCell> <TableCell className="text-right">{fmt(n.totalBruto)}</TableCell> <TableCell className="text-right font-medium">{fmt(n.totalNeto)}</TableCell> <TableCell> <Badge variant={estadoVariant[n.estado]} className="text-xs"> {n.estado}
 </Badge> </TableCell> <TableCell> <Link href={`/nominas/${n.id}`}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}> Ver
 </Link> </TableCell> </TableRow> ))}
 </TableBody> </Table> )}
 </CardContent> </Card> {pages > 1 && (
 <div className="flex justify-center gap-2 mt-4"> {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
 <Link key={p} href={`/nominas?page=${p}`}
 className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}> {p}
 </Link> ))}
 </div> )}
 </div> </div> </div> );
}
