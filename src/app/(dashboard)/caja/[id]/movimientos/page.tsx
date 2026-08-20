import { notFound } from "next/navigation";
import Link from "next/link";
import { getTurno } from "@/actions/caja";

interface Props {
 params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
 const { id } = await params;
 const turno = await getTurno(id);
 return { title: turno ? `Movimientos — Turno #${turno.numero}` : "Movimientos" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(n: any) {
 return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateTime(d: Date | string) {
 return new Date(d).toLocaleString("es-DO", {
 day: "2-digit", month: "short",
 hour: "2-digit", minute: "2-digit",
 });
}

const SUBTIPO_LABEL: Record<string, string> = {
 GASTO: "Gasto",
 COMPRA_MERCANCIA: "Compra mercancía",
 PRESTAMO: "Préstamo empleado",
 COBRO_CXC: "Cobro CxC",
};

const SUBTIPO_COLOR: Record<string, string> = {
 GASTO: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
 COMPRA_MERCANCIA: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
 PRESTAMO: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
 COBRO_CXC: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

export default async function MovimientosPage({ params }: Props) {
 const { id } = await params;
 const turno = await getTurno(id);
 if (!turno) notFound();

 // getTurno ya filtra subTipo NOT NULL — pagos de facturas no aparecen aquí
 const movimientos = turno.movimientos;

 // Totales por tipo
 const totalSalidas = movimientos
 .filter(m => m.tipo === "SALIDA")
 .reduce((s, m) => s + Number(m.monto), 0);
 const totalEntradas = movimientos
 .filter(m => m.tipo === "ENTRADA" && m.subTipo === "COBRO_CXC")
 .reduce((s, m) => s + Number(m.monto), 0);

 // Agrupar para el resumen
 const grupos: Record<string, { label: string; total: number; color: string }> = {};
 for (const m of movimientos) {
 const key = m.subTipo ?? "OTRO";
 if (!grupos[key]) grupos[key] = { label: SUBTIPO_LABEL[key] ?? key, total: 0, color: SUBTIPO_COLOR[key] ?? "" };
 grupos[key].total += Number(m.monto);
 }

 return (
 <div className="max-w-3xl mx-auto px-4 py-6 space-y-5"> {/* Encabezado */}
 <div className="flex items-start justify-between gap-3 flex-wrap"> <div className="space-y-1"> <Link href="/caja" className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full transition-all hover:brightness-110" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)", color: "var(--accent-hex)", border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)" }}>← Volver a Caja</Link> <h1 className="text-xl font-bold">Movimientos — Turno #{turno.numero}</h1> <p className="text-sm text-muted-foreground"> Cajero: {turno.usuario.nombre} {turno.usuario.apellido}
 </p> </div> </div> {/* Resumen por tipo */}
 {Object.keys(grupos).length > 0 && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> {Object.entries(grupos).map(([key, g]) => (
 <div key={key} className="rounded-lg border bg-muted/30 px-3 py-2.5"> <p className="text-xs text-muted-foreground">{g.label}</p> <p className="text-base font-bold font-mono mt-0.5">{fmt(g.total)}</p> </div> ))}
 </div> )}

 {/* Tabla de movimientos */}
 <div className="rounded-xl border bg-card overflow-hidden"> <div className="px-4 py-3 border-b flex items-center gap-2"> <h2 className="font-semibold text-sm">Detalle de movimientos</h2> {movimientos.length > 0 && (
 <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full"> {movimientos.length}
 </span> )}
 {movimientos.length > 0 && (
 <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground"> {totalEntradas > 0 && (
 <span className="text-green-600 font-medium">+{fmt(totalEntradas)}</span> )}
 {totalSalidas > 0 && (
 <span className="text-red-600 font-medium">−{fmt(totalSalidas)}</span> )}
 </div> )}
 </div> {movimientos.length === 0 ? (
 <div className="px-4 py-12 text-center text-muted-foreground"> <p className="text-2xl mb-2"></p> <p className="text-sm">Sin movimientos registrados en este turno</p> </div> ) : (
 <div className="divide-y"> {movimientos.map(m => (
 <div key={m.id} className="px-4 py-3 flex items-start justify-between gap-3"> <div className="min-w-0"> <div className="flex items-center gap-2 flex-wrap"> <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SUBTIPO_COLOR[m.subTipo ?? ""] ?? "bg-muted text-muted-foreground"}`}> {SUBTIPO_LABEL[m.subTipo ?? ""] ?? m.subTipo}
 </span> {/* Método de pago — solo para COBRO_CXC */}
 {m.subTipo === "COBRO_CXC" && m.metodo && (
 <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"> {m.metodo === "EFECTIVO" ? " Efectivo" : m.metodo === "TARJETA" ? " Tarjeta" : m.metodo === "TRANSFERENCIA" ? " Transferencia" : m.metodo === "CHEQUE" ? " Cheque" : m.metodo}
 </span> )}
 <span className="text-xs text-muted-foreground">{fmtDateTime(m.fecha)}</span> </div> <p className="text-sm mt-0.5 font-medium">{m.concepto}</p> {m.notas && (
 <p className="text-xs text-muted-foreground mt-0.5">{m.notas}</p> )}
 </div> <div className="text-right shrink-0"> <p className={`font-mono font-bold text-sm ${m.tipo === "ENTRADA" ? "text-green-600" : "text-red-600"}`}> {m.tipo === "SALIDA" ? "−" : "+"}{fmt(m.monto)}
 </p> </div> </div> ))}
 </div> )}
 </div> </div> );
}
