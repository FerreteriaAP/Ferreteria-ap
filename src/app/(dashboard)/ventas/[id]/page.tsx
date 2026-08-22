import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getVenta } from "@/actions/ventas";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AvanzarVentaButtons } from "@/components/ventas/avanzar-venta-buttons";
import { RecalcularKolmenBtn } from "@/components/ventas/recalcular-kolmen-btn";
import { ConduceDespachoBtn, NuevoConduceBtn } from "@/components/caja/conduce-despacho-btn";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { eliminarVenta } from "@/actions/ventas";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtDOP = (n: any) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

const TIPO_LABEL: Record<string, string> = {
  COTIZACION: "Cotización", ORDEN_VENTA: "Orden de Venta",
  CONDUCE: "Conduce", FACTURADA: "Factura", CANCELADA: "Cancelada",
};

const TIPO_STYLE: Record<string, { bg: string; text: string }> = {
  COTIZACION:  { bg: "color-mix(in oklch, var(--foreground) 6%, var(--card))", text: "var(--muted-foreground)" },
  ORDEN_VENTA: { bg: "color-mix(in oklch, #3b82f6 10%, var(--card))",          text: "#3b82f6" },
  CONDUCE:     { bg: "color-mix(in oklch, #a855f7 10%, var(--card))",          text: "#a855f7" },
  FACTURADA:   { bg: "color-mix(in oklch, #16a34a 10%, var(--card))",          text: "#16a34a" },
  CANCELADA:   { bg: "color-mix(in oklch, #dc2626 10%, var(--card))",          text: "#dc2626" },
};

const CRED_LABEL: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
  DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

const PASOS = ["COTIZACION", "ORDEN_VENTA", "CONDUCE", "FACTURADA"];

