import { notFound } from "next/navigation";
import Link from "next/link";
import { getUsuario, eliminarUsuario } from "@/actions/usuarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { EditarUsuarioForm } from "@/components/usuarios/editar-usuario-form";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
 params: Promise<{ id: string }>;
}

export default async function EditarUsuarioPage({ params }: PageProps) {
 const { id } = await params;
 const usuario = await getUsuario(id);
 if (!usuario) notFound();

 return (
 <div className="space-y-5 max-w-lg"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/usuarios">Usuarios</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem> <BreadcrumbPage>{usuario.nombre} {usuario.apellido}</BreadcrumbPage> </BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold">{usuario.nombre} {usuario.apellido}</h1> <p className="text-sm text-muted-foreground mt-0.5">{usuario.email}</p> </div> <Link href="/usuarios" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>  Volver
 </Link> </div> <Card> <CardHeader className="pb-2"> <CardTitle className="text-base">Editar usuario</CardTitle> </CardHeader> <CardContent> <EditarUsuarioForm usuario={usuario} /> </CardContent> </Card> {/* Eliminar — zona de peligro */}
 <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-4"> <div> <p className="text-sm font-medium text-destructive">Zona de peligro</p> <p className="text-xs text-muted-foreground mt-0.5"> Solo se puede eliminar si el usuario no tiene ventas, compras ni turnos asociados. Si tiene registros, desactívalo en su lugar.
 </p> </div> <BtnEliminarDocumento
 id={id}
 documento={`${usuario.nombre} ${usuario.apellido}`}
 accion={eliminarUsuario}
 label=" Eliminar usuario" variant="destructive" size="sm" /> </div> </div> );
}
