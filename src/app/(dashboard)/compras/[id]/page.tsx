import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCompra } from "@/actions/compras";
import { eliminarCompra } from "@/actions/compras";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { CreditCard } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG  = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";
const ACCENT   = "var(--accent-hex)";

const ESTADO_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDIENTE:      { bg: "color-mix(in oklch, var(--destructive) 12%, var(--card))", text: "var(--destructive)", label: "Pendiente" },
  PAGADO_PARCIAL: { bg: "color-mix(in oklch, #f97316 12%, var(--card))", text: "#f97316", label: "Pago parcial" },
  PAGADO:         { bg: "color-mix(in oklch, #16a34a 12%, var(--card))", text: "#16a34a", label: "Pagado" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Sub-components ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
      <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KV({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right ${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function CompraPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const compra = await getCompra(id);
  if (!compra) notFound();

  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rolUsuario = ((session?.user) as any)?.rol ?? "";

  const totalPagado = compra.pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldo = Number(compra.total) - totalPagado;
  const estado = ESTADO_STYLE[compra.estadoPago] ?? ESTADO_STYLE["PENDIENTE"];

  const backHref  = from === "cxp" ? "/contabilidad/cxp" : "/compras";
  const backLabel = from === "cxp" ? "Cuentas por pagar" : "Compras";

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Pill back ── */}
      <Link href={backHref}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted/40 transition-colors">
        ← {backLabel}
      </Link>

      {/* ── Header card ── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        {/* Title row */}
        <div className="px-6 py-5 border-b" style={{ backgroundColor: HEADER_BG }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-mono tracking-tight">{compra.numero}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: estado.bg, color: estado.text }}>
              {estado.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {compra.suplidor.nombre}
            {compra.noFacturaSuplidor ? ` — Factura ${compra.noFacturaSuplidor}` : ""}
            {compra.ncf ? ` — NCF: ${compra.ncf}` : ""}
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: "Total factura",    value: fmt(compra.total),  accent: false },
            { label: "Total pagado",     value: fmt(totalPagado),   accent: false },
            { label: "Saldo pendiente",  value: fmt(saldo),         accent: saldo > 0 },
          ].map(({ label, value, accent }) => (
            <div key={label} className="px-5 py-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-lg font-bold font-mono"
                style={accent ? { color: "var(--destructive)" } : { color: ACCENT }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Datos de la factura ── */}
      <Section title="Datos de la factura">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">
          <KV label="Suplidor"        value={compra.suplidor.nombre} />
          {compra.suplidor.rnc
            ? <KV label="RNC"         value={compra.suplidor.rnc} mono />
            : <div />}
          <KV label="Fecha de factura" value={fmtDate(compra.fechaFactura)} />
          <KV label="Vencimiento"      value={fmtDate(compra.fechaVencimiento)} />
          {(compra.tipoNcfCompra && compra.tipoNcfCompra !== "none")
            ? <KV label="Tipo NCF"    value={compra.tipoNcfCompra} mono />
            : <div />}
          {compra.ncf
            ? <KV label="NCF"         value={compra.ncf} mono />
            : <div />}
          {compra.notas && (
            <div className="col-span-2 mt-1 rounded-lg border p-3 text-sm text-muted-foreground"
              style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
              {compra.notas}
            </div>
          )}
        </div>
      </Section>

      {/* ── Productos ── */}
      <Section title="Productos comprados">
        <div className="rounded-xl border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            {/* Cabecera */}
            <thead>
              <tr className="border-b text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                style={{ backgroundColor: HEADER_BG }}>
                <th className="px-4 py-2.5 text-left  w-[110px]">Código</th>
                <th className="px-4 py-2.5 text-left">Producto</th>
                <th className="px-4 py-2.5 text-right w-[80px]">Cant.</th>
                <th className="px-4 py-2.5 text-right w-[130px]">Costo unit.</th>
                <th className="px-4 py-2.5 text-right w-[120px]">ITBIS</th>
                <th className="px-4 py-2.5 text-right w-[140px]">Total</th>
              </tr>
            </thead>

            {/* Filas */}
            <tbody>
              {compra.detalles.map(d => {
                const cant       = Number(d.cantidad);
                const costoUnit  = Number(d.costo);
                const itbisLinea = Number(d.itbis);
                const totalLinea = Number(d.subtotal) + itbisLinea;
                return (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 w-[110px]">
                      <span className="font-mono text-xs text-muted-foreground">{d.producto.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/productos/${d.producto.id}`} className="font-medium hover:underline">
                        {d.producto.nombre}
                      </Link>
                      {d.costoAnterior && Number(d.costoAnterior) !== costoUnit && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "color-mix(in oklch, var(--destructive) 12%, var(--card))", color: "var(--destructive)" }}>
                          Antes: {fmt(d.costoAnterior)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right w-[80px]">
                      <span className="font-mono">{cant.toLocaleString("es-DO")}</span>
                    </td>
                    <td className="px-4 py-3 text-right w-[130px]">
                      <span className="font-mono">{fmt(costoUnit)}</span>
                    </td>
                    <td className="px-4 py-3 text-right w-[120px]">
                      <span className="font-mono text-muted-foreground">{fmt(itbisLinea)}</span>
                    </td>
                    <td className="px-4 py-3 text-right w-[140px]">
                      <span className="font-mono font-bold">{fmt(totalLinea)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>

          {/* Pie de totales — fuera de la tabla para evitar colapso de columnas */}
          <div className="border-t" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
            <div className="flex justify-end items-center gap-6 px-4 py-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Subtotal</span>
              <span className="font-mono text-sm w-36 text-right">{fmt(compra.subtotal)}</span>
            </div>
            <div className="flex justify-end items-center gap-6 px-4 py-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">ITBIS</span>
              <span className="font-mono text-sm w-36 text-right">{fmt(compra.itbis)}</span>
            </div>
            <div className="flex justify-end items-center gap-6 px-4 py-3 border-t-2">
              <span className="text-xs font-bold uppercase tracking-wide">Total factura</span>
              <span className="font-mono font-bold text-base w-36 text-right" style={{ color: ACCENT }}>{fmt(compra.total)}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Pagos ── */}
      <Section title="Historial de pagos">
        {compra.pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {compra.pagos.map(p => (
              <div key={p.id}
                className="flex items-center justify-between rounded-lg border p-3 gap-4"
                style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard size={14} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold font-mono text-sm">{fmt(p.monto)}</span>
                    <span className="text-muted-foreground text-xs ml-2">{p.metodo}</span>
                    {p.cuenta && (
                      <span className="text-xs text-muted-foreground ml-1">— {p.cuenta.banco} {p.cuenta.nombre}</span>
                    )}
                    {p.referencia && (
                      <span className="text-xs text-muted-foreground ml-1">({p.referencia})</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmtDate(p.fecha)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Eliminar — solo admin, sin pagos ── */}
      {rolUsuario === "ADMINISTRADOR" && compra.pagos.length === 0 && (
        <div className="flex justify-end pt-1">
          <BtnEliminarDocumento
            id={id}
            documento={compra.numero}
            accion={eliminarCompra}
            label="Eliminar compra"
            variant="ghost"
          />
        </div>
      )}
    </div>
  );
}
