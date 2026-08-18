import Link from "next/link";
import { getCuentas, getTransacciones } from "@/actions/bancos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransaccionForm } from "@/components/bancos/transaccion-form";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ cuentaId?: string; mes?: string; q?: string; page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const tipoColors: Record<string, string> = {
 DEPOSITO: "text-green-600",
 TRANSFERENCIA: "text-blue-600",
 RETIRO: "text-red-600",
 CHEQUE: "text-orange-600",
 DEBITO_AUTOMATICO: "text-red-600",
};

export default async function BancosPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const cuentaId = params.cuentaId ?? "";
 const mes = params.mes ?? "";
 const busqueda = params.q ?? "";
 const page = Number(params.page ?? 1);

 const [cuentas, { transacciones, total, pages }] = await Promise.all([
 getCuentas(),
 getTransacciones({ cuentaId: cuentaId || undefined, mes: mes || undefined, busqueda, page }),
 ]);

 // getCuentas() ya retorna datos planos (saldo: number), sin Decimal de Prisma
 const totalSaldo = cuentas.reduce((s, c) => s + c.saldo, 0);

 return (
 <div className="space-y-5"> <div> <h1 className="text-2xl font-bold">Bancos</h1> <p className="text-sm text-muted-foreground mt-0.5">Saldo total: {fmt(totalSaldo)}</p> </div> {/* Cuentas */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> {cuentas.map((c) => (
 <Card key={c.id}> <CardContent className="pt-4 pb-3"> <div className="flex justify-between items-start"> <div> <p className="font-semibold">{c.banco}</p> <p className="text-xs text-muted-foreground">{c.nombre} — {c.tipo}</p> </div> <div className="text-right"> <p className="text-xl font-bold">{fmt(c.saldo)}</p> <p className="text-xs text-muted-foreground">cuenta {c.numero}</p> </div> </div> </CardContent> </Card> ))}
 </div> <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Registrar movimiento */}
 <Card className="lg:col-span-1"> <CardHeader className="pb-2"> <CardTitle className="text-base">Registrar movimiento</CardTitle> </CardHeader> <CardContent> <TransaccionForm cuentas={cuentas} /> </CardContent> </Card> {/* Historial */}
 <div className="lg:col-span-2 space-y-4"> <Card> <CardHeader className="pb-3 pt-4 px-4"> <form method="GET" className="flex flex-col sm:flex-row gap-2"> <select name="cuentaId" defaultValue={cuentaId}
 className="h-9 border rounded-md px-2 text-sm bg-background"> <option value="">Todas las cuentas</option> {cuentas.map((c) => (
 <option key={c.id} value={c.id}>{c.banco} — {c.nombre}</option> ))}
 </select> <input name="mes" type="month" defaultValue={mes}
 className="h-9 border rounded-md px-2 text-sm bg-background" /> <Input name="q" defaultValue={busqueda} placeholder="Buscar..." className="flex-1" /> <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}> Filtrar
 </button> </form> </CardHeader> <CardContent className="px-0 pb-0"> <p className="px-4 pb-2 text-xs text-muted-foreground">{total} movimientos</p> {transacciones.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground"> <p>Sin movimientos</p> </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Fecha</TableHead> <TableHead>Cuenta</TableHead> <TableHead>Tipo</TableHead> <TableHead>Descripción</TableHead> <TableHead className="text-right">Monto</TableHead> <TableHead className="text-right">Saldo</TableHead> </TableRow> </TableHeader> <TableBody> {transacciones.map((t) => (
 <TableRow key={t.id}> <TableCell className="text-sm"> {new Date(t.fecha).toLocaleDateString("es-DO")}
 </TableCell> <TableCell className="text-xs text-muted-foreground">{t.cuenta.banco}</TableCell> <TableCell className={cn("text-xs font-medium", tipoColors[t.tipo] ?? "")}> {t.tipo}
 </TableCell> <TableCell className="text-sm max-w-xs truncate">{t.descripcion}</TableCell> <TableCell className={cn(
 "text-right font-medium",
 ["DEPOSITO","TRANSFERENCIA"].includes(t.tipo) ? "text-green-600" : "text-red-600" )}> {fmt(t.monto)}
 </TableCell> <TableCell className="text-right text-sm">{fmt(t.saldoDespues)}</TableCell> </TableRow> ))}
 </TableBody> </Table> )}
 </CardContent> </Card> {pages > 1 && (
 <div className="flex justify-center gap-2"> {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
 <Link key={p} href={`/bancos?cuentaId=${cuentaId}&page=${p}`}
 className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}> {p}
 </Link> ))}
 </div> )}
 </div> </div> </div> );
}
