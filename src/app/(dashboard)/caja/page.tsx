import { getTurnoActivo, getFacturasPendientesCaja, getEmpleadosActivos } from "@/actions/caja";
import { getConsumidorFinal } from "@/actions/pdv";
import { AbrirTurnoForm } from "@/components/caja/abrir-turno-form";
import { CajaDashboard } from "@/components/caja/caja-dashboard";
import Link from "next/link";

export const metadata = { title: "Caja — Ferretería AP" };

function fmt(n: unknown) {
  return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function CajaPage() {
  const turnoActivo = await getTurnoActivo();

  const [facturas, empleados, consumidorFinal] = turnoActivo
    ? await Promise.all([getFacturasPendientesCaja(), getEmpleadosActivos(), getConsumidorFinal()])
    : [[], [], await getConsumidorFinal()];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caja</h1>
      </div>

      {turnoActivo ? (
        <>
          {/* Encabezado del turno */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                {/* Turno + pill verde */}
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">Turno #{turnoActivo.numero}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "#16a34a22",
                      color: "#16a34a",
                      border: "1px solid #16a34a55",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    Abierto
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Apertura: {fmtDate(turnoActivo.fechaApertura)}
                </p>
              </div>

              {/* Ver detalle y cerrar — amarillo neon */}
              <Link
                href={`/caja/${turnoActivo.id}`}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:brightness-110 shrink-0"
                style={{
                  backgroundColor: "#eab30820",
                  color: "#eab308",
                  border: "1px solid #eab30855",
                }}
              >
                Ver detalle y cerrar ↗
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Monto apertura" value={fmt(turnoActivo.montoApertura)} />
              <StatCard
                label="PDV pendientes"
                value={String(facturas.length)}
                highlight={facturas.length > 0}
              />
              <StatCardLink
                label="Cobros del turno"
                value={String((turnoActivo.ventas ?? []).length)}
                href={`/caja/${turnoActivo.id}/cobros`}
                hint="Ver facturas cobradas"
              />
              <StatCardLink
                label="Movimientos caja"
                value={String(turnoActivo.movimientos.length)}
                href={`/caja/${turnoActivo.id}/movimientos`}
                hint="Ver gastos, préstamos y cobros"
              />
            </div>
          </div>

          {/* Dashboard: botones de movimientos + facturas pendientes */}
          <CajaDashboard
            turnoId={turnoActivo.id}
            facturas={facturas.map(f => ({
              ...f,
              total: Number(f.total),
              subtotal: Number(f.subtotal),
              itbis: Number(f.itbis),
              cliente: { ...f.cliente, tipoComprobante: String(f.cliente.tipoComprobante) },
              detalles: f.detalles.map(d => ({
                ...d,
                cantidad: Number(d.cantidad),
                precioFinal: Number(d.precioFinal),
                subtotal: Number(d.subtotal),
                itbis: Number(d.itbis),
              })),
            }))}
            empleados={empleados}
            consumidorFinalId={consumidorFinal.id}
          />
        </>
      ) : (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Abrir nuevo turno</h2>
          <p className="text-sm text-muted-foreground">
            No hay turno activo. Ingresa el monto de apertura (efectivo en caja al inicio del turno).
          </p>
          <AbrirTurnoForm />
        </div>
      )}
    </div>
  );
}

// Stat card estático

function StatCard({ label, value, highlight }: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2.5 border ${highlight
      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
      : "bg-muted/40"}`}>
      <p className={`text-xs ${highlight ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`text-base font-bold font-mono mt-0.5 ${highlight ? "text-amber-800 dark:text-amber-300" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// Stat card clickable

function StatCardLink({ label, value, href, hint }: {
  label: string; value: string; href: string; hint?: string;
}) {
  return (
    <a
      href={href}
      title={hint}
      className="rounded-lg px-3 py-2.5 border bg-muted/40 hover:bg-accent hover:border-primary/40 transition-colors group cursor-pointer block"
    >
      <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</p>
      <p className="text-base font-bold font-mono mt-0.5">{value}</p>
    </a>
  );
}
