import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockActual: unknown;
  stockMinimo: unknown;
  costoUltimo: unknown;
  precioVenta: unknown;
  activo: boolean;
  esFraccionable: boolean;
  categoria: { codigo: string; nombre: string };
};

const formatDOP = (n: unknown) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

export function ProductosGrid({ productos }: { productos: Producto[] }) {
  if (productos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">Sin productos</p>
        <p className="text-sm">Agrega el primer artículo al inventario</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
      {productos.map((p) => {
        const stockBajo =
          Number(p.stockMinimo) > 0 && Number(p.stockActual) <= Number(p.stockMinimo);
        return (
          <Link
            key={p.id}
            href={`/productos/${p.id}`}
            className={cn(
              "rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-md hover:brightness-105 cursor-pointer",
              !p.activo && "opacity-55"
            )}
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-base leading-snug line-clamp-2 block">
                  {p.nombre}
                </span>
                <span className="text-xs font-medium font-mono mt-0.5 block text-muted-foreground">
                  {p.codigo}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono shrink-0 px-1.5">
                {p.categoria.codigo}
              </Badge>
            </div>

            {/* Info */}
            <div className="space-y-1.5 flex-1">
              {/* Precio — arriba */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Precio venta</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent-hex)" }}>
                  {formatDOP(p.precioVenta)}
                </span>
              </div>
              {/* Stock — abajo */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Stock</span>
                <span className={cn("text-sm font-bold tabular-nums", stockBajo ? "text-destructive" : "")}>
                  {Number(p.stockActual).toLocaleString("es-DO")}
                  <span className="text-[11px] font-normal ml-1 text-muted-foreground">
                    {p.unidadMedida}
                  </span>
                  {stockBajo && (
                    <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0 align-middle">
                      Bajo
                    </Badge>
                  )}
                </span>
              </div>
              {p.esFraccionable && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Fraccionable</Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
