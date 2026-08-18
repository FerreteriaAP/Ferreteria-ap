import Link from "next/link";
import { getUsuarios } from "@/actions/usuarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { cn } from "@/lib/utils";

const ROL_LABELS: Record<string, string> = {
 ADMINISTRADOR: "Administrador",
 ASISTENTE_ADMINISTRATIVO: "Asistente Adm.",
 VENDEDOR: "Vendedor",
 CAJA: "Caja",
};

const ROL_COLORS: Record<string, string> = {
 ADMINISTRADOR: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
 ASISTENTE_ADMINISTRATIVO: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
 VENDEDOR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
 CAJA: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export default async function UsuariosPage() {
 const usuarios = await getUsuarios();

 return (
 <div className="space-y-5"> <div> <h1 className="text-2xl font-bold">Usuarios</h1> <p className="text-sm text-muted-foreground mt-0.5">{usuarios.length} usuarios registrados</p> </div> <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Formulario nuevo usuario */}
 <Card className="lg:col-span-1"> <CardHeader className="pb-2"> <CardTitle className="text-base">Crear usuario</CardTitle> </CardHeader> <CardContent> <UsuarioForm /> </CardContent> </Card> {/* Lista de usuarios */}
 <div className="lg:col-span-2"> <Card> <CardContent className="px-0 pb-0 pt-2"> {usuarios.length === 0 ? (
 <div className="text-center py-10 text-muted-foreground"> <p className="text-3xl mb-2"></p> <p>Sin usuarios registrados</p> </div> ) : (
 <Table> <TableHeader> <TableRow> <TableHead>Nombre</TableHead> <TableHead>Correo</TableHead> <TableHead>Rol</TableHead> <TableHead>Estado</TableHead> <TableHead className="text-right">Acciones</TableHead> </TableRow> </TableHeader> <TableBody> {usuarios.map((u) => (
 <TableRow key={u.id} className={!u.activo ? "opacity-50" : ""}> <TableCell className="font-medium"> {u.nombre} {u.apellido}
 {u.empleado && (
 <p className="text-xs text-muted-foreground"> Empleado: {u.empleado.nombre} {u.empleado.apellido}
 </p> )}
 </TableCell> <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell> <TableCell> <span className={cn(
 "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
 ROL_COLORS[u.rol] ?? "bg-gray-100 text-gray-800" )}> {ROL_LABELS[u.rol] ?? u.rol}
 </span> </TableCell> <TableCell> <Badge variant={u.activo ? "default" : "outline"} className="text-xs"> {u.activo ? "Activo" : "Inactivo"}
 </Badge> </TableCell> <TableCell className="text-right"> <Link
 href={`/usuarios/${u.id}`}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
 > Editar
 </Link> </TableCell> </TableRow> ))}
 </TableBody> </Table> )}
 </CardContent> </Card> </div> </div> </div> );
}
