import { getClientes } from "@/actions/ventas";
import { VentaForm } from "@/components/ventas/venta-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default async function NuevaVentaPage() {
 const rawClientes = await getClientes();
 // Serializar Decimal  number/null para Client Component
 const clientes = rawClientes.map((c) => ({
 ...c,
 limiteCredito: c.limiteCredito ? Number(c.limiteCredito) : null,
 }));

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/ventas">Ventas</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Nueva cotización</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Nueva cotización</h1> <p className="text-sm text-muted-foreground mt-0.5">Crea una cotización y avanza el flujo cuando sea necesario</p> </div> {clientes.length === 0 ? (
 <div className="rounded-md border p-6 text-center text-muted-foreground"> <p className="font-medium">No hay clientes registrados</p> <p className="text-sm mt-1"> <a href="/contactos/nuevo" className="underline">Crea un contacto de tipo Cliente</a> antes de registrar una venta.
 </p> </div> ) : (
 <VentaForm clientes={clientes} /> )}
 </div> );
}
