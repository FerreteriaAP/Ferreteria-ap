"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { rangoFechas } from "@/lib/rangos";
import { Printer } from "lucide-react";

// Tipos de período disponibles 

const TIPOS = [
 { key: "dia", label: "Día" },
 { key: "semana", label: "Semana (7 días)" },
 { key: "quincena", label: "Quincena" },
 { key: "mes", label: "Mes" },
 { key: "rango", label: "Rango libre" },
];

// Props 

interface Props {
 // Valores actuales leídos desde la URL (para pre-poblar el formulario)
 tipo: string;
 fecha?: string;
 mes?: string;
 q?: string;
 desde?: string;
 hasta?: string;
 reporte: string;
 soloMovimientos?: boolean; // ASISTENTE: solo ver movimientos de caja
}

// Componente 

export function ReportesFiltro({ tipo: tipoProp, fecha: fechaProp, mes: mesProp,
 q: qProp, desde: desdeProp, hasta: hastaProp, reporte, soloMovimientos }: Props) {

 const router = useRouter();
 const pathname = usePathname();

 const todayStr = new Date().toISOString().slice(0, 10);
 const mesStr = todayStr.slice(0, 7);

 const [tipo, setTipo] = useState(tipoProp || "mes");
 const [fecha, setFecha] = useState(fechaProp || todayStr);
 const [mes, setMes] = useState(mesProp || mesStr);
 const [q, setQ] = useState(qProp || "1");
 const [desde, setDesde] = useState(desdeProp || mesStr + "-01");
 const [hasta, setHasta] = useState(hastaProp || todayStr);

 // Sincronizar si cambian desde el servidor (navegación back/forward)
 useEffect(() => {
 setTipo(tipoProp || "mes");
 setFecha(fechaProp || todayStr);
 setMes(mesProp || mesStr);
 setQ(qProp || "1");
 setDesde(desdeProp || mesStr + "-01");
 setHasta(hastaProp || todayStr);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [tipoProp, fechaProp, mesProp, qProp, desdeProp, hastaProp]);

 // Construir URL de búsqueda
 const buildUrl = (overrides: Record<string, string> = {}) => {
 const p: Record<string, string> = { tipo, reporte };
 if (tipo === "dia" || tipo === "semana") p.fecha = fecha;
 if (tipo === "quincena" || tipo === "mes") p.mes = mes;
 if (tipo === "quincena") p.q = q;
 if (tipo === "rango") { p.desde = desde; p.hasta = hasta; }
 Object.assign(p, overrides);
 return `${pathname}?${new URLSearchParams(p).toString()}`;
 };

 // Para dinero-recibido: añade filtrar=1 al aplicar (indica que el usuario quiso filtrar)
 const aplicar = () => {
  const base = buildUrl();
  if (reporte === "dinero-recibido") {
   const sep = base.includes("?") ? "&" : "?";
   router.push(`${base}${sep}filtrar=1`);
  } else {
   router.push(base);
  }
 };

 const REPORTE_PRINT_PATH: Record<string, string> = {
  "cierres":         "/contabilidad/reportes/periodo",
  "movimientos":     "/contabilidad/reportes/movimientos",
  "notas-credito":   "/contabilidad/reportes/notas-credito",
  "dinero-recibido": "/contabilidad/reportes/dinero-recibido",
 };

 const buildPeriodoUrl = () => {
  const { desde: d, hasta: h, label: lbl } = rangoFechas({ tipo, fecha, mes, q, desde, hasta });
  const params = new URLSearchParams({
   desde: d.toISOString(),
   hasta: h.toISOString(),
   label: lbl,
  });
  const path = REPORTE_PRINT_PATH[reporte] ?? "/contabilidad/reportes/periodo";
  return `${path}?${params.toString()}`;
 };


 return (
 <div className="rounded-xl border bg-card p-4 space-y-4"> {/* Selector de reporte */}
 <div className="flex gap-2 flex-wrap"> {[
 { key: "cierres",         label: "Cierres de caja",    cv: "var(--report-tab-cierres,     #3b82f6)" },
 { key: "movimientos",     label: "Movimientos de caja", cv: "var(--report-tab-movimientos, #ef4444)" },
 { key: "notas-credito",   label: "Notas de Crédito",   cv: "var(--report-tab-notas,       #a855f7)" },
 { key: "dinero-recibido", label: "Dinero Recibido",    cv: "var(--report-tab-dinero,      #22c55e)" },
 ].filter(r => !(soloMovimientos && r.key !== "movimientos")).map(r => (
 <a key={r.key}
 href={buildUrl({ reporte: r.key })}
 style={reporte === r.key
   ? { backgroundColor: `color-mix(in oklch, ${r.cv} 12%, transparent)`, color: r.cv, borderColor: r.cv }
   : { color: r.cv, borderColor: `color-mix(in oklch, ${r.cv} 35%, transparent)`, backgroundColor: "transparent" }
 }
 className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:opacity-80"> {r.label}
 </a> ))}
 </div> <div className="border-t pt-4 space-y-3"> {/* Tipo de período */}
 <div className="flex flex-wrap gap-2 items-center"> <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0 w-24"> Tipo:
 </span> <div className="flex gap-1.5 flex-wrap"> {TIPOS.map(t => (
 <button key={t.key} type="button" onClick={() => setTipo(t.key)}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
 tipo === t.key
 ? "bg-primary/10 border-primary text-primary font-semibold" : "border-muted text-muted-foreground hover:text-foreground hover:bg-accent" )}> {t.label}
 </button> ))}
 </div> </div> {/* Campos según el tipo */}
 <div className="flex flex-wrap gap-3 items-end pl-[calc(1.5rem+1px)]"> {/* Día */}
 {tipo === "dia" && (
 <label className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Fecha</span> <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </label> )}

 {/* Semana */}
 {tipo === "semana" && (
 <label className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Fecha fin (7 días hacia atrás)</span> <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </label> )}

 {/* Quincena */}
 {tipo === "quincena" && (
 <> <label className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Mes</span> <input type="month" value={mes} onChange={e => setMes(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </label> <div className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Quincena</span> <div className="flex gap-2"> {["1", "2"].map(n => (
 <button key={n} type="button" onClick={() => setQ(n)}
 className={cn(
 "h-9 px-5 rounded-lg text-sm font-semibold border transition-colors",
 q === n
 ? "bg-primary text-primary-foreground border-primary" : "border-muted hover:bg-accent" )}> {n}ª (1–{n === "1" ? "15" : "fin"})
 </button> ))}
 </div> </div> </> )}

 {/* Mes */}
 {tipo === "mes" && (
 <label className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Mes y año</span> <input type="month" value={mes} onChange={e => setMes(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </label> )}

 {/* Rango libre */}
 {tipo === "rango" && (
 <> <label className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Desde</span> <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </label> <label className="flex flex-col gap-1"> <span className="text-xs text-muted-foreground font-medium">Hasta</span> <input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </label> </> )}

 {/* Botón Aplicar */}
 <button type="button" onClick={aplicar}
 className="h-9 px-5 rounded-lg text-sm font-semibold transition-colors"
 style={{ border: "1.5px solid #F47717", color: "#F47717", background: "transparent" }}>
  Generar
 </button>
 {/* Botón: emitir reporte del período (todos los tabs con página de impresión) */}
 {!soloMovimientos && REPORTE_PRINT_PATH[reporte] && (
  <a
   href={buildPeriodoUrl()}
   target="_blank"
   rel="noopener noreferrer"
   className="h-9 px-4 rounded-lg text-sm font-semibold border transition-colors hover:bg-accent flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
  >
   <Printer size={14} />
   Emitir reporte del período
  </a>
 )}
 </div> </div> </div> );
}
