import Link from "next/link";
import { getResumenITBIS } from "@/actions/contabilidad";
import { getPagosImpuesto } from "@/actions/impuestos";
import { PagosImpuestosEditor } from "@/components/contabilidad/pagos-impuestos-editor";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ año?: string; mes?: string }>;
}

const MESES_COMPLETOS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

export default async function ImpuestosPage({ searchParams }: PageProps) {
  const now = new Date();
  const params = await searchParams;
  const año = Number(params.año ?? now.getFullYear());
  const mes = Number(params.mes ?? (now.getMonth() + 1));

  const [data, pagosOtros] = await Promise.all([
    getResumenITBIS({ año, mes }),
    getPagosImpuesto(mes, año),
  ]);

  const añosDisp = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i);

  const itbisCompras = data.totalPagado;
  const itbisGastos = 0;
  const itbisAcreditable = itbisCompras + itbisGastos;
  const totalOtros = Object.values(pagosOtros).reduce((s, p) => s + (p?.monto ?? 0), 0);
  const cargaFiscalTotal = data.neto + totalOtros;

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
          <h1 className="text-2xl font-bold mt-1">Reporte de Impuestos</h1>
          <p className="text-sm text-muted-foreground">{MESES_COMPLETOS[mes]} {año} — ITBIS + ISR + cargas laborales</p>
        </div>
        <form method="GET" className="flex gap-2 flex-wrap">
          <select name="año" defaultValue={año}
            className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {añosDisp.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select name="mes" defaultValue={mes}
            className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {MESES_COMPLETOS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <button type="submit" className="h-8 px-3 rounded-md border bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Filtrar
          </button>
        </form>
      </div>

      {/* KPI carga fiscal total */}
      {cargaFiscalTotal > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: CARD_BG }}>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">ITBIS neto DGII</p>
            <p className={cn("text-xl font-bold font-mono", data.neto > 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
              {fmt(Math.abs(data.neto))}
            </p>
            <p className="text-[10px] text-muted-foreground">{data.neto > 0 ? "A pagar" : "Crédito fiscal"}</p>
          </div>
          <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: CARD_BG }}>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Otros impuestos</p>
            <p className="text-xl font-bold font-mono">{fmt(totalOtros)}</p>
            <p className="text-[10px] text-muted-foreground">ISR + Anticipo + Infotep + TSS</p>
          </div>
          <div className="col-span-2 rounded-xl border p-4 space-y-1"
            style={{
              backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))",
              borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))",
            }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Carga fiscal total estimada</p>
            <p className="text-2xl font-bold font-mono" style={{ color: "var(--accent-hex)" }}>{fmt(cargaFiscalTotal)}</p>
            <p className="text-[10px] text-muted-foreground">ITBIS neto + ISR + Anticipo + Infotep + TSS</p>
          </div>
        </div>
      )}

      {/* Bloque ITBIS */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
          <h2 className="font-semibold text-sm">ITBIS — {MESES_COMPLETOS[mes]} {año}</h2>
        </div>

        {/* KPIs ITBIS */}
        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-yellow-400/40 p-4 space-y-1" style={{ backgroundColor: "color-mix(in oklch, #eab308 6%, var(--card))" }}>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">ITBIS cobrado</p>
            <p className="text-2xl font-bold font-mono text-yellow-700 dark:text-yellow-400">{fmt(data.totalCobrado)}</p>
            <p className="text-xs text-muted-foreground">{data.ventas.length} factura{data.ventas.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: CARD_BG }}>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">ITBIS de compras</p>
            <p className="text-2xl font-bold font-mono">{fmt(itbisCompras)}</p>
            <p className="text-xs text-muted-foreground">{data.compras.length} compra{data.compras.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border border-dashed p-4 space-y-1" style={{ backgroundColor: CARD_BG }}>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">ITBIS de gastos</p>
            <p className="text-2xl font-bold font-mono text-muted-foreground">{fmt(itbisGastos)}</p>
            <p className="text-xs text-muted-foreground">Pendiente en form. de gastos</p>
          </div>
          <div className={cn("rounded-xl border p-4 space-y-1",
            data.neto > 0 ? "border-destructive/30" : "border-green-500/30")}
            style={{ backgroundColor: data.neto > 0 ? "color-mix(in oklch, var(--destructive) 6%, var(--card))" : "color-mix(in oklch, #16a34a 6%, var(--card))" }}>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              {data.neto > 0 ? "ITBIS a pagar DGII" : "Crédito fiscal"}
            </p>
            <p className={cn("text-2xl font-bold font-mono", data.neto > 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
              {fmt(Math.abs(data.neto))}
            </p>
            <p className="text-xs text-muted-foreground">Cobrado − ({fmt(itbisAcreditable)} acreditable)</p>
          </div>
        </div>

        {/* Balance visual ITBIS */}
        {(data.totalCobrado > 0 || data.totalPagado > 0) && (
          <div className="px-5 pb-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Balance ITBIS</p>
            {[
              { label: "Cobrado en ventas",  monto: data.totalCobrado, color: "#eab308" },
              { label: "ITBIS de compras",   monto: itbisCompras,       color: "var(--accent-hex)" },
              { label: "ITBIS de gastos",    monto: itbisGastos,        color: "#8b5cf6" },
            ].map((row) => {
              const maxMonto = Math.max(data.totalCobrado, data.totalPagado, 1);
              const w = Math.min(Math.round((row.monto / maxMonto) * 100), 100);
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-40 text-right shrink-0">{row.label}</span>
                  <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: row.color, opacity: 0.7 }} />
                  </div>
                  <span className="text-xs font-mono w-36 shrink-0 text-right">{fmt(row.monto)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Detalle compras con ITBIS */}
        {data.compras.length > 0 && (
          <div className="border-t">
            <div className="px-5 py-3" style={{ backgroundColor: HEADER_BG }}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalle — ITBIS de compras</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Compra</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Suplidor</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">NCF</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Base</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">ITBIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.compras.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <Link href={`/compras/${c.compraId}`} className="font-mono text-xs font-medium hover:underline" style={{ color: "var(--accent-hex)" }}>
                          {c.numero}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <div>{c.suplidor.nombre}</div>
                        {c.suplidor.rnc && <div className="text-muted-foreground">RNC: {c.suplidor.rnc}</div>}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">{c.ncf ?? "—"}</td>
                      <td className="py-2.5 px-4 text-xs">{new Date(c.fecha).toLocaleDateString("es-DO")}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs">{fmt(c.subtotal)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold">{fmt(c.itbis)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={4} className="py-2.5 px-4 font-bold text-xs">Total compras</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-bold">
                      {fmt(data.compras.reduce((s, c) => s + c.subtotal, 0))}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-bold">{fmt(data.totalPagado)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {data.ventas.length === 0 && data.compras.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3 text-muted-foreground/30">—</div>
            <p className="font-medium">Sin movimientos de ITBIS en {MESES_COMPLETOS[mes]} {año}</p>
          </div>
        )}
      </div>

      {/* ISR · Anticipo · Infotep · TSS */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
          <h2 className="font-semibold text-sm">Otros impuestos y cargas — {MESES_COMPLETOS[mes]} {año}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Registra los montos pagados mensualmente para llevar el control fiscal completo</p>
        </div>
        <div className="p-5">
          <PagosImpuestosEditor mes={mes} anio={año} pagos={pagosOtros} />
        </div>
      </div>
    </div>
  );
}
