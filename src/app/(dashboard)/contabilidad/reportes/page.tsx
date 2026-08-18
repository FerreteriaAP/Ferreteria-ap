import Link from "next/link";
import { getReporteCierres, getReporteMovimientos } from "@/actions/reportes-caja";
import { rangoFechas } from "@/lib/rangos";
import { ReportesFiltro } from "@/components/contabilidad/reportes-filtro";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const metadata = { title: "Reportes de Caja — Ferretería AP" };

// Helpers de formato 

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date | string) => new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtHora = (d: Date | string) => new Date(d).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });

// SubTipos para reporte de movimientos 

const SUB_TIPOS = [
 { key: "GASTO", label: "Gastos", icon: "", color: "text-red-600 dark:text-red-400" },
 { key: "COMPRA_MERCANCIA", label: "Compras de mercancía",icon: "", color: "text-orange-600 dark:text-orange-400" },
 { key: "PRESTAMO", label: "Préstamos a empleados",icon: "", color: "text-blue-600 dark:text-blue-400" },
 { key: "COBRO_CXC", label: "Cobros CxC", icon: "", color: "text-green-600 dark:text-green-400" },
];

// Props 

interface PageProps {
 searchParams: Promise<{
 tipo?: string;
 fecha?: string;
 mes?: string;
 q?: string;
 desde?: string;
 hasta?: string;
 reporte?: string;
 }>;
}

// 

