import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

async function getCategoriasConConteo() {
 const cats = await prisma.categoria.findMany({
 orderBy: { nombre: "asc" },
 include: { _count: { select: { productos: true } } },
 });
 return cats;
}

export default async function CategoriasPage() {
 const categorias = await getCategoriasConConteo();

 return (
 <div className="space-y-5"> <div> <h1 className="text-2xl font-bold">Categorías de productos</h1> <p className="text-sm text-muted-foreground mt-0.5"> {categorias.length} categorías registradas
 </p> </div> <Card> <CardHeader> <CardTitle className="text-base">Categorías del inventario</CardTitle> </CardHeader> <CardContent className="px-0 pb-0"> <Table> <TableHeader> <TableRow> <TableHead>Código</TableHead> <TableHead>Nombre</TableHead> <TableHead>Descripción</TableHead> <TableHead className="text-center">Productos</TableHead> </TableRow> </TableHeader> <TableBody> {categorias.map((c) => (
 <TableRow key={c.id}> <TableCell> <Badge variant="outline" className="font-mono"> {c.codigo}
 </Badge> </TableCell> <TableCell className="font-medium">{c.nombre}</TableCell> <TableCell className="text-sm text-muted-foreground"> {c.descripcion ?? "—"}
 </TableCell> <TableCell className="text-center"> <Badge variant="secondary">{c._count.productos}</Badge> </TableCell> </TableRow> ))}
 </TableBody> </Table> </CardContent> </Card> <div className="rounded-md bg-muted/50 border p-4 text-sm text-muted-foreground"> <p className="font-medium text-foreground mb-1"> Categorías del sistema</p> <p> Las categorías están definidas en el esquema del sistema (CTC, FT, ET, PL).
 Contacta al administrador del sistema para agregar nuevas categorías.
 </p> </div> </div> );
}
