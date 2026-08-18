import { EmpleadoForm } from "@/components/empleados/empleado-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function NuevoEmpleadoPage() {
 return (
 <div className="space-y-5 max-w-3xl"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/empleados">Empleados</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Nuevo empleado</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Nuevo empleado</h1> <p className="text-sm text-muted-foreground mt-0.5">Registrar nuevo empleado en el sistema</p> </div> <EmpleadoForm /> </div> );
}
