import Link from "next/link";
import { getCompras } from "@/actions/compras";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}

// Estilos de estado con colores explícitos
const estadoStyle: Record<string, React.CSSProperties> = {
  PAGADO:        { backgroundColor: "#16a34a22", color: "#16a34a", border: "1px solid #16a34a55" },
  PENDIENTE:     { backgroundColor: "#dc262622", color: "#ef4444", border: "1px solid #dc262655" },
  PAGADO_PARCIAL:{ backgroundColor: "#2563eb22", color: "#60a5fa", border: "1px solid #2563eb55" },
  VENCIDO:       { backgroundColor: "#dc262622", color: "#dc2626", border: "1px solid #dc262655" },
};

const estadoLabel: Record<string, string> = {
  PENDIENTE:      "Pendiente",
  PAGADO_PARCIAL: "Pago parcial",
  PAGADO:         "Pagado",
  VENCIDO:        "Vencido",
};

const ROW_BORDER: React.CSSProperties = {
  borderBottom: "1px solid color-mix(in oklch, var(--border) 35%, transparent)",
};

export default async function ComprasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const busqueda   = params.q ?? "";
  const estadoPago = params.estado ?? "";
  const page       = Number(params.page ?? 1);

  const { compras, total, pages } = await getCompras({
    busqueda,
    estadoPago: estadoPago || undefined,
    page,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDOP = (n: any) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ordenes-compra"
            className={cn(buttonVariants({ variant: "outline" }))}
            style={{ borderColor: "#ca8a04", color: "#ca8a04" }}
          >
            Órdenes de compra
          </Link>
          <Link href="/compras/nueva" className={buttonVariants()}>
            + Nueva compra
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" className="flex-1">
          <Input
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por número, suplidor, factura..."
            className="max-w-sm"
          />
        </form>
        <div className="flex gap-2">
          {["", "PENDIENTE", "PAGADO_PARCIAL", "PAGADO"].map((e) => (
            <Link
              key={e}
              href={`/compras?estado=${e}&q=${busqueda}`}
              className={cn(
                buttonVariants({ variant: estadoPago === e ? "default" : "outline", size: "sm" })
              )}
            >
              {e === "" ? "Todas" : estadoLabel[e]}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {compras.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Sin compras</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow style={ROW_BORDER}>
              <TableHead>Número</TableHead>
              <TableHead>Suplidor</TableHead>
              <TableHead>Factura suplidor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.map((c) => (
              <TableRow key={c.id} style={ROW_BORDER}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/compras/${c.id}`}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--accent-hex)" }}
                  >
                    {c.numero}
                  </Link>
                </TableCell>
                <TableCell>{c.suplidor.nombre}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.noFacturaSuplidor ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(c.fechaFactura).toLocaleDateString("es-DO")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.fechaVencimiento
                    ? new Date(c.fechaVencimiento).toLocaleDateString("es-DO")
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-medium">{formatDOP(c.total)}</TableCell>
                <TableCell>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={estadoStyle[c.estadoPago] ?? estadoStyle.PENDIENTE}
                  >
                    {estadoLabel[c.estadoPago] ?? c.estadoPago}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/compras/${c.id}`}
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
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/compras?q=${busqueda}&page=${p}`}
              className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
