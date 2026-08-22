import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getProducto, getCategorias } from "@/actions/productos";
import { Badge } from "@/components/ui/badge";
import { ProductoDetailForm } from "@/components/productos/producto-detail-form";
import { cn } from "@/lib/utils";

const ROLES_SOLO_LECTURA = ["VENDEDOR", "CAJA"];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductoPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rol = ((session?.user) as any)?.rol ?? "";
  const soloLectura = ROLES_SOLO_LECTURA.includes(rol);

  const [producto, categorias] = await Promise.all([getProducto(id), getCategorias()]);

  if (!producto) notFound();

  const stockBajo =
    Number(producto.stockMinimo) > 0 &&
    Number(producto.stockActual) <= Number(producto.stockMinimo);

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
    exentoItbis: producto.exentoItbis ?? false,
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
    <div className="space-y-5 max-w-4xl">

      {/* Breadcrumb / Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/productos"
              className="inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full transition-all hover:brightness-110 text-sm"
              style={{
                backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
                color: "var(--accent-hex)",
                border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)",
              }}
            >
              ← Productos
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <h1 className="text-2xl font-bold truncate">{producto.nombre}</h1>
            <Badge variant="secondary" className="font-mono shrink-0">{producto.categoria.codigo}</Badge>
            {producto.esFraccionable && <Badge variant="outline" className="shrink-0">Fraccionable</Badge>}
            {!producto.activo && <Badge variant="destructive" className="shrink-0">Inactivo</Badge>}
            {stockBajo && <Badge variant="destructive" className="shrink-0">Stock bajo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground font-mono">{producto.codigo}</p>
          {producto.codigoBarras && (
            <p className="text-xs text-muted-foreground">Barras: {producto.codigoBarras}</p>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/productos/${id}/movimientos`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-accent transition-colors text-xs font-medium"
        >
          Movimientos de inventario
          {producto.movimientos.length > 0 && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {producto.movimientos.length}+
            </span>
          )}
        </Link>
        <Link
          href={`/productos/${id}/compras`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-accent transition-colors text-xs font-medium"
        >
          Historial de compras
        </Link>
      </div>

      {/* Formulario inline editable */}
      <ProductoDetailForm
        productoId={id}
        categorias={categorias}
        defaultValues={defaultValues}
        soloLectura={soloLectura}
      />
    </div>
  );
}
