import { getCategorias, siguienteCodigoProducto } from "@/actions/productos";
import { ProductoForm } from "@/components/productos/producto-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default async function NuevoProductoPage() {
 const [categorias, nextCodigo] = await Promise.all([
 getCategorias(),
 siguienteCodigoProducto(),
 ]);

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/productos">Productos</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Nuevo producto</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Nuevo producto</h1> <p className="text-sm text-muted-foreground mt-0.5">Agregar artículo al inventario</p> </div> <ProductoForm categorias={categorias} nextCodigo={nextCodigo} /> </div> );
}
