import Link from "next/link";
import { getResumenGastos } from "@/actions/contabilidad";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ año?: string; mes?: string }>;
}

const MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_COMPLETOS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIA_COLORS = [
 "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-teal-500",
 "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-amber-500",
];

export default async function GastosPage({ searchParams }: PageProps) {
 const now = new Date();
 const params = await searchParams;
 const año = Number(params.año ?? now.getFullYear());
 const mes = params.mes ? Number(params.mes) : undefined;

 const data = await getResumenGastos({ año, mes });

 const añosDisp = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i);
 const maxMensual = Math.max(...data.mensual.map((m) => m.total), 1);

 return (
 <div className="space-y-6"> <div className="flex flex-col sm:flex-row sm:items-end gap-4"> <div className="flex-1"> <div className="flex items-center gap-2"> <Link href="/contabilidad" className="text-muted-foreground hover:text-foreground transition-colors" title="Volver a Contabilidad"> <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> </Link> <h1 className="text-2xl font-bold">Reporte de Gastos</h1> </div> <p className="text-sm text-muted-foreground mt-0.5"> {mes ? `${MESES_COMPLETOS[mes]} ${año}` : `Año ${año}`}
 </p> </div> <form method="GET" className="flex gap-2 flex-wrap"> <select name="año" defaultValue={año}
 className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"> {añosDisp.map((a) => <option key={a} value={a}>{a}</option>)}
 </select> <select name="mes" defaultValue={mes ?? ""}
 className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"> <option value="">Año completo</option> {MESES_COMPLETOS.slice(1).map((m, i) => (
 <option key={i + 1} value={i + 1}>{m}</option> ))}
 </select> <button type="submit" className="h-8 px-3 rounded-md border bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"> Filtrar
 </button> </form> </div> {/* KPI total */}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3"> <div className="rounded-lg border bg-card p-4"> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total gastos</p> <p className="text-2xl font-bold mt-1">{fmt(data.totalGeneral)}</p> </div> <div className="rounded-lg border bg-card p-4"> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Categorías</p> <p className="text-2xl font-bold mt-1">{data.porCategoria.length}</p> </div> <div className="rounded-lg border bg-card p-4"> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Transacciones</p> <p className="text-2xl font-bold mt-1">{data.detalle.length}</p> </div> </div> {/* Gráfico mensual (si es año completo) */}
 {!mes && (
 <div className="rounded-lg border bg-card p-5"> <h2 className="text-sm font-semibold mb-4">Tendencia mensual — {año}</h2> <div className="space-y-2.5"> {data.mensual.map((m) => (
 <div key={m.mes} className="flex items-center gap-3"> <span className="text-xs text-muted-foreground w-7 text-right shrink-0">{MESES[m.mes]}</span> <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"> <div className="h-full rounded-full bg-orange-500/70" style={{
 width: `${maxMensual > 0 ? (m.total / maxMensual) * 100 : 0}%` }} /> </div> <span className="text-xs font-mono w-32 text-right shrink-0"> {m.total > 0 ? fmt(m.total) : <span className="text-muted-foreground">—</span>}
 </span> </div> ))}
 </div> </div> )}

 {/* Por categoría */}
 {data.porCategoria.length > 0 && (
 <div className="rounded-lg border bg-card p-5"> <h2 className="text-sm font-semibold mb-4">Por categoría</h2> <div className="space-y-4"> {data.porCategoria.map((c, i) => (
 <div key={c.cat}> <div className="flex justify-between text-sm mb-1"> <span className="font-medium">{c.cat}</span> <div className="flex gap-4"> <span className="text-muted-foreground text-xs">{c.count} gasto{c.count !== 1 ? "s" : ""}</span> <span className="font-mono text-xs font-semibold">{fmt(c.total)}</span> <span className="text-muted-foreground text-xs w-12 text-right">{c.pct.toFixed(1)}%</span> </div> </div> <div className="h-2 rounded-full bg-muted overflow-hidden"> <div
 className={cn("h-full rounded-full", CATEGORIA_COLORS[i % CATEGORIA_COLORS.length])}
 style={{ width: `${c.pct}%` }}
 /> </div> </div> ))}
 </div> </div> )}

 {/* Detalle de transacciones */}
 {data.detalle.length > 0 && (
 <div className="rounded-lg border bg-card overflow-hidden"> <div className="px-4 py-3 border-b bg-muted/30"> <h2 className="text-sm font-semibold">Detalle de gastos</h2> </div> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b bg-muted/20"> <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">#</th> <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Fecha</th> <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Categoría</th> <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Descripción</th> <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Método</th> <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Monto</th> </tr> </thead> <tbody className="divide-y"> {data.detalle.map((g) => (
 <tr key={g.id} className="hover:bg-muted/30"> <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{g.numero}</td> <td className="py-2 px-4 text-xs">{new Date(g.fecha).toLocaleDateString("es-DO")}</td> <td className="py-2 px-4 text-xs">{g.categoria}</td> <td className="py-2 px-4 text-xs">{g.descripcion}</td> <td className="py-2 px-4 text-xs text-muted-foreground">{g.metodo ?? "—"}</td> <td className="py-2 px-4 text-right font-mono text-xs font-semibold">{fmt(g.monto)}</td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t bg-muted/30"> <td colSpan={5} className="py-2 px-4 font-bold text-xs">Total</td> <td className="py-2 px-4 text-right font-mono text-xs font-bold">{fmt(data.totalGeneral)}</td> </tr> </tfoot> </table> </div> </div> )}

 {data.detalle.length === 0 && (
 <div className="text-center py-16 text-muted-foreground"> <div className="text-4xl mb-3"></div> <p className="font-medium">Sin gastos registrados en el período</p> </div> )}

 </div> );
}
