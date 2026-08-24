import Link from "next/link";
import { getCxC } from "@/actions/ventas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ q?: string; bucket?: string; page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

function diasVencida(fecha: Date): number {
 return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

function bucketLabel(days: number): string {
 if (days <= 0) return "Al día";
 if (days <= 30) return "Vencida 0-30d";
 if (days <= 60) return "Vencida 31-60d";
 if (days <= 90) return "Vencida 61-90d";
 return "Vencida +90d";
}

function bucketVariant(days: number): "default" | "secondary" | "outline" | "destructive" {
 if (days <= 0) return "outline";
 return "destructive";
}

export default async function CxCPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const busqueda = params.q ?? "";
 const bucket = params.bucket ?? "";
 const page = Number(params.page ?? 1);

 const { cxcs, total, pages, buckets } = await getCxC({ busqueda, bucket, page });

 const bucketTabs = [
 { key: "", label: "Todos" },
 { key: "0-30", label: "0-30 días" },
 { key: "31-60", label: "31-60 días" },
 { key: "61-90", label: "61-90 días" },
 { key: "90+", label: "+90 días" },
 ];

 const totalGeneral = buckets.b0 + buckets.b30 + buckets.b60 + buckets.b90 + buckets.b90p;

 return (
 <div className="space-y-5"> <div> <h1 className="text-2xl font-bold">Cuentas por Cobrar</h1> <p className="text-sm text-muted-foreground mt-0.5">Saldo total: {fmt(totalGeneral)}</p> </div> {/* Buckets de aging */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3"> {[
 { label: "Al día", value: buckets.b0, color: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" },
 { label: "0-30 días", value: buckets.b30, color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400" },
 { label: "31-60 días", value: buckets.b60, color: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400" },
 { label: "61-90 días", value: buckets.b90, color: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400" },
 { label: "+90 días", value: buckets.b90p, color: "bg-red-900/10 border-red-900/30 text-red-900 dark:text-red-300" },
 ].map((b) => (
 <Card key={b.label} className={cn("border", b.color)}> <CardContent className="pt-4 pb-3"> <p className="text-xs font-medium">{b.label}</p> <p className="text-lg font-bold mt-1">{fmt(b.value)}</p> </CardContent> </Card> ))}
 </div> <Card> <CardHeader className="pb-3 pt-4 px-4"> <div className="flex flex-col sm:flex-row gap-3"> <form method="GET" className="flex-1"> <Input
 name="q" defaultValue={busqueda}
 placeholder="Buscar cliente o número de factura..." className="max-w-sm" /> </form> <div className="flex flex-wrap gap-1"> {bucketTabs.map((t) => (
 <Link
 key={t.key}
 href={`/cxc?bucket=${t.key}&q=${busqueda}`}
 className={cn(
 buttonVariants({ variant: bucket === t.key ? "default" : "outline", size: "sm" })
 )}
 > {t.label}
 </Link> ))}
 </div> </div> </CardHeader> <CardContent className="px-0 pb-0"> {cxcs.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground"> <div className="text-4xl mb-2"></div> <p className="font-medium">Sin cuentas pendientes</p> </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Factura</TableHead> <TableHead>Cliente</TableHead> <TableHead>Vencimiento</TableHead> <TableHead>Vencida (días)</TableHead> <TableHead className="text-right">Monto</TableHead> <TableHead className="text-right">Pagado</TableHead> <TableHead className="text-right">Saldo</TableHead> <TableHead>Estado</TableHead> </TableRow> </TableHeader> <TableBody> {cxcs.map((c) => {
 const dias = diasVencida(c.fechaVencimiento);
 return (
 <TableRow key={c.id}> <TableCell className="font-mono text-xs"> <Link href={`/ventas/${c.ventaId}`} className="hover:underline font-medium"> {c.venta.numero}
 </Link> </TableCell> <TableCell className="text-sm">{c.cliente.nombre}</TableCell> <TableCell className="text-sm"> {new Date(c.fechaVencimiento).toLocaleDateString("es-DO")}
 </TableCell> <TableCell className="text-sm"> {dias > 0 ? (
 <span className={dias > 60 ? "text-destructive font-medium" : dias > 30 ? "text-orange-600" : "text-yellow-600"}> {dias} días
 </span> ) : (
 <span className="text-muted-foreground">Al día</span> )}
 </TableCell> <TableCell className="text-right">{fmt(c.monto)}</TableCell> <TableCell className="text-right">{fmt(c.montoPagado)}</TableCell> <TableCell className="text-right font-medium">{fmt(c.saldo)}</TableCell> <TableCell> <Badge variant={bucketVariant(dias)} className="text-xs"> {bucketLabel(dias)}
 </Badge> </TableCell> </TableRow> );
 })}
 </TableBody> </Table> )}
 </CardContent> </Card> {pages > 1 && (
 <div className="flex justify-center gap-2"> {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
 <Link
 key={p}
 href={`/cxc?bucket=${bucket}&q=${busqueda}&page=${p}`}
 className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
 > {p}
 </Link> ))}
 </div> )}
 </div> );
}
