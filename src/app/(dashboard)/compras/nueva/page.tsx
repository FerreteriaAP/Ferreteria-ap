import { getSuplidores } from "@/actions/compras";
import { getCategorias } from "@/actions/productos";
import { CompraForm } from "@/components/compras/compra-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default async function NuevaCompraPage() {
 const [suplidores, categorias] = await Promise.all([getSuplidores(), getCategorias()]);

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/compras">Compras</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Nueva compra</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Nueva compra</h1> <p className="text-sm text-muted-foreground mt-0.5">Registrar factura de suplidor</p> </div> {suplidores.length === 0 ? (
 <div className="rounded-md border p-6 text-center text-muted-foreground"> <p className="font-medium">No hay suplidores registrados</p> <p className="text-sm mt-1"> <a href="/contactos/nuevo" className="underline">Crea un contacto de tipo Suplidor</a> antes de registrar una compra.
 </p> </div> ) : (
 <CompraForm suplidores={suplidores} categorias={categorias} /> )}
 </div> );
}
