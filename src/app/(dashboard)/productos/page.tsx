import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getProductos, getCategorias } from "@/actions/productos";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductosGrid } from "@/components/productos/productos-grid";
import { ProductosTableBody } from "@/components/productos/productos-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";
import { Paginacion } from "@/components/ui/paginacion";
import { ProductoBusqueda } from "@/components/productos/producto-busqueda";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    stockBajo?: string;
    page?: string;
    vista?: string;
  }>;
}

const ROLES_SOLO_LECTURA = ["VENDEDOR", "CAJA"];

export default async function ProductosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rol = ((session?.user) as any)?.rol ?? "";
  const puedeCrear = !ROLES_SOLO_LECTURA.includes(rol);
  const busqueda = params.q ?? "";
  const categoriaId = params.categoria ?? "";
  const stockBajo = params.stockBajo === "1";
  const page = Number(params.page ?? 1);
  const jar = await cookies();
  const cookieVista = jar.get("vista-preferida")?.value;
  const vista = (params.vista ?? cookieVista) === "grid" ? "grid" : "lista";

  const [{ productos, total, pages }, categorias] = await Promise.all([
    getProductos({ busqueda, categoriaId: categoriaId || undefined, stockBajo, page }),
    getCategorias(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDOP = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  const vistaQS = vista === "grid" ? "&vista=grid" : "";

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} productos {stockBajo ? "con stock bajo" : "en catálogo"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {puedeCrear && (
            <Link href="/productos/nuevo" className={buttonVariants()}>
              + Nuevo producto
            </Link>
          )}
          <ViewToggle
            vista={vista}
            listaHref={`/productos?q=${busqueda}${categoriaId ? `&categoria=${categoriaId}` : ""}${stockBajo ? "&stockBajo=1" : ""}`}
            gridHref={`/productos?q=${busqueda}${categoriaId ? `&categoria=${categoriaId}` : ""}${stockBajo ? "&stockBajo=1" : ""}&vista=grid`}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <ProductoBusqueda
          defaultValue={busqueda}
          categoriaId={categoriaId}
          stockBajo={stockBajo}
          vista={vista}
        />
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/productos?q=${busqueda}${vistaQS}`}
            className={cn(buttonVariants({ variant: !categoriaId ? "default" : "outline", size: "sm" }))}
          >
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={`/productos?categoria=${c.id}&q=${busqueda}${vistaQS}`}
              className={cn(buttonVariants({ variant: categoriaId === c.id ? "default" : "outline", size: "sm" }))}
            >
              {c.codigo} — {c.nombre}
            </Link>
          ))}
          <Link
            href={stockBajo ? `/productos?q=${busqueda}${vistaQS}` : `/productos?stockBajo=1${vistaQS}`}
            className={cn(buttonVariants({ variant: stockBajo ? "destructive" : "outline", size: "sm" }))}
          >
            Stock bajo
          </Link>
        </div>
      </div>

      {/* Contenido */}
      {vista === "grid" ? (
        <ProductosGrid productos={productos} />
      ) : productos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Sin productos</p>
          <p className="text-sm">Agrega el primer artículo al inventario</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mín.</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <ProductosTableBody productos={productos} />
        </Table>
      )}

      {/* Paginación */}
      <Paginacion
        page={page}
        pages={pages}
        buildHref={(p) => `/productos?q=${busqueda}&page=${p}${vistaQS}`}
      />
    </div>
  );
}
