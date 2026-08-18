import Link from "next/link";
import { getEmpleadosActivos } from "@/actions/caja";
import { getReportePrestamos } from "@/actions/caja";
import { ReportePrestamosClient } from "@/components/nominas/reporte-prestamos-client";

interface PageProps {
 searchParams: Promise<{
 empleadoId?: string;
 desde?: string;
 hasta?: string;
 }>;
}

// Fecha de hoy y primer día del mes actual como defaults
function hoy() {
 return new Date().toISOString().slice(0, 10);
}
function primerDiaMes() {
 const d = new Date();
 d.setDate(1);
 return d.toISOString().slice(0, 10);
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const metadata = { title: "Reporte de Préstamos — Ferretería AP" };

export default async function ReportePrestamosDashPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const empleadoId = params.empleadoId ?? "todos";
 const desde = params.desde ?? primerDiaMes();
 const hasta = params.hasta ?? hoy();

 const [empleados, reporte] = await Promise.all([
 getEmpleadosActivos(),
 getReportePrestamos({ empleadoId, desde, hasta }),
 ]);

 const printParams = new URLSearchParams({ empleadoId, desde, hasta }).toString();

 return (
 <div className="space-y-5 max-w-4xl"> {/* Encabezado */}
 <div className="flex items-start justify-between gap-4 flex-wrap"> <div> <Link href="/nominas" className="text-sm text-muted-foreground hover:text-foreground">  Nóminas
 </Link> <h1 className="text-2xl font-bold mt-1">Reporte de Préstamos</h1> <p className="text-sm text-muted-foreground mt-0.5"> Estado de préstamos por empleado en el período seleccionado
 </p> </div> {reporte.empleados.length > 0 && (
 <a
 href={`/nominas/prestamos/imprimir?${printParams}`}
 target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors" > Imprimir / PDF
 </a> )}
 </div> {/* Filtros */}
 <ReportePrestamosClient
 empleados={empleados}
 empleadoIdActual={empleadoId}
 desdeActual={desde}
 hastaActual={hasta}
 /> {/* Resultados */}
 {reporte.empleados.length === 0 ? (
 <div className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground"> <p className="text-3xl mb-3"></p> <p className="font-medium text-base">Sin préstamos en el período seleccionado</p> <p className="text-sm mt-1">Ajusta el rango de fechas o selecciona otro empleado</p> </div> ) : (
 <div className="space-y-4"> {/* Resumen general */}
 <div className="rounded-xl border bg-card px-5 py-4 flex items-center justify-between"> <div> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total período</p> <p className="text-2xl font-bold text-primary mt-0.5">{fmt(reporte.totalGeneral)}</p> </div> <div className="text-right"> <p className="text-xs text-muted-foreground"> {reporte.empleados.length} empleado{reporte.empleados.length !== 1 ? "s" : ""}
 </p> <p className="text-xs text-muted-foreground"> {reporte.empleados.reduce((s, g) => s + g.prestamos.length, 0)} préstamo{reporte.empleados.reduce((s, g) => s + g.prestamos.length, 0) !== 1 ? "s" : ""}
 </p> </div> </div> {/* Tabla por empleado */}
 {reporte.empleados.map((grupo) => (
 <div key={grupo.empleado?.id} className="rounded-xl border bg-card overflow-hidden"> {/* Header empleado */}
 <div className="px-5 py-3 border-b flex items-center justify-between bg-muted/30"> <div> <p className="font-bold"> {grupo.empleado?.nombre} {grupo.empleado?.apellido}
 </p> <p className="text-xs text-muted-foreground"> {grupo.empleado?.cargo} · C.C. {grupo.empleado?.cedula}
 </p> </div> <div className="text-right"> <p className="text-xs text-muted-foreground">Total</p> <p className="font-bold text-primary">{fmt(grupo.total)}</p> </div> </div> {/* Filas de préstamos */}
 <table className="w-full text-sm"> <thead> <tr className="text-xs text-muted-foreground border-b"> <th className="px-5 py-2 text-left font-medium">Fecha</th> <th className="px-5 py-2 text-left font-medium">Concepto / Nota</th> <th className="px-5 py-2 text-right font-medium">Monto</th> </tr> </thead> <tbody className="divide-y"> {grupo.prestamos.map((p) => (
 <tr key={p.id} className="hover:bg-muted/20 transition-colors"> <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap"> {new Date(p.fecha).toLocaleDateString("es-DO", {
 day: "2-digit", month: "short", year: "numeric",
 })}
 </td> <td className="px-5 py-2.5">{p.concepto || "—"}</td> <td className="px-5 py-2.5 text-right font-mono font-medium">{fmt(p.monto)}</td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t bg-muted/20"> <td colSpan={2} className="px-5 py-2.5 text-sm font-semibold"> Subtotal — {grupo.empleado?.nombre}
 </td> <td className="px-5 py-2.5 text-right font-mono font-bold text-primary"> {fmt(grupo.total)}
 </td> </tr> </tfoot> </table> </div> ))}

 {/* Total general (si hay más de 1 empleado) */}
 {reporte.empleados.length > 1 && (
 <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 flex items-center justify-between"> <p className="font-bold">TOTAL GENERAL</p> <p className="font-mono font-bold text-lg text-primary">{fmt(reporte.totalGeneral)}</p> </div> )}
 </div> )}
 </div> );
}
