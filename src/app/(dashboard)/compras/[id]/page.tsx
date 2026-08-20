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
          <KV label="Suplidor" value={compra.suplidor.nombre} />
          {compra.suplidor.rnc && <KV label="RNC" value={compra.suplidor.rnc} mono />}
          <KV label="Fecha de factura" value={fmtDate(compra.fechaFactura)} />
          <KV label="Vencimiento" value={fmtDate(compra.fechaVencimiento)} />
          {compra.tipoNcfCompra && compra.tipoNcfCompra !== "none" && (
            <KV label="Tipo NCF" value={compra.tipoNcfCompra} mono />
          )}
          {compra.ncf && <KV label="NCF" value={compra.ncf} mono />}
          <div className="col-span-2 border-t my-1" />
          <KV label="Subtotal (sin ITBIS)" value={fmt(compra.subtotal)} mono />
          <KV label="ITBIS" value={fmt(compra.itbis)} mono />
          <KV label="Total" value={fmt(compra.total)} bold mono />
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Producto</TableHead>
                <TableHead className="text-xs text-right">Cantidad</TableHead>
                <TableHead className="text-xs text-right">Costo unit.</TableHead>
                <TableHead className="text-xs text-right">ITBIS</TableHead>
                <TableHead className="text-xs text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compra.detalles.map(d => (
                <TableRow key={d.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.producto.codigo}</TableCell>
                  <TableCell>
                    <Link href={`/productos/${d.producto.id}`} className="font-medium text-sm hover:underline">
                      {d.producto.nombre}
                    </Link>
                    {d.costoAnterior && Number(d.costoAnterior) !== Number(d.costo) && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "color-mix(in oklch, var(--destructive) 12%, var(--card))", color: "var(--destructive)" }}>
                        Antes: {fmt(d.costoAnterior)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{Number(d.cantidad).toLocaleString("es-DO")}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(d.costo)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(d.itbis)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm">{fmt(d.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
