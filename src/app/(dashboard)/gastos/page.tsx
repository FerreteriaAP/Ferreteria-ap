import Link from "next/link";
import { getGastos, getCategoriasGasto } from "@/actions/gastos";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GastoForm } from "@/components/gastos/gasto-form";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ q?: string; cat?: string; mes?: string; page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

export default async function GastosPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const busqueda = params.q ?? "";
 const categoriaId = params.cat ?? "";
 const mes = params.mes ?? "";
 const page = Number(params.page ?? 1);

 const [{ gastos, total, pages }, categorias] = await Promise.all([
 getGastos({ categoriaId: categoriaId || undefined, busqueda, mes: mes || undefined, page }),
 getCategoriasGasto(),
 ]);

 const totalMonto = gastos.reduce((s, g) => s + Number(g.monto), 0);

 return (
 <div className="space-y-5"> <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold">Gastos</h1> <p className="text-sm text-muted-foreground mt-0.5">{total} registros — {fmt(totalMonto)} en esta vista</p> </div> </div> <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Formulario nuevo gasto */}
 <Card className="lg:col-span-1"> <CardHeader className="pb-2"> <h2 className="font-semibold text-base">Registrar gasto</h2> </CardHeader> <CardContent> <GastoForm categorias={categorias} /> </CardContent> </Card> {/* Lista */}
 <div className="lg:col-span-2 space-y-4"> <Card> <CardHeader className="pb-3 pt-4 px-4"> <form method="GET" className="flex flex-col sm:flex-row gap-3"> <Input
 name="q" defaultValue={busqueda}
 placeholder="Buscar..." className="flex-1" /> <select name="cat" defaultValue={categoriaId}
 className="h-9 border rounded-md px-2 text-sm bg-background"> <option value="">Todas las categorías</option> {categorias.map((c) => (
 <option key={c.id} value={c.id}>{c.nombre}</option> ))}
 </select> <input name="mes" type="month" defaultValue={mes}
 className="h-9 border rounded-md px-2 text-sm bg-background" /> <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}> Filtrar
 </button> </form> </CardHeader> <CardContent className="px-0 pb-0"> {gastos.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground"> <div className="text-3xl mb-2"></div> <p>Sin gastos registrados</p> </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Número</TableHead> <TableHead>Descripción</TableHead> <TableHead>Categoría</TableHead> <TableHead>Tipo</TableHead> <TableHead>Fecha</TableHead> <TableHead className="text-right">Monto</TableHead> </TableRow> </TableHeader> <TableBody> {gastos.map((g) => (
 <TableRow key={g.id}> <TableCell className="font-mono text-xs">{g.numero}</TableCell> <TableCell className="text-sm max-w-xs truncate">{g.descripcion}</TableCell> <TableCell className="text-sm">{g.categoria.nombre}</TableCell> <TableCell> <Badge variant={g.categoria.tipo === "FIJO" ? "default" : "outline"} className="text-xs"> {g.categoria.tipo === "FIJO" ? "Fijo" : "Variable"}
 </Badge> </TableCell> <TableCell className="text-sm"> {new Date(g.fecha).toLocaleDateString("es-DO")}
 </TableCell> <TableCell className="text-right font-medium">{fmt(g.monto)}</TableCell> </TableRow> ))}
 </TableBody> </Table> )}
 </CardContent> </Card> {pages > 1 && (
 <div className="flex justify-center gap-2"> {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
 <Link
 key={p}
 href={`/gastos?q=${busqueda}&cat=${categoriaId}&page=${p}`}
 className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
 > {p}
 </Link> ))}
 </div> )}
 </div> </div> </div> );
}
