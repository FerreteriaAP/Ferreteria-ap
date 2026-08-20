import { getTurno, getResumenTurno } from "@/actions/caja";
import { CierreTurnoForm } from "@/components/caja/cierre-turno-form";
import { MovimientoForm } from "@/components/caja/movimiento-form";
import { VentasTurnoTable } from "@/components/caja/ventas-turno-table";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Detalle de Turno — Ferretería AP" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(n: any) {
 if (n == null) return "—";
 return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string | null | undefined) {
 if (!d) return "—";
 return new Date(d).toLocaleString("es-DO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function TurnoDetallePage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const [turno, resumen] = await Promise.all([
 getTurno(id),
 getResumenTurno(id).catch(() => null),
 ]);

 if (!turno) notFound();

 const estaAbierto = turno.estado === "ABIERTO";

 return (
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-6"> {/* Header */}
 <div className="flex items-center gap-3"> <Link href="/caja" className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full transition-all hover:brightness-110" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)", color: "var(--accent-hex)", border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)" }}>← Caja</Link> <span className="text-muted-foreground">/</span> <h1 className="text-xl font-bold">Turno #{turno.numero}</h1> <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ml-1 ${estaAbierto ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-muted text-muted-foreground"}`}> {estaAbierto ? " Abierto" : " Cerrado"}
 </span> </div> {/* Info y resumen */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="rounded-xl border bg-card p-4 space-y-2"> <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--accent-hex)" }}>Información del turno</h2> <dl className="space-y-1 text-sm"> <Row label="Cajero" value={`${turno.usuario.nombre} ${turno.usuario.apellido}`} /> <Row label="Apertura" value={fmtDate(turno.fechaApertura)} /> <Row label="Cierre" value={fmtDate(turno.fechaCierre)} /> <Row label="Monto apertura" value={fmt(turno.montoApertura)} mono /> {turno.montoCierre != null && <Row label="Monto cierre" value={fmt(turno.montoCierre)} mono />}
 {turno.montoEsperado != null && <Row label="Monto esperado" value={fmt(turno.montoEsperado)} mono />}
 {turno.diferencia != null && (
 <div className="flex justify-between py-0.5"> <dt className="text-muted-foreground">Diferencia</dt> <dd className={`font-mono font-medium ${Number(turno.diferencia) < 0 ? "text-red-600" : Number(turno.diferencia) > 0 ? "text-green-600" : ""}`}> {fmt(turno.diferencia)}
 </dd> </div> )}
 {turno.notas && <Row label="Notas" value={turno.notas} />}
 </dl> </div> {resumen && (
 <div className="rounded-xl border bg-card p-4 space-y-2"> <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--accent-hex)" }}>Resumen de cobros</h2> <dl className="space-y-1 text-sm"> <Row label="Total ventas" value={fmt(resumen.totalVentas)} mono /> <Row label="Efectivo" value={fmt(resumen.efectivo)} mono /> <Row label="Tarjeta" value={fmt(resumen.tarjeta)} mono /> <Row label="Transferencia" value={fmt(resumen.transferencia)} mono /> <Row label="Cheque" value={fmt(resumen.cheque)} mono /> {resumen.entradasMov > 0 && <Row label="Entradas manuales" value={fmt(resumen.entradasMov)} mono />}
 {resumen.salidasMov > 0 && <Row label="Salidas manuales" value={fmt(resumen.salidasMov)} mono />}
 <div className="border-t pt-1 mt-1"> <Row label="Efectivo esperado" value={fmt(resumen.montoEsperado)} mono bold color="#16a34a" /> </div> </dl> </div> )}
 </div> {/* Movimientos */}
 <div className="rounded-xl border bg-card overflow-hidden"> <div className="flex items-center justify-between px-4 py-3 border-b"> <h2 className="font-semibold" style={{ color: "var(--accent-hex)" }}>Movimientos de caja</h2> {estaAbierto && (
 <MovimientoForm turnoId={turno.id} /> )}
 </div> {turno.movimientos.length === 0 ? (
 <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin movimientos manuales</p> ) : (
 <table className="w-full text-sm"> <thead> <tr className="bg-muted/30 text-xs text-muted-foreground border-b"> <th className="text-left px-4 py-2">Fecha</th> <th className="text-left px-3 py-2">Tipo</th> <th className="text-left px-3 py-2">Concepto</th> <th className="text-right px-4 py-2">Monto</th> </tr> </thead> <tbody> {turno.movimientos.map(m => (
 <tr key={m.id} className="border-b hover:bg-muted/20"> <td className="px-4 py-2 text-muted-foreground">{fmtDate(m.fecha)}</td> <td className="px-3 py-2"> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.tipo === "ENTRADA" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}> {m.tipo}
 </span> </td> <td className="px-3 py-2">{m.concepto}{m.notas ? <span className="text-muted-foreground ml-1">· {m.notas}</span> : null}</td> <td className={`px-4 py-2 text-right font-mono font-medium ${m.tipo === "ENTRADA" ? "text-green-600" : "text-red-600"}`}> {m.tipo === "SALIDA" ? "-" : "+"}{fmt(m.monto)}
 </td> </tr> ))}
 </tbody> </table> )}
 </div> {/* Ventas del turno — con botón de despacho por fila */}
 <div className="rounded-xl border bg-card overflow-hidden"> <div className="px-4 py-3 border-b"> <h2 className="font-semibold" style={{ color: "var(--accent-hex)" }}> Facturas cobradas{" "}
 <span className="text-muted-foreground font-normal text-sm">({turno.ventas.length})</span> </h2> </div> <VentasTurnoTable ventas={turno.ventas.map(v => ({
 ...v,
 total: Number(v.total),
 pagosRecibidos: v.pagosRecibidos.map(p => ({ ...p, monto: Number(p.monto) })),
 }))} /> </div> {/* Cerrar turno */}
 {estaAbierto && resumen && (
 <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3"> <h2 className="font-semibold text-destructive/80">Cerrar turno</h2> <p className="text-sm text-muted-foreground"> Ingresa el monto físico que hay en la caja para hacer el arqueo. El sistema calculará la diferencia.
 </p> <p className="text-sm font-medium">Efectivo esperado: <span className="font-mono">{fmt(resumen.montoEsperado)}</span></p> <CierreTurnoForm turnoId={turno.id} /> </div> )}
 </div> );
}

function Row({ label, value, mono, bold, color }: { label: string; value: string; mono?: boolean; bold?: boolean; color?: string }) {
 return (
 <div className="flex justify-between py-0.5"> <dt className="text-muted-foreground">{label}</dt> <dd className={`${mono ? "font-mono" : ""} ${bold ? "font-bold" : "font-medium"}`} style={color ? { color } : undefined}>{value}</dd> </div> );
}
