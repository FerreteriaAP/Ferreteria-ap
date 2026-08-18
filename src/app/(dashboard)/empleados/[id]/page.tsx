import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpleado } from "@/actions/empleados";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
 params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
 ACTIVO: "default",
 INACTIVO: "secondary",
 SUSPENDIDO: "destructive",
};

function Row({ label, value }: { label: string; value: string | undefined | null }) {
 if (!value) return null;
 return (
 <div className="flex justify-between text-sm"> <span className="text-muted-foreground">{label}</span> <span>{value}</span> </div> );
}

export default async function EmpleadoPage({ params }: PageProps) {
 const { id } = await params;
 const empleado = await getEmpleado(id);
 if (!empleado) notFound();

 const salarioQuincenal = Number(empleado.salarioBase) / 2;

 return (
 <div className="space-y-5 max-w-3xl"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/empleados">Empleados</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>{empleado.nombre} {empleado.apellido}</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div className="flex items-start justify-between"> <div className="space-y-1"> <div className="flex items-center gap-2"> <h1 className="text-2xl font-bold">{empleado.nombre} {empleado.apellido}</h1> <Badge variant={estadoVariant[empleado.estado]}>{empleado.estado}</Badge> </div> <p className="text-sm text-muted-foreground">{empleado.cargo}{empleado.departamento ? ` — ${empleado.departamento}` : ""}</p> </div> <Link href={`/empleados/${id}/editar`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}> Editar
 </Link> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Datos personales</CardTitle></CardHeader> <CardContent className="space-y-2"> <Row label="Cédula" value={empleado.cedula} /> <Row label="Teléfono" value={empleado.telefono} /> <Row label="Email" value={empleado.email} /> <Row label="Fecha ingreso" value={new Date(empleado.fechaIngreso).toLocaleDateString("es-DO")} /> <Row label="Nacimiento" value={empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toLocaleDateString("es-DO") : null} /> </CardContent> </Card> <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Salario</CardTitle></CardHeader> <CardContent className="space-y-2"> <Row label="Salario mensual" value={fmt(empleado.salarioBase)} /> <Row label="Salario quincenal" value={fmt(salarioQuincenal)} /> <Row label="AFP" value={empleado.afp} /> <Row label="SFS" value={empleado.sfs} /> <Row label="NSS" value={empleado.nss} /> </CardContent> </Card> {empleado.bancoCuenta && (
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Datos bancarios</CardTitle></CardHeader> <CardContent className="space-y-2"> <Row label="Banco" value={empleado.bancoCuenta} /> <Row label="Cuenta" value={empleado.cuentaBancaria} /> <Row label="Tipo" value={empleado.tipoCuenta} /> </CardContent> </Card> )}

 {empleado.usuario && (
 <Card> <CardHeader><CardTitle className="text-sm text-muted-foreground">Acceso al sistema</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <div className="flex justify-between"> <span className="text-muted-foreground">Email</span> <span>{empleado.usuario.email}</span> </div> <div className="flex justify-between"> <span className="text-muted-foreground">Rol</span> <Badge variant="outline">{empleado.usuario.rol}</Badge> </div> <div className="flex justify-between"> <span className="text-muted-foreground">Activo</span> <span>{empleado.usuario.activo ? "Sí" : "No"}</span> </div> </CardContent> </Card> )}
 </div> </div> );
}
