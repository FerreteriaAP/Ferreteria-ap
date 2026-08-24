import Link from "next/link";
import { getVentas } from "@/actions/ventas";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { VentasSearch } from "@/components/ventas/ventas-search";

interface PageProps {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string; sortBy?: string; sortDir?: string }>;
}

const tipoLabel: Record<string, string> = {
  COTIZACION:  "Cotización",
  ORDEN_VENTA: "Orden de Venta",
  CONDUCE:     "Conduce",
  FACTURADA:   "Factura",
  CANCELADA:   "Cancelada",
};

const tipoVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COTIZACION:  "outline",
  ORDEN_VENTA: "secondary",
  CONDUCE:     "default",
  FACTURADA:   "default",
  CANCELADA:   "destructive",
};

const pagoStyle: Record<string, React.CSSProperties> = {
  PAGADO:        { backgroundColor: "#16a34a22", color: "#16a34a", border: "1px solid #16a34a55" },
  PENDIENTE:     { backgroundColor: "#dc262622", color: "#ef4444", border: "1px solid #dc262655" },
  PAGADO_PARCIAL:{ backgroundColor: "#2563eb22", color: "#60a5fa", border: "1px solid #2563eb55" },
  VENCIDO:       { backgroundColor: "#dc262622", color: "#dc2626", border: "1px solid #dc262655" },
};

const pagoLabel: Record<string, string> = {
  PENDIENTE:      "Pendiente",
  PAGADO_PARCIAL: "Parcial",
  PAGADO:         "Pagado",
  VENCIDO:        "Vencido",
};

const credLabel: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
  DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

const ROW_BORDER: React.CSSProperties = {
  borderBottom: "1px solid color-mix(in oklch, var(--border) 35%, transparent)",
};

/** Cabecera de columna clicable — alterna asc/desc y muestra la flecha activa */
function SortHead({
  col, label, current, dir, href, className,
}: {
  col: string; label: string; current: string; dir: string; href: (col: string, d: "asc" | "desc") => string; className?: string;
}) {
  const active = current === col;
  const nextDir: "asc" | "desc" = active && dir === "asc" ? "desc" : "asc";
  const arrow = active ? (dir === "asc" ? " ↑" : " ↓") : " ↕";
  return (
    <TableHead className={className}>
      <Link
        href={href(col, nextDir)}
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide select-none transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <span className={cn("text-[10px]", active ? "opacity-100" : "opacity-40")}>{arrow}</span>
      </Link>
    </TableHead>
  );
}

export default async function VentasPage({ searchParams }: PageProps) {
  const params   = await searchParams;
  const busqueda = params.q ?? "";
  const tipo     = params.tipo ?? "";
  const page     = Number(params.page ?? 1);
  const sortBy   = params.sortBy ?? "";
  const sortDir  = (params.sortDir === "asc" ? "asc" : "desc") as "asc" | "desc";

  const { ventas, total, pages } = await getVentas({
    tipo: tipo || undefined,
    busqueda,
    page,
    sortBy: sortBy || undefined,
    sortDir,
  });

  const formatDOP = (n: unknown) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  const tabs = [
    { key: "",            label: "Todas"        },
    { key: "COTIZACION",  label: "Cotizaciones" },
    { key: "ORDEN_VENTA", label: "Órdenes"      },
    { key: "CONDUCE",     label: "Conduces"     },
    { key: "FACTURADA",   label: "Facturas"     },
  ];

  /** Genera el href conservando tipo/q/page y aplicando la nueva columna+dirección */
  const sortHref = (col: string, d: "asc" | "desc") =>
    `/ventas?tipo=${tipo}&q=${busqueda}&page=1&sortBy=${col}&sortDir=${d}`;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} documentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ventas/despachos"
            className={cn(buttonVariants({ variant: "outline" }))}
            style={{ borderColor: "#ca8a04", color: "#ca8a04" }}
          >
            Despachos PDV
          </Link>
          <Link href="/ventas/nueva" className={buttonVariants()}>
            + Nueva cotización
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <VentasSearch
            defaultValue={busqueda}
            tipo={tipo}
            sortBy={sortBy}
            sortDir={sortDir}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/ventas?tipo=${t.key}&q=${busqueda}&sortBy=${sortBy}&sortDir=${sortDir}`}
              className={cn(buttonVariants({ variant: tipo === t.key ? "default" : "outline", size: "sm" }))}
            >
              {t.label}
            </Link>
          ))}
          {sortBy && (
            <Link
              href={`/ventas?tipo=${tipo}&q=${busqueda}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
            >
              ✕ Quitar orden
            </Link>
          )}
        </div>
      </div>

      {/* Tabla */}
      {ventas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Sin documentos</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow style={ROW_BORDER}>
              <SortHead col="numero"  label="Número"  current={sortBy} dir={sortDir} href={sortHref} />
              <SortHead col="tipo"    label="Tipo"    current={sortBy} dir={sortDir} href={sortHref} className="text-center" />
              <SortHead col="cliente" label="Cliente" current={sortBy} dir={sortDir} href={sortHref} />
              <SortHead col="credito" label="Crédito" current={sortBy} dir={sortDir} href={sortHref} />
              <SortHead col="fecha"   label="Fecha"   current={sortBy} dir={sortDir} href={sortHref} />
              <SortHead col="total"   label="Total"   current={sortBy} dir={sortDir} href={sortHref} className="text-right" />
              <TableHead>Pago</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.map((v) => (
              <TableRow key={v.id} style={ROW_BORDER}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/ventas/${v.id}`}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--accent-hex)" }}
                  >
                    {v.numero}
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={tipoVariant[v.tipo]} className="text-xs">
                    {tipoLabel[v.tipo] ?? v.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{v.cliente.nombre}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {credLabel[v.credito] ?? v.credito}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(v.fechaEmision).toLocaleDateString("es-DO")}
                </TableCell>
                <TableCell className="text-right font-medium">{formatDOP(v.total)}</TableCell>
                <TableCell>
                  {v.tipo === "FACTURADA" && v.estadoPago && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={pagoStyle[v.estadoPago] ?? pagoStyle.PENDIENTE}
                    >
                      {pagoLabel[v.estadoPago] ?? v.estadoPago}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/ventas/${v.id}`}
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
              href={`/ventas?tipo=${tipo}&q=${busqueda}&sortBy=${sortBy}&sortDir=${sortDir}&page=${p}`}
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
