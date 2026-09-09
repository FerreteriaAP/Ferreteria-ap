import { getTopProductos } from "@/actions/contabilidad";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ año?: string; mes?: string }>;
}

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt   = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct   = (n: number) => `${n.toFixed(1)}%`;

function colorMargen(m: number) {
  if (m >= 25) return "text-green-700 dark:text-green-400";
  if (m >= 12) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
}

export default async function TodosProductosPage({ searchParams }: PageProps) {
  const now      = new Date();
  const params   = await searchParams;
  const año      = Number(params.año ?? now.getFullYear());
  const mes      = params.mes !== undefined ? Number(params.mes) : (now.getMonth() + 1);

  const productos = await getTopProductos({ año, mes, limit: 9999 });

  const etiqueta  = mes ? `${MESES[mes]} ${año}` : `Año ${año}`;
  const backHref  = `/contabilidad/analiticas?año=${año}&mes=${mes}`;

  const totalFacturado = productos.reduce((s, p) => s + p.totalFacturado, 0);
  const totalCogs      = productos.reduce((s, p) => s + p.cogs, 0);
  const totalGanancia  = productos.reduce((s, p) => s + p.ganancia, 0);

  const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
  const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="space-y-0.5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full transition-all hover:brightness-110"
          style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)", color: "var(--accent-hex)", border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)" }}
        >
          ← Analíticas
        </Link>
        <h1 className="text-2xl font-bold mt-1">Todos los productos</h1>
        <p className="text-sm text-muted-foreground">{etiqueta} · {productos.length} producto{productos.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
          <h2 className="font-semibold text-sm">Ventas por producto — {etiqueta}</h2>
        </div>

        {productos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Sin ventas en el período seleccionado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Producto</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cantidad</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Total facturado</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">COGS</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ganancia</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">% sobre costo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productos.map((p, idx) => (
                  <tr key={p.productoId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{p.nombre}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{p.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.categoria}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.cantidad.toLocaleString("es-DO", { maximumFractionDigits: 2 })}
                      <span className="text-[10px] opacity-60 ml-0.5">{p.unidad}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-medium">{fmt(p.totalFacturado)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">({fmt(p.cogs)})</td>
                    <td className={cn("px-4 py-3 text-right font-mono text-xs font-semibold",
                      p.ganancia >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}>
                      {fmt(p.ganancia)}
                    </td>
                    <td className={cn("px-4 py-3 text-right text-xs font-bold", colorMargen(p.margen))}>
                      {pct(p.margen)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td colSpan={4} className="px-5 py-3 font-bold text-sm">Total general</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-xs">{fmt(totalFacturado)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">({fmt(totalCogs)})</td>
                  <td className={cn("px-4 py-3 text-right font-mono font-bold text-xs",
                    totalGanancia >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}>
                    {fmt(totalGanancia)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
