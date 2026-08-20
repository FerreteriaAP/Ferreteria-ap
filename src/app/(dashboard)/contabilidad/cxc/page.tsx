import Link from "next/link";
import { getCxCPorCliente } from "@/actions/contabilidad";
import { getCobrosPendientesConfirmacion } from "@/actions/caja";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { CobroConfirmarBtn, CobrosTodosConfirmarBtn } from "@/components/contabilidad/cobros-cliente-confirmar-btn";
import { CxCMultiSelect } from "@/components/contabilidad/cxc-multi-select";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; todas?: string }>;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "💵 Efectivo", TARJETA: "💳 Tarjeta",
  TRANSFERENCIA: "🏦 Transferencia", CHEQUE: "📄 Cheque",
};

export default async function CxCContabilidadPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const busqueda    = params.q ?? "";
  const mostrarTodas = params.todas === "1";

  const [grupos, cobrosPendientes] = await Promise.all([
    getCxCPorCliente({ mostrarTodas, busqueda }),
    getCobrosPendientesConfirmacion(),
  ]);

  const totalGeneral  = grupos.reduce((s, g) => s + g.totalSaldo,   0);
  const totalVencido  = grupos.reduce((s, g) => s + g.totalVencido, 0);
  const totalFacturas = grupos.reduce((s, g) => s + g.facturas.length, 0);

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
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
          </div>
          <h1 className="text-2xl font-bold mt-1">Cuentas por Cobrar</h1>
          <p className="text-sm text-muted-foreground">
            {grupos.length} cliente{grupos.length !== 1 ? "s" : ""} · {totalFacturas} factura{totalFacturas !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={mostrarTodas ? "/contabilidad/cxc" : "/contabilidad/cxc?todas=1"}
          className={cn(buttonVariants({ variant: mostrarTodas ? "default" : "outline", size: "sm" }))}
        >
          {mostrarTodas ? "Ver solo pendientes" : "Ver todas (incl. pagadas)"}
        </Link>
      </div>

      {/* Cobros pendientes de confirmación */}
      {cobrosPendientes.length > 0 && (() => {
        const totalPendiente = cobrosPendientes.reduce((s, c) => s + c.monto, 0);
        const todosIds = cobrosPendientes.map(c => c.id);
        return (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  Pagos pendientes de verificación
                </h2>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {cobrosPendientes.length} pago{cobrosPendientes.length !== 1 ? "s" : ""} — confirma para aplicarlos a las facturas
                </p>
              </div>
              <CobrosTodosConfirmarBtn movimientoIds={todosIds} totalMonto={totalPendiente} totalCobros={cobrosPendientes.length} />
            </div>
            {cobrosPendientes.map(c => (
              <div key={c.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-amber-100 dark:border-amber-900/40 last:border-0">
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.cxcInfo ? (
                      <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-hex)" }}>
                        {c.cxcInfo.venta.numero}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{c.concepto}</span>
                    )}
                    {c.cxcInfo?.cliente?.nombre && (
                      <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        · {c.cxcInfo.cliente.nombre}
                      </span>
                    )}
                    {c.cxcInfo?.cliente?.rnc && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">{c.cxcInfo.cliente.rnc}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{new Date(c.fecha).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{c.turno.usuario.nombre} {c.turno.usuario.apellido}</span>
                    {c.metodo && (
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {METODO_LABEL[c.metodo] ?? c.metodo}
                      </span>
                    )}
                    {c.notas && <span>· {c.notas}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                    {fmt(c.monto)}
                  </span>
                  <CobroConfirmarBtn movimientoId={c.id} monto={c.monto} />
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))" }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total pendiente</p>
          <p className="text-2xl font-bold" style={{ color: "var(--accent-hex)" }}>{fmt(totalGeneral)}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Vencido</p>
          <p className="text-2xl font-bold text-destructive">{fmt(totalVencido)}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: "color-mix(in oklch, #16a34a 8%, var(--card))", borderColor: "color-mix(in oklch, #16a34a 30%, var(--border))" }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Al día</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalGeneral - totalVencido)}</p>
        </div>
      </div>

      {/* Buscador */}
      <form method="GET">
        {mostrarTodas && <input type="hidden" name="todas" value="1" />}
        <Input name="q" defaultValue={busqueda} placeholder="Buscar cliente o número de factura..." className="max-w-sm" />
      </form>

      {/* Lista */}
      {grupos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-medium text-lg">Sin cuentas pendientes</p>
          <p className="text-sm mt-1">Todos los clientes están al día</p>
        </div>
      ) : (
        <CxCMultiSelect grupos={grupos} />
      )}
    </div>
  );
}
