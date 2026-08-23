import Link from "next/link";
import { getOrdenesCompra } from "@/actions/ordenes-compra";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Paginacion } from "@/components/ui/paginacion";

// ─── Estilos de estado ────────────────────────────────────────────────────────

const estadoStyle: Record<string, React.CSSProperties> = {
  BORRADOR:         { backgroundColor: "#6b728022", color: "#9ca3af", border: "1px solid #6b728055" },
  ENVIADA:          { backgroundColor: "#2563eb22", color: "#60a5fa", border: "1px solid #2563eb55" },
  RECIBIDA_PARCIAL: { backgroundColor: "#d9770622", color: "#fb923c", border: "1px solid #d9770655" },
  RECIBIDA:         { backgroundColor: "#16a34a22", color: "#4ade80", border: "1px solid #16a34a55" },
  CANCELADA:        { backgroundColor: "#dc262622", color: "#f87171", border: "1px solid #dc262655" },
};

const estadoLabel: Record<string, string> = {
  BORRADOR:         "Borrador",
  ENVIADA:          "Enviada",
  RECIBIDA_PARCIAL: "Recibida parcial",
  RECIBIDA:         "Recibida",
  CANCELADA:        "Cancelada",
};

const FILTROS_ESTADO = [
  { value: "",                 label: "Todas"            },
  { value: "BORRADOR",         label: "Borrador"         },
  { value: "ENVIADA",          label: "Enviada"          },
  { value: "RECIBIDA_PARCIAL", label: "Parcial"          },
  { value: "RECIBIDA",         label: "Recibida"         },
  { value: "CANCELADA",        label: "Cancelada"        },
];

const ROW_BORDER: React.CSSProperties = {
  borderBottom: "1px solid color-mix(in oklch, var(--border) 35%, transparent)",
};

const fmt = (n: unknown) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OrdenesCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const busqueda = sp.q ?? "";
  const estado   = sp.estado ?? "";
  const page     = Number(sp.page ?? "1");

  const { ordenes, total, pages } = await getOrdenesCompra({ busqueda, estado, page });

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de compra</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} órdenes registradas</p>
        </div>
        <Link
          href="/ordenes-compra/nueva"
          className="inline-flex items-center gap-1.5 rounded-full border-2 px-5 py-2 text-sm font-semibold transition-colors hover:bg-orange-500/10"
          style={{ borderColor: "#f97316", color: "#f97316" }}
        >
          + Nueva orden
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" className="flex-1">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <Input
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por número o suplidor..."
            className="max-w-sm"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {FILTROS_ESTADO.map(f => (
            <Link
              key={f.value}
              href={`/ordenes-compra?estado=${f.value}&q=${busqueda}`}
              className={cn(
                buttonVariants({ variant: estado === f.value ? "default" : "outline", size: "sm" })
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {ordenes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">
            {busqueda || estado ? "Sin resultados" : "Sin órdenes de compra"}
          </p>
          <p className="text-sm mt-1">
            {busqueda || estado
              ? "Intenta ajustar los filtros"
              : "Crea la primera orden para empezar"}
          </p>
          {!busqueda && !estado && (
            <Link
              href="/ordenes-compra/nueva"
              className="inline-flex items-center gap-1.5 rounded-full border-2 px-5 py-2 text-sm font-semibold transition-colors hover:bg-orange-500/10 mt-4"
              style={{ borderColor: "#f97316", color: "#f97316" }}
            >
              + Nueva orden
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow style={ROW_BORDER}>
              <TableHead>Número</TableHead>
              <TableHead>Suplidor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Artículos</TableHead>
              <TableHead className="text-center">Compras</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.map((o) => (
              <TableRow key={o.id} style={ROW_BORDER}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/ordenes-compra/${o.id}`}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--accent-hex)" }}
                  >
                    {o.numero}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {o.suplidor?.nombre ?? "—"}
                </TableCell>
                <TableCell>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={estadoStyle[o.estado] ?? estadoStyle.BORRADOR}
                  >
                    {estadoLabel[o.estado] ?? o.estado}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-sm">
                  {fmt(o.total)}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {o._count.detalles}
                </TableCell>
                <TableCell className="text-center">
                  {o._count.compras > 0 ? (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#16a34a22", color: "#4ade80", border: "1px solid #16a34a55" }}
                    >
                      {o._count.compras}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString("es-DO")}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/ordenes-compra/${o.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Paginación */}
      <Paginacion
        page={page}
        pages={pages}
        buildHref={(p) => `/ordenes-compra?q=${busqueda}&estado=${estado}&page=${p}`}
      />
    </div>
  );
}
