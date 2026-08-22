import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCategorias, siguienteCodigoProducto } from "@/actions/productos";
import { ProductoForm } from "@/components/productos/producto-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const ROLES_SIN_PERMISO = ["VENDEDOR", "CAJA"];

export default async function NuevoProductoPage() {
 const session = await auth();
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const rol = ((session?.user) as any)?.rol ?? "";
 if (ROLES_SIN_PERMISO.includes(rol)) redirect("/productos");

 const [categorias, nextCodigo] = await Promise.all([
 getCategorias(),
 siguienteCodigoProducto(),
 ]);

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/productos">Productos</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Nuevo producto</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Nuevo producto</h1> <p className="text-sm text-muted-foreground mt-0.5">Agregar artículo al inventario</p> </div> <ProductoForm categorias={categorias} nextCodigo={nextCodigo} /> </div> );
}
