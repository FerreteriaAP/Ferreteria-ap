"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { actualizarLineaNomina } from "@/actions/nominas";
import { cn } from "@/lib/utils";
import { Save, CheckCircle2, Loader2, Printer } from "lucide-react";

// Tipos 

interface EmpleadoLinea {
 id: string;
 salarioBase: number;
 horasExtra: number;
 montoHorasExtra: number;
 bono: number;
 afpEmpleado: number;
 sfsEmpleado: number;
 afpEmpleador: number;
 sfsEmpleador: number;
 prestamos: number;
 san: number;
 otrosDescuentos: number;
 totalBruto: number;
 totalDescuentos: number;
 totalNeto: number;
 notas: string | null;
 empleado: {
 nombre: string;
 apellido: string;
 cargo: string;
 cedula: string;
 valorHoraExtra: number;
 descuentoSan: number;
 };
}

interface NominaTablaProps {
 nominaId: string;
 estado: string;
 numero: string;
 periodo: string;
 mes: number;
 anio: number;
 lineas: EmpleadoLinea[];
}

// Helpers 

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const PERIODO_LABEL: Record<string, string> = {
 PRIMERA_QUINCENA: "1ra Quincena (1–15)",
 SEGUNDA_QUINCENA: "2da Quincena (16–fin)",
};

