import Link from "next/link";
import { getNotasCredito } from "@/actions/nota-credito";

interface PageProps {
  searchParams: Promise<{ q?: string; estado?: string }>;
}

export const metadata = { title: "Notas de Crédito — Caja — Ferretería AP" };

const fmt = (n: number | string) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  APLICADA: {
    label: "Aplicada",
    cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  },
};

export default async function NotasCreditoCajaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const estado = params.estado ?? "TODOS";

  const { items, total } = await getNotasCredito({ q, estado });

  const totalMonto = items.reduce((s, nc) => s + Number(nc.monto), 0);
  const totalPendiente = items
    .filter(nc => nc.estado === "PENDIENTE")
    .reduce((s, nc) => s + Number(nc.monto), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/caja"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full transition-all hover:brightness-110"
              style={{
                backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
                color: "var(--accent-hex)",
                border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)",
              }}
            >
              ← Caja
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-1">Notas de Crédito</h1>
          <p className="text-sm text-muted-foreground">
            {total} nota{total !== 1 ? "s" : ""}
            {totalMonto > 0 && (
              <> · {fmt(totalMonto)} en créditos emitidos</>
            )}
          </p>
        </div>
      </div>

      {/* Resumen rápido */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Total emitido</p>
            <p className="text-base font-bold font-mono mt-0.5">{fmt(totalMonto)}</p>
          </div>
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <p className="text-xs text-amber-700 dark:text-amber-400">Saldo pendiente</p>
            <p className="text-base font-bold font-mono mt-0.5 text-amber-800 dark:text-amber-300">
              {fmt(totalPendiente)}
            </p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 px-3 py-2.5">
            <p className="text-xs text-green-700 dark:text-green-400">Aplicadas</p>
            <p className="text-base font-bold font-mono mt-0.5 text-green-800 dark:text-green-300">
              {items.filter(nc => nc.estado === "APLICADA").length}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form method="GET" className="flex gap-2 flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por número, cliente, factura o motivo…"
            className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {estado !== "TODOS" && <input type="hidden" name="estado" value={estado} />}
          <button
            type="submit"
            className="h-9 px-4 rounded-lg border bg-muted text-sm font-medium hover:bg-accent transition-colors"
          >
            Buscar
          </button>
          {q && (
            <Link
              href={estado !== "TODOS" ? `/caja/notas-credito?estado=${estado}` : "/caja/notas-credito"}
              className="h-9 px-3 rounded-lg border text-sm font-medium hover:bg-accent transition-colors flex items-center text-muted-foreground"
            >
              Limpiar
            </Link>
          )}
        </form>

        {/* Filtro estado */}
        <div className="flex gap-1.5">
          {(["TODOS", "PENDIENTE", "APLICADA"] as const).map((e) => (
            <Link
              key={e}
              href={q ? `/caja/notas-credito?estado=${e}&q=${encodeURIComponent(q)}` : `/caja/notas-credito?estado=${e}`}
              className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                estado === e
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              {e === "TODOS" ? "Todas" : e === "PENDIENTE" ? "Pendientes" : "Aplicadas"}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla / Lista */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <h2 className="font-semibold text-sm">Notas de crédito emitidas</h2>
          {items.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <p className="text-sm font-medium">
              {q || estado !== "TODOS" ? "Sin resultados para esta búsqueda" : "No hay notas de crédito registradas"}
            </p>
            {!q && estado === "TODOS" && (
              <p className="text-xs mt-1">Las notas de crédito se crean desde el módulo de Caja</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {items.map((nc) => {
              const badge = ESTADO_BADGE[nc.estado] ?? {
                label: nc.estado,
                cls: "bg-muted text-muted-foreground",
              };
              return (
                <div key={nc.id} className="px-4 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">

                    {/* Info principal */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color: "var(--accent-hex)" }}
                        >
                          {nc.numero}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(nc.createdAt)}
                        </span>
                      </div>

                      {/* Cliente */}
                      <p className="text-sm font-semibold">{nc.cliente.nombre}</p>
                      {nc.cliente.rnc && (
                        <p className="text-xs text-muted-foreground">{nc.cliente.rnc}</p>
                      )}

                      {/* Factura original */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Factura original:</span>
                        <Link
                          href={`/ventas/${nc.venta.id}`}
                          className="font-mono font-bold hover:underline"
                          style={{ color: "var(--accent-hex)" }}
                        >
                          {nc.venta.numero}
                        </Link>
                      </div>

                      {/* Motivo */}
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Motivo:</span> {nc.motivo}
                      </p>

                      {/* Notas */}
                      {nc.notas && (
                        <p className="text-xs text-muted-foreground italic">{nc.notas}</p>
                      )}

                      {/* Usuario */}
                      <p className="text-xs text-muted-foreground">
                        Emitida por: {nc.usuario.nombre} {nc.usuario.apellido}
                      </p>
                    </div>

                    {/* Monto */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold font-mono">{fmt(Number(nc.monto))}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">crédito a favor</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {total > items.length && (
        <p className="text-xs text-center text-muted-foreground">
          Mostrando {items.length} de {total} notas de crédito
        </p>
      )}
    </div>
  );
}
