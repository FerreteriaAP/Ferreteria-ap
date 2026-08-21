import Link from "next/link";
import { getVentas } from "@/actions/ventas";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string }>;
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

// Estilos de pago con colores explícitos
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

export default async function VentasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const busqueda = params.q ?? "";
  const tipo     = params.tipo ?? "";
  const page     = Number(params.page ?? 1);

  const { ventas, total, pages } = await getVentas({ tipo: tipo || undefined, busqueda, page });

  const formatDOP = (n: unknown) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  const tabs = [
    { key: "",            label: "Todas"       },
    { key: "COTIZACION",  label: "Cotizaciones" },
    { key: "ORDEN_VENTA", label: "Órdenes"      },
    { key: "CONDUCE",     label: "Conduces"     },
    { key: "FACTURADA",   label: "Facturas"     },
  ];

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
        <form method="GET" className="flex-1">
          <Input
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por número, cliente, NCF..."
            className="max-w-sm"
          />
        </form>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/ventas?tipo=${t.key}&q=${busqueda}`}
              className={cn(buttonVariants({ variant: tipo === t.key ? "default" : "outline", size: "sm" }))}
            >
              {t.label}
            </Link>
          ))}
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
              <TableHead>Número</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Crédito</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
              href={`/ventas?tipo=${tipo}&q=${busqueda}&page=${p}`}
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