// Siempre: 2,000.00 — independiente del locale del navegador
const fmtNum = (n: number) => {
 const [ent, dec] = Number(n).toFixed(2).split(".");
 return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

// Estado por fila 

type FilaState = {
 horasExtra: number;
 montoHorasExtra: number;
 bono: number;
 afpEmpleado: number;
 sfsEmpleado: number;
 prestamos: number;
 san: number;
 otrosDescuentos: number;
};

function calcTotales(s: FilaState, salario: number) {
 const bruto = salario + s.montoHorasExtra + s.bono;
 const desc = s.afpEmpleado + s.sfsEmpleado + s.prestamos + s.san + s.otrosDescuentos;
 return { bruto, desc, neto: bruto - desc };
}

// Input numérico con formato 
// Definido FUERA de FilaNomina para que React no lo remonte en cada render

function NumericInput({
 value,
 onChange,
 isDirty,
 isHrs,
}: {
 value: number;
 onChange: (v: number) => void;
 isDirty: boolean;
 isHrs?: boolean;
}) {
 const [focused, setFocused] = useState(false);
 const [raw, setRaw] = useState("");
 const inputRef = useRef<HTMLInputElement>(null);

 const displayVal = focused
 ? raw
 : value === 0
 ? "" : isHrs
 ? String(value)
 : fmtNum(value);

 return (
 <input
 ref={inputRef}
 type="text" inputMode={isHrs ? "numeric" : "decimal"}
 value={displayVal}
 placeholder="—" onFocus={() => {
 setRaw(value === 0 ? "" : String(value));
 setFocused(true);
 setTimeout(() => inputRef.current?.select(), 0);
 }}
 onChange={(e) => {
 const txt = e.target.value.replace(/,/g, "");
 setRaw(e.target.value);
 onChange(Number(txt) || 0);
 }}
 onBlur={() => setFocused(false)}
 className={cn(
 "w-full bg-transparent text-right font-mono text-[13px] tabular-nums",
 "border-0 border-b border-transparent",
 "focus:border-black/30 focus:outline-none focus:bg-black/[0.03]",
 "px-0 py-0 transition-colors placeholder:text-black/20",
 isDirty && "text-amber-700",
 )}
 /> );
}

// Fila editable 

function FilaNomina({
 linea,
 nominaId,
 editable,
 onSaved,
}: {
 linea: EmpleadoLinea;
 nominaId: string;
 editable: boolean;
 onSaved: () => void;
}) {
 const [vals, setVals] = useState<FilaState>({
 horasExtra: linea.horasExtra,
 montoHorasExtra: linea.montoHorasExtra,
 bono: linea.bono,
 afpEmpleado: linea.afpEmpleado,
 sfsEmpleado: linea.sfsEmpleado,
 prestamos: linea.prestamos,
 san: linea.san,
 otrosDescuentos: linea.otrosDescuentos,
 });

 const [saved, setSaved] = useState<FilaState>(vals);
 const [saving, setSaving] = useState(false);
 const [ok, setOk] = useState(false);

 const isDirty = JSON.stringify(vals) !== JSON.stringify(saved);
 const { bruto, neto } = calcTotales(vals, linea.salarioBase);

 const setHorasExtra = (hrs: number) => {
 const monto = +(hrs * linea.empleado.valorHoraExtra).toFixed(2);
 setVals((v) => ({ ...v, horasExtra: hrs, montoHorasExtra: monto }));
 };
 const set = (k: keyof FilaState) => (v: number) => setVals((prev) => ({ ...prev, [k]: v }));

 const handleSave = async () => {
 setSaving(true);
 await actualizarLineaNomina(linea.id, {
 horasExtra: vals.horasExtra,
 montoHorasExtra: vals.montoHorasExtra,
 bono: vals.bono,
 afpEmpleado: vals.afpEmpleado,
 sfsEmpleado: vals.sfsEmpleado,
 prestamos: vals.prestamos,
 san: vals.san,
 otrosDescuentos: vals.otrosDescuentos,
 });
 setSaved(vals);
 setSaving(false);
 setOk(true);
 setTimeout(() => setOk(false), 2000);
 onSaved();
 };

 const tdR = (content: React.ReactNode, cls?: string) => (
 <td className={cn("px-2.5 py-2 text-right font-mono text-[13px] tabular-nums", cls)}> {content}
 </td> );

 return (
 <tr className={cn(
 "border-b border-black/[0.06] transition-colors hover:bg-black/[0.015]",
 isDirty && "bg-amber-50/60",
 )}> {/* Empleado */}
 <td className="px-3 py-2 whitespace-nowrap"> <p className="text-[13px] font-semibold text-black leading-tight"> {linea.empleado.nombre} {linea.empleado.apellido}
 </p> <p className="text-[11px] text-black/40 mt-0.5">{linea.empleado.cargo}</p> </td> {/* Salario Q */}
 {tdR(<span className="text-black/60">{fmtNum(linea.salarioBase)}</span>)}

 {/* DEVENGADOS */}
 {/* H. Extra hrs */}
 <td className="px-2.5 py-2 w-[72px]"> {editable
 ? <NumericInput value={vals.horasExtra} onChange={setHorasExtra} isDirty={isDirty} isHrs /> : <span className="text-right block font-mono text-[13px]">{vals.horasExtra || "—"}</span> }
 </td> {/* H. Extra RD$ */}
 <td className="px-2.5 py-2 w-[120px]"> {editable
 ? <NumericInput value={vals.montoHorasExtra} onChange={set("montoHorasExtra")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px]">{vals.montoHorasExtra > 0 ? fmtNum(vals.montoHorasExtra) : "—"}</span> }
 </td> {/* Bono */}
 <td className="px-2.5 py-2 w-[120px]"> {editable
 ? <NumericInput value={vals.bono} onChange={set("bono")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px]">{vals.bono > 0 ? fmtNum(vals.bono) : "—"}</span> }
 </td> {/* Total Bruto */}
 {tdR(
 <span className="font-bold text-black">{fmtNum(bruto)}</span>,
 "bg-black/[0.025] border-x border-black/[0.06]" )}

 {/* DESCUENTOS */}
 {/* AFP */}
 <td className="px-2.5 py-2 w-[115px]"> {editable
 ? <NumericInput value={vals.afpEmpleado} onChange={set("afpEmpleado")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px] text-black/50">{fmtNum(vals.afpEmpleado)}</span> }
 </td> {/* SFS */}
 <td className="px-2.5 py-2 w-[115px]"> {editable
 ? <NumericInput value={vals.sfsEmpleado} onChange={set("sfsEmpleado")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px] text-black/50">{fmtNum(vals.sfsEmpleado)}</span> }
 </td> {/* Préstamos */}
 <td className="px-2.5 py-2 w-[120px]"> {editable
 ? <NumericInput value={vals.prestamos} onChange={set("prestamos")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px] text-black/50">{vals.prestamos > 0 ? fmtNum(vals.prestamos) : "—"}</span> }
 </td> {/* SAN */}
 <td className="px-2.5 py-2 w-[115px]"> {editable
 ? <NumericInput value={vals.san} onChange={set("san")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px] text-black/50">{vals.san > 0 ? fmtNum(vals.san) : "—"}</span> }
 </td> {/* Otros */}
 <td className="px-2.5 py-2 w-[115px]"> {editable
 ? <NumericInput value={vals.otrosDescuentos} onChange={set("otrosDescuentos")} isDirty={isDirty} /> : <span className="text-right block font-mono text-[13px] text-black/50">{vals.otrosDescuentos > 0 ? fmtNum(vals.otrosDescuentos) : "—"}</span> }
 </td> {/* NETO */}
 <td className="px-3 py-2 text-right whitespace-nowrap border-l border-black/[0.06] bg-black/[0.025]"> <span className="text-[11px] text-black/30 mr-0.5">RD$</span> <span className="text-[15px] font-black text-black tracking-tight">{fmtNum(neto)}</span> </td> {/* Guardar */}
 {editable && (
 <td className="px-2 py-2 w-[80px] text-center"> {saving ? (
 <Loader2 className="h-4 w-4 animate-spin mx-auto text-black/30" /> ) : ok ? (
 <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600" /> ) : isDirty ? (
 <button
 onClick={handleSave}
 className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold bg-black text-white hover:bg-black/80 transition-colors" > <Save className="h-3 w-3" /> Guardar
 </button> ) : null}
 </td> )}

 {/* Volante individual */}
 <td className="px-2 py-2 w-[38px] text-center"> <Link
 href={`/nominas/${nominaId}/imprimir/${linea.id}`}
 target="_blank" rel="noopener noreferrer" title={`Volante de ${linea.empleado.nombre}`}
 className="inline-flex items-center justify-center w-7 h-7 rounded-md text-black/30 hover:text-black hover:bg-black/[0.06] transition-colors" > <Printer className="h-3.5 w-3.5" /> </Link> </td> </tr> );
}

// Botón imprimir volantes 

function VolantesBtn({ nominaId }: { nominaId: string }) {
 return (
 <Link
 href={`/nominas/${nominaId}/imprimir`}
 target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold border border-black/20 bg-white hover:bg-black hover:text-white transition-colors text-black" > <Printer className="h-3.5 w-3.5" /> Imprimir volantes
 </Link> );
}



// Tabla principal 

export function NominaTabla({ nominaId, estado, numero, periodo, mes, anio, lineas }: NominaTablaProps) {
 const router = useRouter();
 const editable = estado === "BORRADOR";

 const handleSaved = useCallback(() => { router.refresh(); }, [router]);

 // Totales calculados desde el estado local
 const totalBruto = lineas.reduce((s, l) => s + l.salarioBase + l.montoHorasExtra + l.bono, 0);
 const totalNeto = lineas.reduce((s, l) => s + l.totalNeto, 0);

 // Header cell helpers
 const thDark = (label: string, cls?: string) => (
 <th className={cn(
 "px-2.5 py-2 text-right text-[10px] font-bold tracking-wide whitespace-nowrap text-white/80",
 cls
 )}> {label}
 </th> );
 const thSection = (label: string, span: number, cls?: string) => (
 <th
 colSpan={span}
 className={cn(
 "px-2 py-1.5 text-center text-[9px] font-black tracking-[0.12em] uppercase",
 cls
 )}
 > {label}
 </th> );

 return (
 <div className="space-y-3"> {/* Controles superiores */}
 <div className="flex items-center justify-between"> {editable && (
 <p className="text-[11px] text-black/40 italic"> Escribe directamente en la tabla — el botón Guardar aparece al modificar cada fila
 </p> )}
 <div className="ml-auto"> <VolantesBtn nominaId={nominaId} /> </div> </div> {/* Tabla */}
 <div className="overflow-x-auto rounded-lg border border-black/10 shadow-sm"> <table className="w-full border-collapse bg-white"> {/* THEAD */}
 <thead> {/* Fila de grupos */}
 <tr className="bg-[#0f172a]"> <th className="px-3 py-2 text-left text-[10px] font-black tracking-wide text-white/60 uppercase"> Empleado / Cargo
 </th> <th className="px-2.5 py-2 text-right text-[10px] font-bold tracking-wide text-white/60 whitespace-nowrap"> Salario Q
 </th> {thSection(" Devengados", 3, "text-emerald-400 border-l border-white/10")}
 {thSection("Total Bruto", 1, "text-white/90 bg-white/10 border-x border-white/10")}
 {thSection("($) Descuentos", 5, "text-rose-400 border-l border-white/10")}
 <th className="px-3 py-2 text-center text-[10px] font-black tracking-[0.12em] uppercase text-white bg-white/10 border-l border-white/10"> Neto
 </th> {editable && <th className="w-[88px] bg-[#0f172a]" />}
 <th className="w-[38px] bg-[#0f172a]" /> </tr> {/* Fila de columnas */}
 <tr className="bg-[#1e293b] border-b border-white/10"> <th className="px-3 py-2 text-left" /> {thDark("RD$")}
 {thDark(" Hrs", "border-l border-white/10")}
 {thDark("$ Monto")}
 {thDark("$ Bono")}
 {thDark("$ Bruto", "bg-white/10 border-x border-white/10")}
 {thDark("AFP 2.87%", "border-l border-white/10")}
 {thDark("SFS 3.04%")}
 {thDark("$ Préstamos")}
 {thDark("$ SAN")}
 {thDark("$ Otros")}
 <th className="px-3 py-2 text-center text-[10px] font-bold text-white bg-white/10 border-l border-white/10"> RD$
 </th> {editable && <th className="bg-[#1e293b]" />}
 <th className="bg-[#1e293b]" /> </tr> </thead> {/* TBODY */}
 <tbody> {lineas.map((l) => (
 <FilaNomina
 key={l.id}
 linea={l}
 nominaId={nominaId}
 editable={editable}
 onSaved={handleSaved}
 /> ))}
 </tbody> {/* TFOOT */}
 <tfoot> <tr className="bg-[#0f172a] border-t-2 border-black/20"> <td className="px-3 py-2.5 text-[11px] font-semibold text-white/50 uppercase tracking-wide"> Totales — {lineas.length} empleado{lineas.length !== 1 ? "s" : ""}
 </td> <td colSpan={4} /> <td className="px-2.5 py-2.5 text-right font-mono font-bold text-emerald-400 tabular-nums border-x border-white/10 bg-white/5"> {fmtNum(totalBruto)}
 </td> <td colSpan={5} /> <td className="px-3 py-2.5 text-right whitespace-nowrap border-l border-white/10 bg-white/5"> <span className="text-[10px] text-white/40 mr-1">RD$</span> <span className="text-[15px] font-black text-white tracking-tight">{fmtNum(totalNeto)}</span> </td> {editable && <td className="bg-[#0f172a]" />}
 <td className="bg-[#0f172a]" /> </tr> </tfoot> </table> </div> {/* Hint edición */}
 {editable && (
 <p className="text-[11px] text-black/30 text-center"> AFP y SFS se pueden poner en <strong>0</strong> si el empleado no aplica · Los cambios se resaltan en amarillo hasta que presiones Guardar
 </p> )}
 </div> );
}