export default async function ReportesCajaPage({ searchParams }: PageProps) {
 const [p, session] = await Promise.all([searchParams, auth()]);
 const rol = (session?.user as { rol?: string })?.rol ?? "";

 // ASISTENTE solo puede ver Movimientos de Caja (no Cierres)
 const soloMovimientos = rol === "ASISTENTE_ADMINISTRATIVO";

 const tipo = p.tipo ?? "mes";
 const fecha = p.fecha;
 const mes = p.mes;
 const q = p.q;
 const desde = p.desde;
 const hasta = p.hasta;
 // Si es ASISTENTE, forzar siempre a movimientos
 const reporte = soloMovimientos ? "movimientos" : (p.reporte ?? "cierres");

 const { desde: dDesde, hasta: dHasta, label } = rangoFechas({ tipo, fecha, mes, q, desde, hasta });

 const [dataCierres, dataMovs] = await Promise.all([
 getReporteCierres(dDesde, dHasta),
 getReporteMovimientos(dDesde, dHasta),
 ]);

 return (
 <div className="space-y-6 pb-10"> {/* Encabezado */}
 <div> <div className="flex items-center gap-2"> <Link href="/contabilidad" className="text-muted-foreground hover:text-foreground transition-colors" title="Volver a Contabilidad"> <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> </Link> <h1 className="text-2xl font-bold">Reportes de Caja</h1> </div> <p className="text-sm text-muted-foreground mt-0.5"> Período: <span className="font-medium text-foreground">{label}</span> </p> </div> {/* Filtro interactivo */}
 <ReportesFiltro
 tipo={tipo} fecha={fecha} mes={mes} q={q} desde={desde} hasta={hasta}
 reporte={reporte}
 soloMovimientos={soloMovimientos}
 /> {/* 
 REPORTE 1 — CIERRES DE CAJA
 */}
 {reporte === "cierres" && (
 <div className="space-y-4"> {dataCierres.resumen && (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"> <KpiCard label="Turnos cerrados" value={String(dataCierres.resumen.totalTurnos)} /> <KpiCard label="Total ventas" value={fmt(dataCierres.resumen.totalVentas)} highlight /> <KpiCard label=" Efectivo" value={fmt(dataCierres.resumen.pagos.EFECTIVO)} /> <KpiCard label=" Tarjeta" value={fmt(dataCierres.resumen.pagos.TARJETA)} /> <KpiCard label=" Transferencia" value={fmt(dataCierres.resumen.pagos.TRANSFERENCIA)} /> <KpiCard label=" Cheque" value={fmt(dataCierres.resumen.pagos.CHEQUE)} /> </div> )}

 {dataCierres.turnos.length === 0 ? (
 <EmptyState msg="No hay cierres de caja en este período" /> ) : (
 <div className="rounded-xl border overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wide"> <th className="text-left px-4 py-3">Turno</th> <th className="text-left px-4 py-3">Cajero</th> <th className="text-left px-4 py-3">Apertura</th> <th className="text-left px-4 py-3">Cierre</th> <th className="text-right px-4 py-3">Apertura RD$</th> <th className="text-right px-4 py-3">Esperado</th> <th className="text-right px-4 py-3">Real</th> <th className="text-right px-4 py-3">Diferencia</th> <th className="text-right px-4 py-3">Ventas</th> <th className="text-right px-4 py-3">Efectivo</th> <th className="text-right px-4 py-3">Tarjeta</th> <th className="text-right px-4 py-3">Transf.</th> <th className="text-right px-4 py-3">Cheque</th> <th className="text-right px-4 py-3">Crédito</th> </tr> </thead> <tbody> {dataCierres.turnos.map((t) => (
 <tr key={t.id} className="border-b hover:bg-muted/20 transition-colors"> <td className="px-4 py-3 font-mono font-bold text-primary">#{t.numero}</td> <td className="px-4 py-3 text-xs">{t.cajero}</td> <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"> {fmtFecha(t.fechaApertura)}<br /> <span className="text-[10px]">{fmtHora(t.fechaApertura)}</span> </td> <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"> {fmtFecha(t.fechaCierre)}<br /> <span className="text-[10px]">{fmtHora(t.fechaCierre)}</span> </td> <td className="px-4 py-3 text-right font-mono text-xs">{fmt(t.montoApertura)}</td> <td className="px-4 py-3 text-right font-mono text-xs">{fmt(t.montoEsperado)}</td> <td className="px-4 py-3 text-right font-mono text-xs">{fmt(t.montoCierre)}</td> <td className={cn("px-4 py-3 text-right font-mono text-xs font-bold",
 t.diferencia < 0
 ? "text-destructive" : t.diferencia > 0
 ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}> {t.diferencia >= 0 ? "+" : ""}{fmt(t.diferencia)}
 </td> <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{fmt(t.totalVentas)}</td> <td className="px-4 py-3 text-right font-mono text-xs">{t.pagos.EFECTIVO > 0 ? fmt(t.pagos.EFECTIVO) : "—"}</td> <td className="px-4 py-3 text-right font-mono text-xs">{t.pagos.TARJETA > 0 ? fmt(t.pagos.TARJETA) : "—"}</td> <td className="px-4 py-3 text-right font-mono text-xs">{t.pagos.TRANSFERENCIA > 0 ? fmt(t.pagos.TRANSFERENCIA) : "—"}</td> <td className="px-4 py-3 text-right font-mono text-xs">{t.pagos.CHEQUE > 0 ? fmt(t.pagos.CHEQUE) : "—"}</td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{t.pagos.CREDITO > 0 ? fmt(t.pagos.CREDITO) : "—"}</td> </tr> ))}
 </tbody> {dataCierres.resumen && (
 <tfoot> <tr className="border-t-2 bg-muted/30 font-bold text-xs"> <td colSpan={8} className="px-4 py-3 text-right text-muted-foreground">TOTALES</td> <td className="px-4 py-3 text-right font-mono">{fmt(dataCierres.resumen.totalVentas)}</td> <td className="px-4 py-3 text-right font-mono">{fmt(dataCierres.resumen.pagos.EFECTIVO)}</td> <td className="px-4 py-3 text-right font-mono">{fmt(dataCierres.resumen.pagos.TARJETA)}</td> <td className="px-4 py-3 text-right font-mono">{fmt(dataCierres.resumen.pagos.TRANSFERENCIA)}</td> <td className="px-4 py-3 text-right font-mono">{fmt(dataCierres.resumen.pagos.CHEQUE)}</td> <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(dataCierres.resumen.pagos.CREDITO)}</td> </tr> </tfoot> )}
 </table> </div> </div> )}
 </div> )}

 {/* 
 REPORTE 2 — MOVIMIENTOS DE CAJA
 */}
 {reporte === "movimientos" && (
 <div className="space-y-4"> {dataMovs.resumen && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> <KpiCard label=" Gastos" value={fmt(dataMovs.resumen.totalGastos)} danger /> <KpiCard label=" Compras mercancía" value={fmt(dataMovs.resumen.totalCompras)} danger /> <KpiCard label=" Préstamos" value={fmt(dataMovs.resumen.totalPrests)} /> <KpiCard label=" Cobros CxC" value={fmt(dataMovs.resumen.totalCobros)} highlight /> </div> )}

 {dataMovs.movimientos.length === 0 ? (
 <EmptyState msg="No hay movimientos de caja en este período" /> ) : (
 <div className="space-y-5"> {SUB_TIPOS.map(st => {
 const filas = dataMovs.movimientos.filter(m => m.subTipo === st.key);
 if (!filas.length) return null;
 const total = filas.reduce((s, f) => s + f.monto, 0);

 return (
 <div key={st.key} className="rounded-xl border overflow-hidden"> <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between"> <div className="flex items-center gap-2"> <span className="text-base">{st.icon}</span> <h3 className="font-bold text-sm">{st.label}</h3> <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"> {filas.length}
 </span> </div> <span className={cn("font-mono font-bold text-sm", st.color)}>{fmt(total)}</span> </div> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b bg-muted/10 text-[10px] text-muted-foreground uppercase tracking-wide"> <th className="text-left px-4 py-2">Fecha</th> <th className="text-left px-4 py-2">Concepto / Detalle</th> <th className="text-left px-4 py-2">Cajero · Turno</th> <th className="text-left px-4 py-2">Notas</th> {st.key === "COBRO_CXC" && <th className="text-center px-4 py-2">Estado</th>}
 <th className="text-right px-4 py-2">Monto</th> </tr> </thead> <tbody> {filas.map(f => (
 <tr key={f.id} className="border-b hover:bg-muted/10 transition-colors"> <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap"> {fmtFecha(f.fecha)}<br /> <span className="text-[10px]">{fmtHora(f.fecha)}</span> </td> <td className="px-4 py-2.5 text-xs"> <p className="font-medium">{f.concepto}</p> {f.empleado && <p className="text-muted-foreground"> {f.empleado}</p>}
 {f.cxcInfo && <p className="text-muted-foreground font-mono">{f.cxcInfo.factura} · {f.cxcInfo.cliente}</p>}
 </td> <td className="px-4 py-2.5 text-xs text-muted-foreground"> {f.cajero}<br /> <span className="text-[10px]">Turno #{f.turnoNumero}</span> </td> <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate"> {f.notas ?? "—"}
 </td> {st.key === "COBRO_CXC" && (
 <td className="px-4 py-2.5 text-center"> <span className={cn(
 "text-[10px] px-2 py-0.5 rounded-full font-semibold",
 f.confirmado
 ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" )}> {f.confirmado ? "Confirmado" : "Pendiente"}
 </span> </td> )}
 <td className={cn("px-4 py-2.5 text-right font-mono text-sm font-semibold", st.color)}> {fmt(f.monto)}
 </td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t bg-muted/20 font-bold text-xs"> <td colSpan={st.key === "COBRO_CXC" ? 4 : 3} className="px-4 py-2.5 text-right text-muted-foreground"> Subtotal
 </td> <td /> <td className={cn("px-4 py-2.5 text-right font-mono", st.color)}>{fmt(total)}</td> </tr> </tfoot> </table> </div> </div> );
 })}
 </div> )}
 </div> )}
 </div> );
}

// Componentes auxiliares 

function KpiCard({ label, value, highlight, danger }: {
 label: string; value: string; highlight?: boolean; danger?: boolean;
}) {
 return (
 <div className={cn("rounded-xl border p-4",
 highlight ? "bg-primary/5 border-primary/30" :
 danger ? "bg-destructive/5 border-destructive/20" :
 "bg-card" )}> <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p> <p className={cn("text-lg font-bold font-mono mt-1 leading-tight",
 highlight ? "text-primary" : danger ? "text-destructive" : "" )}>{value}</p> </div> );
}

function EmptyState({ msg }: { msg: string }) {
 return (
 <div className="rounded-xl border bg-card py-14 text-center text-muted-foreground"> <p className="text-3xl mb-2"></p> <p className="font-medium">{msg}</p> </div> );
}
