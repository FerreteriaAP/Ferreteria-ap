import { notFound } from "next/navigation";
import { getProducto, getCategorias } from "@/actions/productos";
import { ProductoForm } from "@/components/productos/producto-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface PageProps {
 params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: PageProps) {
 const { id } = await params;
 const [producto, categorias] = await Promise.all([getProducto(id), getCategorias()]);

 if (!producto) notFound();

 const defaultValues = {
 codigo: producto.codigo,
 codigoBarras: producto.codigoBarras ?? "",
 nombre: producto.nombre,
 descripcion: producto.descripcion ?? "",
 categoriaId: producto.categoriaId,
 unidadMedida: producto.unidadMedida,
 esFraccionable: producto.esFraccionable,
 unidadFraccion: producto.unidadFraccion ?? "",
 factorFraccion: producto.factorFraccion ? Number(producto.factorFraccion) : undefined,
 costoUltimo: Number(producto.costoUltimo),
 porcentajeGanancia: Number(producto.porcentajeGanancia),
 precioVenta: Number(producto.precioVenta),
 precioMayoreo: producto.precioMayoreo ? Number(producto.precioMayoreo) : undefined,
 stockActual: Number(producto.stockActual),
 stockMinimo: Number(producto.stockMinimo),
 stockMaximo: producto.stockMaximo ? Number(producto.stockMaximo) : undefined,
 activo: producto.activo,
 };

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/productos">Productos</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbLink href={`/productos/${id}`}>{producto.nombre}</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>Editar</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Editar producto</h1> <p className="text-sm text-muted-foreground font-mono">{producto.codigo} — {producto.nombre}</p> </div> <ProductoForm productoId={id} categorias={categorias} defaultValues={defaultValues} /> </div> );
}
