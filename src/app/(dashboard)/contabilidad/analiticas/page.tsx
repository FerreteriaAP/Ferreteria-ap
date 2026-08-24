import {
 getResumenMensualPL,
 getVentasPorCategoria,
 getVentasPorCliente,
 getTopProductos,
 getResumenPagos,
} from "@/actions/contabilidad";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ año?: string; mes?: string }>;
}

const MESES_COMPLETOS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmt = (n: number, decimals = 0) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

function pct(n: number) {
 return `${n.toFixed(1)}%`;
}

function colorMargen(m: number) {
 if (m >= 30) return "text-green-700 dark:text-green-400";
 if (m >= 15) return "text-yellow-600 dark:text-yellow-400";
 return "text-destructive";
}
function bgMargen(m: number) {
 if (m >= 30) return "bg-green-500";
 if (m >= 15) return "bg-yellow-500";
 return "bg-red-500";
}

// Barra horizontal pura CSS
function Barra({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
 const w = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
 return (
 <div className="h-1.5 rounded-full bg-muted overflow-hidden"> <div className={cn("h-full rounded-full", color)} style={{ width: `${w}%` }} /> </div> );
}

// Barra de porcentaje (0-100 range fija)
function BarraPct({ value, color = "bg-primary" }: { value: number; color?: string }) {
 const w = Math.min(Math.max(Math.round(value), 0), 100);
 return (
 <div className="h-2.5 rounded-full bg-muted overflow-hidden flex-1"> <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${w}%` }} /> </div> );
}

// Chip de variación +/- %
function Chip({ v }: { v: number | null }) {
 if (v === null) return <span className="text-muted-foreground text-xs">—</span>;
 const pos = v >= 0;
 return (
 <span className={cn("text-xs font-medium", pos ? "text-green-700 dark:text-green-400" : "text-destructive")}> {pos ? "" : ""} {Math.abs(v).toFixed(1)}%
 </span> );
}

export default async function AnaliticasPage({ searchParams }: PageProps) {
 const now = new Date();
 const params = await searchParams;
 const año = Number(params.año ?? now.getFullYear());
 const mes = params.mes ? Number(params.mes) : undefined;

 // Años disponibles (2023  año actual)
 const añosDisp = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i);

 const [mesesPL, porCategoria, porCliente, topProductos, pagos] = await Promise.all([
 getResumenMensualPL(año),
 getVentasPorCategoria({ año, mes }),
 getVentasPorCliente({ año, mes, limit: 10 }),
 getTopProductos({ año, mes, limit: 10 }),
 getResumenPagos({ año, mes }),
 ]);

 // Totales del P&L 
 const periodoMeses = mes ? mesesPL.filter((m_) => m_.mes === mes) : mesesPL;

 const plVentas = periodoMeses.reduce((s, m) => s + m.ventas, 0);
 const plGastos = periodoMeses.reduce((s, m) => s + m.gastos, 0);
 const plGananciaBruta = periodoMeses.reduce((s, m) => s + m.gananciaBruta, 0);
 const plGananciaNeta = periodoMeses.reduce((s, m) => s + m.gananciaNeta, 0);
 const plCogs = periodoMeses.reduce((s, m) => s + m.cogs, 0);
 const totalFacturas = periodoMeses.reduce((s, m) => s + m.num, 0);

 const plMargenBruto = plVentas > 0 ? (plGananciaBruta / plVentas) * 100 : 0;
 const plMargenNeto = plVentas > 0 ? (plGananciaNeta / plVentas) * 100 : 0;

 // Margen neto promedio mensual (solo meses con ventas)
 const mesesConVentas = periodoMeses.filter((m) => m.ventas > 0);
 const margenPromMensual = mesesConVentas.length > 0
 ? mesesConVentas.reduce((s, m) => s + m.margenNeto, 0) / mesesConVentas.length
 : plMargenNeto;

 // Totales categoría (fuente independiente) 
 const catVentas = porCategoria.reduce((s, c) => s + c.ventas, 0);
 const catCogs = porCategoria.reduce((s, c) => s + c.cogs, 0);
 const catGanancia = catVentas - catCogs;
 const catMargen = catVentas > 0 ? (catGanancia / catVentas) * 100 : 0;

 // Variación vs mes anterior
 const mesAnteriorIdx = mes ? (mes === 1 ? 12 : mes - 1) : null;
 const dataMesAnterior = mesAnteriorIdx ? mesesPL.find((m_) => m_.mes === mesAnteriorIdx) : null;
 const varVentas = dataMesAnterior && dataMesAnterior.ventas > 0
 ? ((plVentas - dataMesAnterior.ventas) / dataMesAnterior.ventas) * 100
 : null;

 const maxVentas = Math.max(...mesesPL.map((m) => m.ventas), 1);
 const etiquetaPeriodo = mes ? `${MESES_COMPLETOS[mes]} ${año}` : `Año ${año}`;

 const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
 const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

 return (
 <div className="space-y-6">
 {/* Encabezado */}
 <div className="space-y-1">
 <Link href="/contabilidad"
 className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full transition-all hover:brightness-110"
 style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)", color: "var(--accent-hex)", border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)" }}>
 ← Contabilidad
 </Link>
 <h1 className="text-2xl font-bold mt-1">Resumen Financiero</h1>
 <p className="text-sm text-muted-foreground">
 {etiquetaPeriodo}{totalFacturas > 0 && <> · {totalFacturas} factura{totalFacturas !== 1 ? "s" : ""}</>}
 </p>
 </div> {/* Filtros */}
 <form method="GET"> <div className="flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3" style={{ backgroundColor: CARD_BG }}> <span className="text-xs text-muted-foreground font-medium shrink-0">Período:</span> <select
 name="año" defaultValue={String(año)}
 className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[72px]" > {añosDisp.map((a) => (
 <option key={a} value={String(a)}>{a}</option> ))}
 </select> <select
 name="mes" defaultValue={mes != null ? String(mes) : ""}
 className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px]" > <option value="">Año completo</option> {MESES_COMPLETOS.slice(1).map((m, i) => (
 <option key={i + 1} value={String(i + 1)}>{m}</option> ))}
 </select> <button
 type="submit" className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shrink-0" > Aplicar
 </button> {(mes != null || año !== now.getFullYear()) && (
 <a
 href="/contabilidad/analiticas" className="h-8 px-3 inline-flex items-center rounded-md border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors shrink-0" > Limpiar
 </a> )}
 {mes != null && (
 <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium shrink-0" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 15%, transparent)", color: "var(--accent-hex)" }}> {MESES_COMPLETOS[mes]} {año}
 </span> )}
 </div> </form> {/* Estado de resultados (P&L) */}
 <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}> <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}> <h2 className="font-semibold text-sm">Estado de resultados — {etiquetaPeriodo}</h2> </div> <div className="p-5 space-y-0 divide-y"> {/* Ventas */}
 <div className="flex items-center justify-between py-3"> <div> <p className="font-semibold text-sm">Ventas totales</p> <p className="text-xs text-muted-foreground">Total facturado al cliente (ITBIS incluido)</p> </div> <div className="text-right"> <p className="font-bold text-lg font-mono">{fmt(plVentas, 2)}</p> {varVentas !== null && <Chip v={varVentas} />}
 </div> </div> {/* COGS */}
 <div className="flex items-center justify-between py-3"> <div> <p className="font-medium text-sm text-muted-foreground">− Costo de lo vendido (COGS)</p> <p className="text-xs text-muted-foreground">Costo promedio × cantidad vendida por línea</p> </div> <p className="font-mono text-sm font-medium text-muted-foreground"> ({fmt(plCogs, 2)})
 </p> </div> {/* Ganancia bruta */}
 <div className="flex items-center justify-between py-3 bg-green-50 dark:bg-green-950/20 -mx-5 px-5"> <div> <p className="font-semibold text-sm">Ganancia bruta</p> <p className="text-xs text-muted-foreground">Ventas − COGS</p> </div> <div className="text-right"> <p className={cn("font-bold text-lg font-mono", plGananciaBruta >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(plGananciaBruta, 2)}
 </p> <p className="text-xs text-muted-foreground">{pct(plMargenBruto)} de margen bruto</p> </div> </div> {/* Gastos */}
 <div className="flex items-center justify-between py-3"> <div> <p className="font-medium text-sm text-muted-foreground">− Gastos operativos</p> <p className="text-xs text-muted-foreground">Gastos registrados en el período</p> </div> <p className="font-mono text-sm font-medium text-muted-foreground"> ({fmt(plGastos, 2)})
 </p> </div> {/* Barra de beneficio neto promedio */}
 <div className="py-4 -mx-5 px-5 bg-muted/20"> <div className="flex items-center justify-between mb-2"> <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"> % Beneficio sobre ventas
 {!mes && mesesConVentas.length > 1 && (
 <span className="ml-1 font-normal">(promedio mensual)</span> )}
 </p> <span className={cn("text-sm font-bold tabular-nums", colorMargen(margenPromMensual))}> {pct(margenPromMensual)}
 </span> </div> <div className="flex items-center gap-3"> <BarraPct
 value={Math.max(margenPromMensual, 0)}
 color={bgMargen(margenPromMensual)}
 /> <span className="text-[10px] text-muted-foreground shrink-0 w-16 text-right"> de cada RD$100
 </span> </div> <p className="text-[10px] text-muted-foreground mt-1.5"> {plVentas > 0
 ? <>De cada <strong>RD$100</strong> vendido quedan <strong className={colorMargen(margenPromMensual)}>{fmt(margenPromMensual, 1)}</strong> de ganancia neta</> : "Sin ventas en el período"}
 </p> </div> {/* Ganancia neta */}
 <div className="flex items-center justify-between py-4 -mx-5 px-5" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 3%, var(--card))" }}> <div> <p className="font-bold">Ganancia neta</p> <p className="text-xs text-muted-foreground">Ganancia bruta − gastos operativos</p> </div> <div className="text-right"> <p className={cn("font-bold text-2xl font-mono", plGananciaNeta >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(plGananciaNeta, 2)}
 </p> <p className="text-xs text-muted-foreground">{pct(plMargenNeto)} de margen neto</p> </div> </div> </div> </div> {/* Tabla mensual (solo vista anual) */}
 {!mes && (
 <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}> <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}> <h2 className="font-semibold text-sm">Desglose mensual {año}</h2> </div> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b"> <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Mes</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">COGS</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">G. Bruta</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Margen%</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Gastos</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">G. Neta</th> <th className="w-28 px-4 py-2.5" /> </tr> </thead> <tbody className="divide-y"> {mesesPL.map((m) => {
 const isCurrent = m.mes === now.getMonth() + 1 && año === now.getFullYear();
 const tieneData = m.ventas > 0 || m.gastos > 0;
 return (
 <tr
 key={m.mes}
 className={cn(
 "transition-colors",
 isCurrent ? "" : tieneData ? "hover:bg-muted/20" : "opacity-40" )}
 style={isCurrent ? { backgroundColor: "color-mix(in oklch, var(--accent-hex) 3%, var(--card))" } : undefined}
 > <td className="px-4 py-2.5"> <a
 href={`/contabilidad/analiticas?año=${año}&mes=${m.mes}`}
 className="font-medium hover:underline"
 style={isCurrent ? { color: "var(--accent-hex)" } : undefined}
 > {MESES_COMPLETOS[m.mes]}
 </a> {isCurrent && (
 <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 15%, transparent)", color: "var(--accent-hex)" }}> Actual
 </span> )}
 </td> <td className="px-4 py-2.5 text-right font-mono text-xs"> {tieneData ? fmt(m.ventas) : <span className="text-muted-foreground">—</span>}
 </td> <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground"> {m.cogs > 0 ? `(${fmt(m.cogs)})` : "—"}
 </td> <td className={cn("px-4 py-2.5 text-right font-mono text-xs font-medium",
 m.gananciaBruta > 0 ? "text-green-700 dark:text-green-400" : m.gananciaBruta < 0 ? "text-destructive" : "text-muted-foreground")}> {m.ventas > 0 ? fmt(m.gananciaBruta) : "—"}
 </td> <td className={cn("px-4 py-2.5 text-right text-xs font-semibold", colorMargen(m.margenBruto))}> {m.ventas > 0 ? pct(m.margenBruto) : "—"}
 </td> <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground"> {m.gastos > 0 ? `(${fmt(m.gastos)})` : "—"}
 </td> <td className={cn("px-4 py-2.5 text-right font-mono text-xs font-bold",
 m.gananciaNeta > 0 ? "text-green-700 dark:text-green-400" : m.gananciaNeta < 0 ? "text-destructive" : "text-muted-foreground")}> {tieneData ? fmt(m.gananciaNeta) : "—"}
 </td> <td className="px-4 py-2.5"> <Barra value={m.ventas} max={maxVentas} color="bg-orange-500/40" /> </td> </tr> );
 })}
 </tbody> <tfoot> <tr className="border-t-2 bg-muted/30"> <td className="px-4 py-3 font-bold">Total {año}</td> <td className="px-4 py-3 text-right font-mono font-bold text-sm">{fmt(plVentas)}</td> <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">({fmt(plCogs)})</td> <td className={cn("px-4 py-3 text-right font-mono font-bold text-sm",
 plGananciaBruta >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(plGananciaBruta)}
 </td> <td className={cn("px-4 py-3 text-right font-bold", colorMargen(plMargenBruto))}> {pct(plMargenBruto)}
 </td> <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">({fmt(plGastos)})</td> <td className={cn("px-4 py-3 text-right font-mono font-bold text-sm",
 plGananciaNeta >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(plGananciaNeta)}
 </td> <td /> </tr> </tfoot> </table> </div> </div> )}

 {/* Ganancia por categoría */}
 <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}> <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: HEADER_BG }}> <h2 className="font-semibold text-sm"> Ganancia por categoría — {etiquetaPeriodo}
 </h2> <p className="text-xs text-muted-foreground">{porCategoria.length} categorías</p> </div> {porCategoria.length === 0 ? (
 <p className="text-sm text-muted-foreground py-10 text-center"> Sin ventas en el período seleccionado
 </p> ) : (
 <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b"> <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas netas</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">COGS</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ganancia bruta</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Margen</th> <th className="w-32 px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Peso en ventas</th> </tr> </thead> <tbody className="divide-y"> {porCategoria.map((c) => (
 <tr key={c.categoria} className="hover:bg-muted/20 transition-colors"> <td className="px-5 py-3 font-medium">{c.categoria}</td> <td className="px-4 py-3 text-right font-mono text-xs">{fmt(c.ventas, 2)}</td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground"> ({fmt(c.cogs, 2)})
 </td> <td className={cn("px-4 py-3 text-right font-mono text-xs font-semibold",
 c.ganancia >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(c.ganancia, 2)}
 </td> <td className={cn("px-4 py-3 text-right font-semibold text-xs", colorMargen(c.margen))}> {pct(c.margen)}
 </td> <td className="px-5 py-3"> <div className="space-y-1"> <Barra
 value={c.ventas}
 max={Math.max(...porCategoria.map((x) => x.ventas), 1)}
 color={bgMargen(c.margen)}
 /> <p className="text-[10px] text-muted-foreground"> {catVentas > 0 ? pct((c.ventas / catVentas) * 100) : "—"}
 </p> </div> </td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t-2 bg-muted/30"> <td className="px-5 py-3 font-bold">Total</td> <td className="px-4 py-3 text-right font-mono font-bold text-xs">{fmt(catVentas, 2)}</td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">({fmt(catCogs, 2)})</td> <td className={cn("px-4 py-3 text-right font-mono font-bold text-xs",
 catGanancia >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(catGanancia, 2)}
 </td> <td className={cn("px-4 py-3 text-right font-bold", colorMargen(catMargen))}> {pct(catMargen)}
 </td> <td /> </tr> </tfoot> </table> </div> )}
 </div> {/* 
 VENTAS POR CLIENTE 
 */}
 <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}> <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: HEADER_BG }}> <h2 className="font-semibold text-sm">Top 10 clientes — {etiquetaPeriodo}</h2> <p className="text-xs text-muted-foreground">Por volumen de ventas</p> </div> {porCliente.length === 0 ? (
 <p className="text-sm text-muted-foreground py-10 text-center">Sin ventas en el período</p> ) : (
 <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b"> <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">#</th> <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Facturas</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas netas</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">COGS</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ganancia</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Margen</th> <th className="w-28 px-4 py-2.5" /> </tr> </thead> <tbody className="divide-y"> {porCliente.map((c, idx) => (
 <tr key={c.clienteId} className="hover:bg-muted/20 transition-colors"> <td className="px-5 py-3 text-xs text-muted-foreground font-mono"> {String(idx + 1).padStart(2, "0")}
 </td> <td className="px-4 py-3"> <Link
 href={`/contabilidad/cxc/estado/${c.clienteId}`}
 className="font-medium text-sm hover:underline" style={{ color: "var(--accent-hex)" }} > {c.nombre}
 </Link> {c.rnc && (
 <p className="text-[10px] text-muted-foreground mt-0.5">RNC: {c.rnc}</p> )}
 </td> <td className="px-4 py-3 text-right text-xs text-muted-foreground"> {c.facturas}
 </td> <td className="px-4 py-3 text-right font-mono text-xs font-medium">
 {fmt(c.totalFacturado, 2)}
 <p className="text-[10px] text-muted-foreground font-normal">{fmt(c.ventas, 2)}</p>
 </td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground"> ({fmt(c.cogs, 2)})
 </td> <td className={cn("px-4 py-3 text-right font-mono text-xs font-semibold",
 c.ganancia >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(c.ganancia, 2)}
 </td> <td className={cn("px-4 py-3 text-right text-xs font-semibold", colorMargen(c.margen))}> {pct(c.margen)}
 </td> <td className="px-4 py-3"> <Barra
 value={c.totalFacturado}
 max={Math.max(...porCliente.map((x) => x.totalFacturado), 1)}
 color="bg-orange-500/50" /> </td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t-2 bg-muted/30"> <td colSpan={3} className="px-5 py-3 font-bold text-sm">Total</td> <td className="px-4 py-3 text-right font-mono font-bold text-xs"> {fmt(porCliente.reduce((s, c) => s + c.totalFacturado, 0), 2)}
 </td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground"> ({fmt(porCliente.reduce((s, c) => s + c.cogs, 0), 2)})
 </td> <td className={cn("px-4 py-3 text-right font-mono font-bold text-xs",
 porCliente.reduce((s, c) => s + c.ganancia, 0) >= 0
 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(porCliente.reduce((s, c) => s + c.ganancia, 0), 2)}
 </td> <td colSpan={2} /> </tr> </tfoot> </table> </div> )}
 </div> {/* 
 TOP 10 PRODUCTOS 
 */}
 <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}> <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: HEADER_BG }}> <h2 className="font-semibold text-sm">Top 10 productos — {etiquetaPeriodo}</h2> <p className="text-xs text-muted-foreground">Por volumen de ventas</p> </div> {topProductos.length === 0 ? (
 <p className="text-sm text-muted-foreground py-10 text-center">Sin ventas en el período</p> ) : (
 <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b"> <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">#</th> <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Producto</th> <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cantidad</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas netas</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">COGS</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ganancia</th> <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Margen</th> </tr> </thead> <tbody className="divide-y"> {topProductos.map((p, idx) => (
 <tr key={p.productoId} className="hover:bg-muted/20 transition-colors"> <td className="px-5 py-3 text-xs text-muted-foreground font-mono"> {String(idx + 1).padStart(2, "0")}
 </td> <td className="px-4 py-3"> <p className="font-medium text-sm">{p.nombre}</p> <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{p.codigo}</p> </td> <td className="px-4 py-3 text-xs text-muted-foreground"> {p.categoria}
 </td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground"> {p.cantidad.toLocaleString("es-DO", { maximumFractionDigits: 2 })} <span className="text-[10px] opacity-60 ml-0.5">{p.unidad}</span>
 </td> <td className="px-4 py-3 text-right font-mono text-xs font-medium">
 {fmt(p.totalFacturado, 2)}
 <p className="text-[10px] text-muted-foreground font-normal">{fmt(p.ventas, 2)}</p>
 </td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground"> ({fmt(p.cogs, 2)})
 </td> <td className={cn("px-4 py-3 text-right font-mono text-xs font-semibold",
 p.ganancia >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(p.ganancia, 2)}
 </td> <td className={cn("px-4 py-3 text-right text-xs font-bold", colorMargen(p.margen))}> {pct(p.margen)}
 </td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t-2 bg-muted/30"> <td colSpan={4} className="px-5 py-3 font-bold text-sm">Total top 10</td> <td className="px-4 py-3 text-right font-mono font-bold text-xs"> {fmt(topProductos.reduce((s, p) => s + p.totalFacturado, 0), 2)}
 </td> <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground"> ({fmt(topProductos.reduce((s, p) => s + p.cogs, 0), 2)})
 </td> <td className={cn("px-4 py-3 text-right font-mono font-bold text-xs",
 topProductos.reduce((s, p) => s + p.ganancia, 0) >= 0
 ? "text-green-700 dark:text-green-400" : "text-destructive")}> {fmt(topProductos.reduce((s, p) => s + p.ganancia, 0), 2)}
 </td> <td /> </tr> </tfoot> </table> </div> )}
 </div> {/* 
 MÉTODOS DE PAGO 
 */}
 <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}> <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}> <h2 className="font-semibold text-sm">Fondos recibidos — {etiquetaPeriodo}</h2> <p className="text-xs text-muted-foreground mt-0.5"> Pagos registrados en facturas · comisión tarjeta: {pagos.comisionPct}%
 </p> </div> {pagos.porMetodo.length === 0 ? (
 <p className="text-sm text-muted-foreground py-10 text-center">Sin pagos registrados en el período</p> ) : (
 <div className="p-5 space-y-4"> {/* Barras por método */}
 <div className="space-y-3"> {pagos.porMetodo.map((m) => (
 <div key={m.metodo}> <div className="flex items-center justify-between mb-1"> <span className="text-sm font-medium flex items-center gap-1.5"> <span>{m.icon}</span> {m.label}
 {m.metodo === "TARJETA" && m.comision > 0 && (
 <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full ml-1"> −{fmt(m.comision, 2)} comisión
 </span> )}
 </span> <div className="text-right"> <span className="font-mono text-sm font-bold">{fmt(m.monto, 2)}</span> {m.comision > 0 && (
 <span className="font-mono text-xs text-green-700 dark:text-green-400 ml-2">  {fmt(m.neto, 2)} neto
 </span> )}
 </div> </div> <Barra
 value={m.monto}
 max={pagos.total}
 color={
 m.metodo === "EFECTIVO" ? "bg-green-500" :
 m.metodo === "TARJETA" ? "bg-blue-500" :
 m.metodo === "TRANSFERENCIA" ? "bg-purple-500" :
 "bg-amber-500" }
 /> <p className="text-[10px] text-muted-foreground mt-0.5"> {pagos.total > 0 ? pct((m.monto / pagos.total) * 100) : "0%"} del total
 </p> </div> ))}
 </div> {/* Resumen */}
 <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3"> <div className="rounded-xl border p-3 space-y-1" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))" }}> <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total cobrado</p> <p className="text-lg font-bold font-mono" style={{ color: "var(--accent-hex)" }}>{fmt(pagos.total, 2)}</p> </div> {pagos.totalComisiones > 0 && (
 <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3"> <p className="text-xs text-destructive font-medium uppercase tracking-wide">Comisiones tarjeta</p> <p className="text-lg font-bold font-mono mt-1 text-destructive">−{fmt(pagos.totalComisiones, 2)}</p> <p className="text-[10px] text-muted-foreground mt-0.5">{pagos.comisionPct}% sobre pagos c/tarjeta</p> </div> )}
 <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3"> <p className="text-xs text-green-700 dark:text-green-400 font-medium uppercase tracking-wide">Neto en caja</p> <p className="text-lg font-bold font-mono mt-1 text-green-700 dark:text-green-400"> {fmt(pagos.totalNeto, 2)}
 </p> </div> </div> {pagos.totalComisiones === 0 && (
 <p className="text-xs text-muted-foreground"> Para configurar el % de comisión de tarjeta, contacta al administrador del sistema.
 </p> )}
 </div> )}
 </div> {/* Leyenda */}
 <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pb-2"> <span className="flex items-center gap-1.5"> <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Margen bruto ≥ 30% — Saludable
 </span> <span className="flex items-center gap-1.5"> <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" /> 15–29% — Aceptable
 </span> <span className="flex items-center gap-1.5"> <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> &lt; 15% — Revisar precios
 </span> <span className="flex items-center gap-1.5 ml-auto opacity-60"> COGS = costo promedio × cantidad vendida (ajustado por fracción)
 </span> </div> </div> );
}
