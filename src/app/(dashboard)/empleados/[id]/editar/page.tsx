import { notFound } from "next/navigation";
import { getEmpleado } from "@/actions/empleados";
import { EmpleadoEditForm } from "@/components/empleados/empleado-edit-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface PageProps {
 params: Promise<{ id: string }>;
}

export default async function EditarEmpleadoPage({ params }: PageProps) {
 const { id } = await params;
 const empleado = await getEmpleado(id);
 if (!empleado) notFound();

 return (
 <div className="space-y-5 max-w-3xl"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/empleados">Empleados</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbLink href={`/empleados/${id}`}>{empleado.nombre} {empleado.apellido}</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Editar</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <h1 className="text-2xl font-bold">Editar empleado</h1> <EmpleadoEditForm empleado={empleado} /> </div> );
}
