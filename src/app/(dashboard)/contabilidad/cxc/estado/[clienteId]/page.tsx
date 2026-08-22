import { notFound } from "next/navigation";
import Link from "next/link";
import { getEstadoCuenta } from "@/actions/contabilidad";
import { PdfButton } from "@/components/contabilidad/pdf-button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Estado de cuenta" };

interface Props {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ todas?: string }>;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (d: Date | string) => new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

const CREDITO_LABELS: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
  DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

const BUCKETS = ["0-30", "30-60", "60-90", "90+"] as const;
type Bucket = typeof BUCKETS[number];

const BUCKET_STYLE: Record<Bucket, { card: string; label: string; amount: string }> = {
  "0-30":  { card: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",  label: "text-green-700 dark:text-green-400",  amount: "text-green-800 dark:text-green-300"  },
  "30-60": { card: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",  label: "text-amber-700 dark:text-amber-400",  amount: "text-amber-800 dark:text-amber-300"  },
  "60-90": { card: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", label: "text-orange-700 dark:text-orange-400", amount: "text-orange-800 dark:text-orange-300" },
  "90+":   { card: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",          label: "text-red-700 dark:text-red-400",      amount: "text-red-800 dark:text-red-300"      },
};

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

export default async function EstadoCuentaPage({ params, searchParams }: Props) {
  const { clienteId } = await params;
  const sp = await searchParams;
  const incluirPagadas = sp.todas === "1";

  const data = await getEstadoCuenta(clienteId, incluirPagadas);
  if (!data) notFound();

  const { cliente, facturas, totales, generadoEn, notasCredito } = data;

  return (
    <div className="space-y-5">

      {/* Navegación */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/contabilidad/cxc"
          className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full transition-all hover:brightness-110"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
            color: "var(--accent-hex)",
            border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)",
          }}
        >
          ← CxC
        </Link>
        <div className="flex gap-2">
          <Link
            href={incluirPagadas
              ? `/contabilidad/cxc/estado/${clienteId}`
              : `/contabilidad/cxc/estado/${clienteId}?todas=1`}
            className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            {incluirPagadas ? "Ver solo pendientes" : "Incluir pagadas"}
          </Link>
          <PdfButton href={`/contabilidad/cxc/estado/${clienteId}/imprimir${incluirPagadas ? "?todas=1" : ""}`} />
        </div>
      </div>

      {/* Encabezado del estado */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{cliente.nombre}</h1>
              {cliente.nombreLegal && cliente.nombreLegal !== cliente.nombre && (
                <p className="text-sm text-muted-foreground">{cliente.nombreLegal}</p>
              )}
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {cliente.rnc      && <p>RNC/Cédula: <strong className="text-foreground">{cliente.rnc}</strong></p>}
                {cliente.telefono && <p>Tel: {cliente.telefono}</p>}
                {cliente.email    && <p>Email: {cliente.email}</p>}
              </div>
            </div>
            <div className="sm:text-right space-y-1 text-sm">
              <p className="text-lg font-bold">Estado de Cuenta</p>
              <p className="text-muted-foreground">Generado: {fmtFecha(generadoEn)}</p>
              <p className="text-muted-foreground">
                Crédito: <strong className="text-foreground">{CREDITO_LABELS[cliente.credito] ?? cliente.credito}</strong>
              </p>
              {cliente.limiteCredito && (
                <p className="text-muted-foreground">
                  Límite: <strong className="text-foreground">{fmt(Number(cliente.limiteCredito))}</strong>
                </p>
              )}
            </div>
          </div>

          {/* KPIs aging */}
          <div className="mt-5 pt-4 border-t grid grid-cols-2 sm:grid-cols-5 gap-3">
            {BUCKETS.map((b) => {
              const monto = totales[b] ?? 0;
              const s = BUCKET_STYLE[b];
              return (
                <div key={b} className={cn("rounded-lg p-3 text-center border", s.card)}>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wide", s.label)}>{b} días</p>
                  <p className={cn("font-bold mt-0.5 text-sm tabular-nums", monto > 0 ? s.amount : "text-muted-foreground")}>
                    {monto > 0 ? fmt(monto) : "—"}
                  </p>
                </div>
              );
            })}
            {/* Total */}
            <div className="rounded-lg p-3 text-center border"
              style={{
                backgroundColor: totales.vencido > 0
                  ? "color-mix(in oklch, var(--destructive) 6%, var(--card))"
                  : "color-mix(in oklch, var(--accent-hex) 4%, var(--card))",
                borderColor: totales.vencido > 0
                  ? "color-mix(in oklch, var(--destructive) 25%, var(--border))"
                  : "color-mix(in oklch, var(--accent-hex) 20%, var(--border))",
              }}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">TOTAL</p>
              <p className="font-bold mt-0.5 text-sm tabular-nums"
                style={{ color: totales.vencido > 0 ? undefined : "var(--accent-hex)" }}>
                {fmt(totales.total)}
              </p>
              {totales.vencido > 0 && (
                <p className="text-[10px] text-destructive font-medium mt-0.5">Vencido: {fmt(totales.vencido)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notas de crédito disponibles */}
      {notasCredito.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,0.06)" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,0.1)" }}>
            <span className="text-sm font-bold" style={{ color: "#a855f7" }}>Notas de crédito disponibles</span>
            <span className="text-xs font-mono font-bold" style={{ color: "#a855f7" }}>
              Saldo a favor: {fmt(cliente.saldoFavor ?? 0)}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(168,85,247,0.2)" }}>
            {notasCredito.map(nc => (
              <div key={nc.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-sm font-bold" style={{ color: "#a855f7" }}>{nc.numero}</span>
                  <span className="text-xs text-muted-foreground ml-3">Origen: {nc.ventaNumero}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{nc.motivo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Monto original: {fmt(nc.monto)}</p>
                  <p className="text-sm font-bold font-mono" style={{ color: "#a855f7" }}>Disponible: {fmt(nc.montoRestante)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      {facturas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl"
          style={{ backgroundColor: CARD_BG }}>
          <div className="text-3xl mb-2 text-muted-foreground/30">—</div>
          <p className="font-medium">Sin cuentas pendientes</p>
          <p className="text-sm mt-1">Este cliente está al día</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ backgroundColor: HEADER_BG }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Fecha</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Factura</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monto</th>
                  {BUCKETS.map(b => (
                    <th key={b} className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {b} días
                    </th>
                  ))}
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {facturas.map((f) => (
                  <tr key={f.id} className={cn("transition-colors", f.vencida ? "hover:bg-destructive/5" : "hover:bg-muted/20")}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtFecha(f.fechaFactura)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link href={`/ventas/${f.ventaId}`} className="font-mono text-xs font-semibold hover:underline" style={{ color: "var(--accent-hex)" }}>
                        {f.numero}
                      </Link>
                      {f.ncf && (
                        <span className="font-mono text-[10px] text-muted-foreground block">
                          {f.tipoNcf && <span className="mr-1">{f.tipoNcf}</span>}{f.ncf}
                        </span>
                      )}
                      {f.pagosNc.map((p, i) => (
                        <span key={i} className="text-[10px] font-semibold block" style={{ color: "#a855f7" }}>
                          {p.referencia ? `Pagado con ${p.referencia}` : "Pagado con NC"} (−{fmt(p.monto)})
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{fmt(f.monto)}</td>
                    {BUCKETS.map(b => (
                      <td key={b} className={cn("px-3 py-3 text-right font-mono text-xs",
                        f.bucket === b && f.vencida  ? "text-destructive font-semibold" :
                        f.bucket === b && !f.vencida ? "font-semibold" :
                        "text-muted-foreground/30")}
                        style={f.bucket === b && !f.vencida ? { color: "var(--accent-hex)" } : undefined}>
                        {f.bucket === b ? fmt(f.saldo) : "—"}
                      </td>
                    ))}
                    <td className={cn("px-3 py-3 text-right font-mono text-xs font-bold", f.vencida ? "text-destructive" : "")}>
                      {fmt(f.saldo)}
                    </td>
                    <td className="px-4 py-3">
                      {f.estado === "PAGADO" && f.totalPagadoConNc > 0 ? (
                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#a855f7", backgroundColor: "rgba(168,85,247,0.12)" }}>
                          {f.pagosNc[0]?.referencia ? f.pagosNc[0].referencia : "Pagado NC"}
                        </span>
                      ) : f.vencida ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Vencida</span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Vigente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td colSpan={2} className="px-4 py-3 font-bold text-sm">
                    Totales <span className="ml-1 text-xs font-normal text-muted-foreground">{facturas.length} factura{facturas.length !== 1 ? "s" : ""}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-xs">
                    {fmt(facturas.reduce((s, f) => s + f.monto, 0))}
                  </td>
                  {BUCKETS.map(b => {
                    const t = totales[b] ?? 0;
                    return (
                      <td key={b} className={cn("px-3 py-3 text-right font-mono font-bold text-xs", t > 0 ? "text-destructive" : "text-muted-foreground")}>
                        {t > 0 ? fmt(t) : "—"}
                      </td>
                    );
                  })}
                  <td className={cn("px-3 py-3 text-right font-mono font-bold text-sm", totales.vencido > 0 ? "text-destructive" : "")}>
                    {fmt(totales.total)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {totales.vencido > 0
                      ? <span className="text-destructive font-medium">Vencido: {fmt(totales.vencido)}</span>
                      : <span className="text-green-700 dark:text-green-400 font-medium">Al día ✓</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pb-2">
        Estado de cuenta generado el {fmtFecha(generadoEn)} — Ferretería AP · ventas@ferreteria-ap.com
      </p>
    </div>
  );
}
