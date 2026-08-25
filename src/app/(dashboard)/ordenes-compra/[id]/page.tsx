import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrdenCompra } from "@/actions/ordenes-compra";
import { OcActions } from "@/components/ordenes-compra/oc-actions";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { eliminarOrdenCompra } from "@/actions/ordenes-compra";
import { auth } from "@/lib/auth";

export const metadata = { title: "Orden de compra" };

const ACCENT = "#f97316";
const CARD_BG  = "color-mix(in oklch, var(--card) 100%, transparent)";
const HDR_BG   = "color-mix(in oklch, #f97316 6%, var(--card))";

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  BORRADOR:         { label: "Borrador",          color: "bg-muted text-muted-foreground" },
  ENVIADA:          { label: "Enviada",            color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  RECIBIDA_PARCIAL: { label: "Recibida parcial",   color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  RECIBIDA:         { label: "Recibida",           color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  CANCELADA:        { label: "Cancelada",          color: "bg-destructive/10 text-destructive" },
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: Date | null | undefined) =>
  d == null ? "—" : new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });

export default async function OrdenCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [oc, session] = await Promise.all([getOrdenCompra(id), auth()]);
  if (!oc) notFound();

  const rolUsuario = (session?.user as { rol?: string })?.rol ?? "";
  const badge      = ESTADO_BADGE[oc.estado] ?? { label: oc.estado, color: "bg-muted text-muted-foreground" };
  const canSend    = oc.estado === "BORRADOR";
  const canReceive = oc.estado === "ENVIADA" || oc.estado === "RECIBIDA_PARCIAL";
  const canCancel  = oc.estado !== "RECIBIDA" && oc.estado !== "CANCELADA";

  const subtotal = Number(oc.subtotal);
  const itbis    = Number(oc.itbis);
  const total    = Number(oc.total);

  return (
    <div className="max-w-5xl space-y-5">

      {/* ── Volver ── */}
      <div>
        <Link
          href="/ordenes-compra"
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          style={{ backgroundColor: "color-mix(in oklch, #f97316 14%, transparent)", color: ACCENT }}
        >
          ← Órdenes de compra
        </Link>
      </div>

      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{oc.numero}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Suplidor: <strong>{oc.suplidor.nombre}</strong>
            {oc.usuario && <> · Creada por {oc.usuario.nombre}</>}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/ordenes-compra/${oc.id}/imprimir`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors hover:bg-accent"
          >
            🖨 Imprimir OC
          </Link>
          <OcActions id={oc.id} canSend={canSend} canReceive={canReceive} canCancel={canCancel} />
          {rolUsuario === "ADMINISTRADOR" && oc.estado === "BORRADOR" && (
            <BtnEliminarDocumento
              id={oc.id}
              documento={oc.numero}
              accion={eliminarOrdenCompra}
              label="Eliminar"
              variant="outline"
            />
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: CARD_BG }}>
          <p className="text-xs font-medium text-muted-foreground">Subtotal (sin ITBIS)</p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">RD$ {fmt(subtotal)}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: CARD_BG }}>
          <p className="text-xs font-medium text-muted-foreground">ITBIS 18%</p>
          <p className="text-xl font-bold mt-1.5 tabular-nums" style={{ color: ACCENT }}>
            RD$ {fmt(itbis)}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "color-mix(in oklch, #f97316 3%, var(--card))",
            borderColor:      "color-mix(in oklch, #f97316 20%, var(--border))",
          }}
        >
          <p className="text-xs font-medium text-muted-foreground">Total estimado</p>
          <p className="text-xl font-bold mt-1.5 tabular-nums" style={{ color: ACCENT }}>
            RD$ {fmt(total)}
          </p>
        </div>
      </div>

      {/* ── Datos generales ── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HDR_BG }}>
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: ACCENT }} />
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Datos de la orden</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Fecha creación</p>
            <p className="font-medium">{fmtDate(oc.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Entrega esperada</p>
            <p className="font-medium">{fmtDate(oc.fechaEntrega)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">RNC suplidor</p>
            <p className="font-medium font-mono">{oc.suplidor.rnc ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tel. suplidor</p>
            <p className="font-medium">{(oc.suplidor as { telefono?: string }).telefono ?? "—"}</p>
          </div>
          {oc.notas && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-muted-foreground mb-0.5">Notas / instrucciones</p>
              <p className="text-sm">{oc.notas}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Productos solicitados ── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: HDR_BG }}>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: ACCENT }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Productos solicitados
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{oc.detalles.length} ítem{oc.detalles.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ backgroundColor: "color-mix(in oklch, var(--muted) 30%, transparent)" }}>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Producto</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Pedido</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Recibido</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Pendiente</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Costo est.</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {oc.detalles.map((d) => {
                const recibido  = Number(d.cantRecibida);
                const pedido    = Number(d.cantidad);
                const pendiente = pedido - recibido;
                const pct       = pedido > 0 ? (recibido / pedido) * 100 : 0;
                return (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium">{d.producto.nombre}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.producto.codigo}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmt(pedido)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono text-xs">{fmt(recibido)}</div>
                      {pedido > 0 && (
                        <div className="mt-1 h-1 w-16 ml-auto bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#22c55e" }} />
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${pendiente > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {fmt(pendiente)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      RD$ {fmt(Number(d.costo))}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-bold">
                      RD$ {fmt(Number(d.subtotal))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ backgroundColor: HDR_BG }}>
                <td colSpan={5} className="px-5 py-3 text-right text-sm font-semibold text-muted-foreground">
                  Total estimado
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold text-base" style={{ color: ACCENT }}>
                  RD$ {fmt(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Compras generadas ── */}
      {oc.compras.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HDR_BG }}>
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: ACCENT }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Compras generadas</h2>
          </div>
          <div className="divide-y">
            {oc.compras.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                <div>
                  <Link href={`/compras/${c.id}`} className="font-semibold text-sm hover:underline">
                    {c.numero}
                  </Link>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.fechaFactura)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold">RD$ {fmt(Number(c.total))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.estadoPago === "PAGADO"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}>
                    {c.estadoPago === "PAGADO" ? "Pagada" : "Pendiente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