function WorkflowStepper({ tipo }: { tipo: string }) {
  const cancelada = tipo === "CANCELADA";
  const currentIdx = PASOS.indexOf(tipo);
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {PASOS.map((paso, i) => {
        const done    = currentIdx > i;
        const current = tipo === paso;
        return (
          <div key={paso} className="flex items-center">
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border"
              style={{
                backgroundColor: cancelada
                  ? "color-mix(in oklch, #dc2626 8%, var(--card))"
                  : current
                  ? "color-mix(in oklch, var(--accent-hex) 14%, var(--card))"
                  : done
                  ? "color-mix(in oklch, var(--accent-hex) 6%, var(--card))"
                  : "transparent",
                borderColor: cancelada
                  ? "color-mix(in oklch, #dc2626 25%, var(--border))"
                  : current
                  ? "var(--accent-hex)"
                  : done
                  ? "color-mix(in oklch, var(--accent-hex) 30%, var(--border))"
                  : "var(--border)",
                color: cancelada
                  ? "#dc2626"
                  : current
                  ? "var(--accent-hex)"
                  : done
                  ? "color-mix(in oklch, var(--accent-hex) 70%, var(--foreground))"
                  : "var(--muted-foreground)",
              }}
            >
              {TIPO_LABEL[paso]}
            </div>
            {i < PASOS.length - 1 && (
              <div
                className="h-px w-4 sm:w-6 shrink-0"
                style={{
                  backgroundColor: done && !cancelada
                    ? "color-mix(in oklch, var(--accent-hex) 35%, var(--border))"
                    : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function printHref(tipo: string, id: string): string {
  if (tipo === "COTIZACION")  return `/ventas/${id}/imprimir/cotizacion`;
  if (tipo === "ORDEN_VENTA") return `/ventas/${id}/imprimir/cotizacion`;
  if (tipo === "CONDUCE")     return `/ventas/${id}/imprimir/conduce`;
  if (tipo === "FACTURADA")   return `/ventas/${id}/imprimir/factura`;
  return "#";
}

export default async function VentaPage({ params, searchParams }: PageProps) {
  const { id }   = await params;
  const { from } = await searchParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const venta = (await getVenta(id)) as any;
  if (!venta) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPagado = venta.pagosRecibidos.reduce((s: number, p: any) => s + Number(p.monto), 0);
  const saldo       = Number(venta.total) - totalPagado;

  const ultimoConduce   = venta.conduces?.[0] ?? null;
  const conduceId       = ultimoConduce?.id ?? undefined;
  const conduceRecibido = ultimoConduce?.clienteRecibio ?? false;

  const session    = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rolUsuario = ((session?.user) as any)?.rol ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todosEntregados =
    venta.conduces.length > 0 &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    venta.conduces.every((c: any) => c.clienteRecibio);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detallesParaConduce = venta.detalles.map((d: any) => ({
    productoId: d.productoId,
    nombre:     d.descripcion || d.producto.nombre,
    unidad:     d.unidad ?? d.producto.unidadMedida ?? "",
    cantidad:   Number(d.cantidad),
  }));

  const est = TIPO_STYLE[venta.tipo] ?? TIPO_STYLE.COTIZACION;

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Volver */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={from === "cxc" ? "/contabilidad/cxc" : "/ventas"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 14%, transparent)",
            color: "var(--accent-hex)",
          }}
        >
          ← {from === "cxc" ? "Cuentas por cobrar" : "Ventas"}
        </Link>
      </div>

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--accent-hex)" }}>
              {venta.numero}
            </h1>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: est.bg, color: est.text }}
            >
              {TIPO_LABEL[venta.tipo] ?? venta.tipo}
            </span>
          </div>
          <WorkflowStepper tipo={venta.tipo} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {venta.cliente.nombre}
            {venta.cliente.rnc && <span className="ml-2 font-mono text-xs opacity-70">{venta.cliente.rnc}</span>}
          </p>
        </div>

        {/* Botones imprimir / nueva cotización */}
        <div className="flex items-center gap-2 flex-wrap">
          {venta.tipo !== "CANCELADA" && (
            <Link
              href={printHref(venta.tipo, id)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:brightness-105"
              style={{
                backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))",
                color: "var(--accent-hex)",
                borderColor: "var(--accent-hex)",
              }}
            >
              ⎙ Imprimir {TIPO_LABEL[venta.tipo]}
            </Link>
          )}
          {["ORDEN_VENTA","CONDUCE","FACTURADA"].includes(venta.tipo) && (
            <Link
              href={`/ventas/${id}/imprimir/cotizacion`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              style={{ borderColor: "var(--border)" }}
            >
              Cotización
            </Link>
          )}
          {["CONDUCE","FACTURADA"].includes(venta.tipo) && (
            <Link
              href={`/ventas/${id}/imprimir/conduce`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              style={{ borderColor: "var(--border)" }}
            >
              Conduce
            </Link>
          )}
          {venta.cliente.reglaPrecio === "MARGEN_COSTO" &&
            !["FACTURADA","CANCELADA"].includes(venta.tipo) && (
            <RecalcularKolmenBtn
              ventaId={id}
              margen={Number(venta.cliente.margenPrecio ?? 15)}
            />
          )}
          <Link
            href="/ventas/nueva"
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            style={{ borderColor: "var(--border)" }}
          >
            + Nueva
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: CARD_BG }}>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Subtotal</p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">{fmtDOP(venta.subtotal)}</p>
          {Number(venta.descuento) > 0 && (
            <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
              Descuento: −{fmtDOP(venta.descuento)}
            </p>
          )}
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: CARD_BG }}>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>ITBIS (18%)</p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">{fmtDOP(venta.itbis)}</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            Condición: {CRED_LABEL[venta.credito] ?? venta.credito}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))",
            borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Total</p>
          <p className="text-xl font-bold mt-1.5 tabular-nums" style={{ color: "var(--accent-hex)" }}>
            {fmtDOP(venta.total)}
          </p>
          {venta.pagosRecibidos.length > 0 && (
            <p className="text-[10px] mt-1" style={{ color: saldo > 0 ? "#dc2626" : "#16a34a" }}>
              Saldo: {fmtDOP(saldo)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Columna izquierda — datos + productos + conduces + pagos */}
        <div className="lg:col-span-2 space-y-4">

          {/* Datos del documento */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HEADER_BG }}>
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                Datos del documento
              </h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-y-2 text-sm">
              {[
                { label: "Cliente", value: (
                  <div className="flex items-center gap-2">
                    <Link href={`/contactos/${venta.cliente.id}`} className="hover:underline font-medium">
                      {venta.cliente.nombre}
                    </Link>
                    {venta.cliente.reglaPrecio === "MARGEN_COSTO" && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                        style={{ backgroundColor: "color-mix(in oklch, #ca8a04 10%, var(--card))", color: "#ca8a04", borderColor: "color-mix(in oklch, #ca8a04 25%, var(--border))" }}
                      >
                        precio especial
                      </span>
                    )}
                  </div>
                )},
                ...(venta.cliente.rnc ? [{ label: "RNC", value: <span className="font-mono">{venta.cliente.rnc}</span> }] : []),
                { label: "Fecha emisión", value: new Date(venta.fechaEmision).toLocaleDateString("es-DO") },
                ...(venta.fechaVencimiento ? [{ label: "Vencimiento", value: new Date(venta.fechaVencimiento).toLocaleDateString("es-DO") }] : []),
                ...(venta.ncf ? [{ label: "NCF", value: <span className="font-mono">{venta.ncf} ({venta.tipoNcf})</span> }] : []),
                ...(venta.notas ? [{ label: "Notas", value: <span className="text-xs">{venta.notas}</span> }] : []),
              ].map((row, i) => (
                <div key={i} className="contents">
                  <span style={{ color: "var(--muted-foreground)" }}>{row.label}</span>
                  <div>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Productos */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HEADER_BG }}>
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                Productos — {venta.detalles.length} línea{venta.detalles.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-xs text-right">Cant.</TableHead>
                    <TableHead className="text-xs text-right">Precio</TableHead>
                    <TableHead className="text-xs text-right">Dscto</TableHead>
                    <TableHead className="text-xs text-right">ITBIS</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {venta.detalles.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.producto.codigo}</TableCell>
                      <TableCell>
                        <Link href={`/productos/${d.productoId}`} className="hover:underline text-sm">
                          {d.descripcion || d.producto.nombre}
                        </Link>
                        <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{d.producto.unidadMedida}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{fmtDOP(d.precio)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(d.descuento) > 0 ? `${Number(d.descuento)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{fmtDOP(d.itbis)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm">{fmtDOP(d.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Totales */}
            <div className="px-5 py-3 space-y-1 border-t text-sm" style={{ backgroundColor: HEADER_BG }}>
              <div className="flex justify-between" style={{ color: "var(--muted-foreground)" }}>
                <span>Subtotal</span><span className="tabular-nums">{fmtDOP(venta.subtotal)}</span>
              </div>
              {Number(venta.descuento) > 0 && (
                <div className="flex justify-between" style={{ color: "#dc2626" }}>
                  <span>Descuento</span><span className="tabular-nums">− {fmtDOP(venta.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: "var(--muted-foreground)" }}>
                <span>ITBIS</span><span className="tabular-nums">{fmtDOP(venta.itbis)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span>
                <span className="tabular-nums" style={{ color: "var(--accent-hex)" }}>{fmtDOP(venta.total)}</span>
              </div>
            </div>
          </div>

          {/* Conduces (FACTURADA) */}
          {venta.tipo === "FACTURADA" && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: HEADER_BG }}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#a855f7" }} />
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                    Conduces de despacho
                  </h2>
                </div>
                {!todosEntregados && (
                  <NuevoConduceBtn ventaId={id} detalles={detallesParaConduce} conduces={venta.conduces} />
                )}
              </div>
              <div className="px-5 py-4">
                {venta.conduces.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Sin conduces generados.</p>
                ) : (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {venta.conduces.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-semibold">{c.numero}</span>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {new Date(c.fechaEmision).toLocaleDateString("es-DO")}
                          </span>
                          <Link href={`/ventas/${id}/imprimir/conduce?conduceId=${c.id}`} target="_blank"
                            className="text-xs font-medium hover:underline" style={{ color: "var(--accent-hex)" }}>
                            Imprimir
                          </Link>
                        </div>
                        <ConduceDespachoBtn ventaId={id} conduceId={c.id} entregado={c.clienteRecibio} variant="card" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conduces flujo normal */}
          {venta.tipo !== "FACTURADA" && venta.conduces.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: HEADER_BG }}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#a855f7" }} />
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Conduces</h2>
                </div>
                {venta.tipo === "CONDUCE" && !todosEntregados && (
                  <NuevoConduceBtn ventaId={id} detalles={detallesParaConduce} conduces={venta.conduces} />
                )}
              </div>
              <div className="px-5 py-4 space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {venta.conduces.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold">{c.numero}</span>
                      {c.firmaChofer && (
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Chofer: {c.firmaChofer}</span>
                      )}
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {new Date(c.fechaEmision).toLocaleDateString("es-DO")}
                      </span>
                      <Link href={`/ventas/${id}/imprimir/conduce?conduceId=${c.id}`} target="_blank"
                        className="text-xs font-medium hover:underline" style={{ color: "var(--accent-hex)" }}>
                        Imprimir
                      </Link>
                    </div>
                    <ConduceDespachoBtn ventaId={id} conduceId={c.id} entregado={c.clienteRecibio} variant="card" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagos recibidos */}
          {venta.pagosRecibidos.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HEADER_BG }}>
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#16a34a" }} />
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                  Pagos recibidos
                </h2>
              </div>
              <div className="px-5 py-4 space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {venta.pagosRecibidos.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                    <div>
                      <span className="font-semibold tabular-nums">{fmtDOP(p.monto)}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{p.metodo}</span>
                      {p.referencia && (
                        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>({p.referencia})</span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(p.fecha).toLocaleDateString("es-DO")}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                  <span>Saldo pendiente</span>
                  <span className="tabular-nums" style={{ color: saldo > 0 ? "#dc2626" : "#16a34a" }}>
                    {fmtDOP(saldo)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel lateral — acciones */}
        <div className="space-y-4">

          {/* Acciones del flujo */}
          {venta.tipo !== "CANCELADA" && venta.tipo !== "FACTURADA" && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HEADER_BG }}>
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                  Acciones
                </h2>
              </div>
              <div className="p-4">
                <AvanzarVentaButtons
                  ventaId={id}
                  tipo={venta.tipo}
                  conduceId={conduceId}
                  conduceRecibido={conduceRecibido}
                  todosConducesEntregados={todosEntregados}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  conduces={venta.conduces.map((c: any) => ({
                    id:               c.id,
                    numero:           c.numero,
                    clienteRecibio:   c.clienteRecibio,
                    detallesRecepcion: c.detallesRecepcion,
                  }))}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  detalles={venta.detalles.map((d: any) => ({
                    productoId: d.productoId,
                    nombre:     d.descripcion || d.producto.nombre,
                    unidad:     d.unidad ?? d.producto.unidadMedida,
                    cantidad:   Number(d.cantidad),
                  }))}
                />
              </div>
            </div>
          )}

          {/* Eliminar — solo administrador en cotización/orden */}
          {rolUsuario === "ADMINISTRADOR" &&
            (venta.tipo === "COTIZACION" || venta.tipo === "ORDEN_VENTA") && (
            <div className="flex justify-end">
              <BtnEliminarDocumento
                id={id}
                documento={venta.numero}
                accion={eliminarVenta}
                label="Eliminar documento"
                variant="ghost"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
