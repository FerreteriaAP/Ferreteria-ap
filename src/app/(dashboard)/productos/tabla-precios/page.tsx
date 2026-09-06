import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  getProductosParaTabla,
  getPreciosPorSuplidor,
} from "@/actions/tabla-precios";
import { ProductoSelector } from "./ProductoSelector";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

interface PageProps {
  searchParams: Promise<{ productoId?: string }>;
}

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default async function TablaPrecios({ searchParams }: PageProps) {
  const { productoId = "" } = await searchParams;

  const [productos, precios] = await Promise.all([
    getProductosParaTabla(),
    productoId ? getPreciosPorSuplidor(productoId) : Promise.resolve([]),
  ]);

  const producto = productoId
    ? productos.find((p) => p.id === productoId)
    : null;

  // Determinar rangos para colores
  const costos = precios.map((p) => p.costo);
  const minCosto = costos.length ? Math.min(...costos) : 0;
  const maxCosto = costos.length ? Math.max(...costos) : 0;

  function getRowStyle(costo: number): {
    bg: string;
    text: string;
    badge: string;
    icon: React.ReactNode;
  } {
    if (precios.length === 1) {
      return {
        bg: "var(--muted)",
        text: "var(--foreground)",
        badge: "Único suplidor",
        icon: <Minus size={14} />,
      };
    }
    if (costo === minCosto) {
      return {
        bg: "rgba(34,197,94,0.12)",
        text: "#16a34a",
        badge: "Más económico",
        icon: <TrendingDown size={14} />,
      };
    }
    if (costo === maxCosto) {
      return {
        bg: "rgba(239,68,68,0.10)",
        text: "#dc2626",
        badge: "Más caro",
        icon: <TrendingUp size={14} />,
      };
    }
    return {
      bg: "rgba(234,179,8,0.10)",
      text: "#ca8a04",
      badge: "Precio intermedio",
      icon: <Minus size={14} />,
    };
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          href="/productos"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a inventario
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Tabla de Precios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compara el último precio de compra de un artículo entre suplidores
        </p>
      </div>

      {/* Selector de producto */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Selecciona un artículo</label>
        <ProductoSelector productos={productos} productoId={productoId} />
      </div>

      {/* Tabla comparativa */}
      {productoId && producto && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">{producto.nombre}</h2>
            <span className="text-sm text-muted-foreground font-mono">
              {producto.codigo}
            </span>
          </div>

          {precios.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <p className="font-medium text-muted-foreground">
                Sin compras registradas para este artículo
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Registra una compra para ver la comparativa de precios
              </p>
            </div>
          ) : (
            <>
              {/* Leyenda de colores */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500/60" />
                  Más económico
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/60" />
                  Precio intermedio
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500/60" />
                  Más caro
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Suplidor</TableHead>
                    <TableHead className="text-right">Último costo</TableHead>
                    <TableHead className="text-right">Cant. comprada</TableHead>
                    <TableHead>Última compra</TableHead>
                    <TableHead># Documento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {precios.map((p) => {
                    const style = getRowStyle(p.costo);
                    return (
                      <TableRow
                        key={p.suplidorId}
                        style={{ backgroundColor: style.bg }}
                      >
                        <TableCell className="font-medium">
                          {p.suplidorNombre}
                        </TableCell>
                        <TableCell
                          className="text-right font-mono font-semibold text-base"
                          style={{ color: style.text }}
                        >
                          {fmt(p.costo)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {p.cantidad.toLocaleString("es-DO", {
                            maximumFractionDigits: 4,
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {fmtFecha(p.fechaCompra)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {p.numeroCompra}
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: style.bg,
                              color: style.text,
                              border: `1px solid ${style.text}40`,
                            }}
                          >
                            {style.icon}
                            {style.badge}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Resumen rápido si hay más de 1 */}
              {precios.length > 1 && (
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-sm font-medium mb-2">Resumen</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Más económico</p>
                      <p className="font-semibold text-green-600">
                        {fmt(minCosto)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {precios.find((p) => p.costo === minCosto)?.suplidorNombre}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Más caro</p>
                      <p className="font-semibold text-red-600">
                        {fmt(maxCosto)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {precios.find((p) => p.costo === maxCosto)?.suplidorNombre}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Diferencia</p>
                      <p className="font-semibold">
                        {fmt(maxCosto - minCosto)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(((maxCosto - minCosto) / minCosto) * 100).toFixed(1)}% más caro
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Suplidores</p>
                      <p className="font-semibold">{precios.length}</p>
                      <p className="text-xs text-muted-foreground">con compras registradas</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Estado vacío inicial */}
      {!productoId && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="font-medium text-muted-foreground">
            Selecciona un artículo para ver la comparativa de precios
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Se mostrará el último precio de compra registrado por cada suplidor
          </p>
        </div>
      )}
    </div>
  );
}
