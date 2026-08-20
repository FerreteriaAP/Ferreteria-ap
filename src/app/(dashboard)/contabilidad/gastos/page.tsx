import Link from "next/link";
import { getResumenGastos } from "@/actions/contabilidad";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ año?: string; mes?: string }>;
}

const MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_COMPLETOS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIA_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-teal-500",
  "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-amber-500",
];

const CARD_BG    = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG  = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

export default async function GastosPage({ searchParams }: PageProps) {
  const now = new Date();
  const params = await searchParams;
  const año = Number(params.año ?? now.getFullYear());
  const mes = params.mes ? Number(params.mes) : undefined;

  const data = await getResumenGastos({ año, mes });

  const añosDisp = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i);
  const maxMensual = Math.max(...data.mensual.map((m) => m.total), 1);

  const etiqueta = mes ? `${MESES_COMPLETOS[mes]} ${año}` : `Año ${año}`;

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-1">
          <Link
            href="/contabilidad"
            className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full transition-all hover:brightness-110"
            style={{
              backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
              color: "var(--accent-hex)",
              border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)",
            }}
          >
            ← Contabilidad
          </Link>
          <h1 className="text-2xl font-bold mt-1">Reporte de Gastos</h1>
          <p className="text-sm text-muted-foreground">{etiqueta}</p>
        </div>
        <form method="GET" className="flex gap-2 flex-wrap">
          <select name="año" defaultValue={año}
            className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {añosDisp.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select name="mes" defaultValue={mes ?? ""}
            className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Año completo</option>
            {MESES_COMPLETOS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <button type="submit" className="h-8 px-3 rounded-md border bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Filtrar
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))" }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total gastos</p>
          <p className="text-2xl font-bold" style={{ color: "var(--accent-hex)" }}>{fmt(data.totalGeneral)}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: CARD_BG }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Categorías</p>
          <p className="text-2xl font-bold">{data.porCategoria.length}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: CARD_BG }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Transacciones</p>
          <p className="text-2xl font-bold">{data.detalle.length}</p>
        </div>
      </div>

      {/* Tendencia mensual */}
      {!mes && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
          <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
            <h2 className="text-sm font-semibold">Tendencia mensual — {año}</h2>
          </div>
          <div className="p-5 space-y-2.5">
            {data.mensual.map((m) => (
              <div key={m.mes} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-7 text-right shrink-0">{MESES[m.mes]}</span>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxMensual > 0 ? (m.total / maxMensual) * 100 : 0}%`,
                      backgroundColor: "color-mix(in oklch, var(--accent-hex) 70%, transparent)",
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-32 text-right shrink-0">
                  {m.total > 0 ? fmt(m.total) : <span className="text-muted-foreground">—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por categoría */}
      {data.porCategoria.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
          <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
            <h2 className="text-sm font-semibold">Por categoría</h2>
          </div>
          <div className="p-5 space-y-4">
            {data.porCategoria.map((c, i) => (
              <div key={c.cat}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{c.cat}</span>
                  <div className="flex gap-4 items-center">
                    <span className="text-muted-foreground text-xs">{c.count} gasto{c.count !== 1 ? "s" : ""}</span>
                    <span className="font-mono text-xs font-semibold">{fmt(c.total)}</span>
                    <span className="text-muted-foreground text-xs w-10 text-right">{c.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", CATEGORIA_COLORS[i % CATEGORIA_COLORS.length])}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle de transacciones */}
      {data.detalle.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
          <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
            <h2 className="text-sm font-semibold">Detalle de gastos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Método</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.detalle.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-xs" style={{ color: "var(--accent-hex)" }}>{g.numero}</td>
                    <td className="py-2.5 px-4 text-xs">{new Date(g.fecha).toLocaleDateString("es-DO")}</td>
                    <td className="py-2.5 px-4 text-xs">{g.categoria}</td>
                    <td className="py-2.5 px-4 text-xs">{g.descripcion}</td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">{g.metodo ?? "—"}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold">{fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={5} className="py-2.5 px-4 font-bold text-xs">Total</td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs font-bold">{fmt(data.totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {data.detalle.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-medium">Sin gastos registrados en el período</p>
        </div>
      )}
    </div>
  );
}
