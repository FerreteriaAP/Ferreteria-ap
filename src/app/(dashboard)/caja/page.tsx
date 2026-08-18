import { getTurnoActivo, getFacturasPendientesCaja, getEmpleadosActivos } from "@/actions/caja";
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

 const [facturas, empleados] = turnoActivo
 ? await Promise.all([getFacturasPendientesCaja(), getEmpleadosActivos()])
 : [[], []];

 return (
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-6"> <div className="flex items-center justify-between"> <h1 className="text-2xl font-bold">Caja</h1> </div> {turnoActivo ? (
 <> {/* Encabezado del turno */}
 <div className="rounded-xl border bg-card p-5 space-y-4"> <div className="flex items-start justify-between"> <div> <div className="flex items-center gap-2"> <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" /> <h2 className="text-lg font-semibold">Turno #{turnoActivo.numero} — Abierto</h2> </div> <p className="text-sm text-muted-foreground mt-0.5"> Apertura: {fmtDate(turnoActivo.fechaApertura)}
 </p> </div> <Link href={`/caja/${turnoActivo.id}`}
 className="text-sm text-primary hover:underline font-medium"> Ver detalle y cerrar 
 </Link> </div> <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> {/* Monto apertura — estático */}
 <StatCard label="Monto apertura" value={fmt(turnoActivo.montoApertura)} /> {/* PDV pendientes — estático con highlight */}
 <StatCard
 label="PDV pendientes" value={String(facturas.length)}
 highlight={facturas.length > 0}
 /> {/* Cobros del turno — link a página dedicada en nueva pestaña */}
 <StatCardLink
 label="Cobros del turno" value={String((turnoActivo.ventas ?? []).length)}
 href={`/caja/${turnoActivo.id}/cobros`}
 hint="Ver facturas cobradas" /> {/* Movimientos de caja — link a página dedicada en nueva pestaña */}
 <StatCardLink
 label="Movimientos caja" value={String(turnoActivo.movimientos.length)}
 href={`/caja/${turnoActivo.id}/movimientos`}
 hint="Ver gastos, préstamos y cobros" /> </div> </div> {/* Dashboard: botones de movimientos + facturas pendientes de cobro */}
 <CajaDashboard
 turnoId={turnoActivo.id}
 facturas={facturas.map(f => ({
 ...f,
 total: Number(f.total),
 subtotal: Number(f.subtotal),
 itbis: Number(f.itbis),
 cliente: {
 ...f.cliente,
 tipoComprobante: String(f.cliente.tipoComprobante),
 },
 detalles: f.detalles.map(d => ({
 ...d,
 cantidad: Number(d.cantidad),
 precioFinal: Number(d.precioFinal),
 subtotal: Number(d.subtotal),
 itbis: Number(d.itbis),
 })),
 }))}
 empleados={empleados}
 /> </> ) : (
 <div className="rounded-xl border bg-card p-6 space-y-4"> <h2 className="text-lg font-semibold">Abrir nuevo turno</h2> <p className="text-sm text-muted-foreground"> No hay turno activo. Ingresa el monto de apertura (efectivo en caja al inicio del turno).
 </p> <AbrirTurnoForm /> </div> )}
 </div> );
}

// Stat card estático 

function StatCard({ label, value, highlight }: {
 label: string; value: string; highlight?: boolean;
}) {
 return (
 <div className={`rounded-lg px-3 py-2.5 border ${highlight
 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-muted/40"}`}> <p className={`text-xs ${highlight ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}> {label}
 </p> <p className={`text-base font-bold font-mono mt-0.5 ${highlight ? "text-amber-800 dark:text-amber-300" : ""}`}> {value}
 </p> </div> );
}

// Stat card clickable — navega en la misma pestaña 

function StatCardLink({ label, value, href, hint }: {
 label: string; value: string; href: string; hint?: string;
}) {
 return (
 <a
 href={href}
 title={hint}
 className="rounded-lg px-3 py-2.5 border bg-muted/40 hover:bg-accent hover:border-primary/40 transition-colors group cursor-pointer block" > <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors"> {label}
 </p> <p className="text-base font-bold font-mono mt-0.5">{value}</p> </a> );
}
