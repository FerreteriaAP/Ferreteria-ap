"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { GrupoColapsable } from "./grupo-colapsable";
import { pagarMultiplesCxP, type PagoMasivoCxPItem } from "@/actions/contabilidad";
import { cn } from "@/lib/utils";

// Tipos 

interface Compra {
 id: string; // cxpId
 compraId: string;
 numero: string;
 monto: number;
 saldo: number;
 fechaVencimiento: Date;
 fechaFactura: Date | null;
 ncf: string | null;
 noFacturaSuplidor: string | null;
 estado: string;
 diasVencida: number;
 diasRestantes: number;
}

interface Grupo {
 suplidor: { id: string; nombre: string; rnc: string | null };
 totalSaldo: number;
 totalVencido: number;
 compras: Compra[];
}

interface Props {
 grupos: Grupo[];
}

// Helpers 

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function agingVariant(dias: number): "default" | "secondary" | "outline" | "destructive" {
 if (dias <= 0) return "outline";
 if (dias <= 30) return "secondary";
 if (dias <= 60) return "default";
 return "destructive";
}
function agingLabel(dias: number) {
 if (dias <= 0) return "Al día";
 if (dias <= 30) return `${dias}d · 0-30`;
 if (dias <= 60) return `${dias}d · 31-60`;
 if (dias <= 90) return `${dias}d · 61-90`;
 return `${dias}d · +90`;
}
function agingColor(dias: number) {
 if (dias <= 0) return "text-green-700 dark:text-green-400";
 if (dias <= 30) return "text-yellow-600 dark:text-yellow-400";
 if (dias <= 60) return "text-orange-600 dark:text-orange-400";
 return "text-destructive";
}

// Modal Planilla de pago 

interface ModalProps {
 compras: Compra[];
 grupos: Grupo[];
 onClose: () => void;
 onOk: () => void;
}

const METODOS = [
 { value: "EFECTIVO", label: "Efectivo" },
 { value: "TRANSFERENCIA", label: "Transferencia" },
 { value: "CHEQUE", label: "Cheque" },
 { value: "TARJETA", label: "Tarjeta" },
];

function ModalPlanillaPago({ compras, grupos, onClose, onOk }: ModalProps) {
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [metodo, setMetodo] = useState("EFECTIVO");
 const [referencia, setRef] = useState("");
 const [notas, setNotas] = useState("");
 const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

 const total = compras.reduce((s, c) => s + c.saldo, 0);

 const getSuplidor = (compraId: string) => {
 for (const g of grupos) {
 if (g.compras.some(c => c.compraId === compraId)) return g.suplidor.nombre;
 }
 return "—";
 };

 const handleSubmit = () => {
 if (!metodo) { setError("Selecciona la forma de pago"); return; }
 setError(null);
 const pagos: PagoMasivoCxPItem[] = compras.map(c => ({
 cxpId: c.id,
 compraId: c.compraId,
 monto: c.saldo,
 }));
 start(async () => {
 const res = await pagarMultiplesCxP(pagos, metodo, fecha, referencia || undefined, notas || undefined);
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"> <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"> <div className="flex items-center justify-between px-5 py-4 border-b"> <h2 className="font-bold text-base"> Planilla de pago CxP</h2> <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button> </div> <div className="px-5 py-4 space-y-4"> {/* Lista de compras a pagar */}
 <div className="border rounded-lg overflow-hidden"> <table className="w-full text-sm"> <thead> <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide"> <th className="px-3 py-2 text-left">Compra</th> <th className="px-3 py-2 text-left">Suplidor</th> <th className="px-3 py-2 text-right">Monto</th> </tr> </thead> <tbody> {compras.map((c, i) => (
 <tr key={c.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}> <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: "var(--accent-hex)" }}>{c.numero}</td> <td className="px-3 py-2 text-xs">{getSuplidor(c.compraId)}</td> <td className="px-3 py-2 text-right tabular-nums font-medium text-sm">{fmt(c.saldo)}</td> </tr> ))}
 <tr className="bg-muted/40 border-t font-bold"> <td className="px-3 py-2 text-xs" colSpan={2}>Total a pagar</td> <td className="px-3 py-2 text-right tabular-nums text-base" style={{ color: "var(--accent-hex)" }}>{fmt(total)}</td> </tr> </tbody> </table> </div> {/* Forma de pago */}
 <div> <label className="text-xs font-medium text-muted-foreground block mb-1.5">Forma de pago</label> <div className="grid grid-cols-2 gap-2"> {METODOS.map(m => (
 <button
 key={m.value}
 type="button" onClick={() => setMetodo(m.value)}
 className={cn(
 "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
 metodo === m.value
 ? "border-orange-400 text-orange-500 font-semibold"
 : "border-border hover:bg-accent text-muted-foreground hover:text-foreground" )}
 > {m.label}
 </button> ))}
 </div> </div> {/* Fecha */}
 <div> <label className="text-xs font-medium text-muted-foreground block mb-1">Fecha de pago</label> <input
 type="date" value={fecha}
 onChange={e => setFecha(e.target.value)}
 className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" /> </div> {/* Referencia */}
 <div> <label className="text-xs font-medium text-muted-foreground block mb-1"> Referencia <span className="text-muted-foreground/60">(No. cheque, transferencia…)</span> </label> <input
 type="text" value={referencia}
 onChange={e => setRef(e.target.value)}
 placeholder="Ej: CHQ-001234 o TRF-567890" className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" /> </div> {/* Notas */}
 <div> <label className="text-xs font-medium text-muted-foreground block mb-1">Notas</label> <textarea
 value={notas}
 onChange={e => setNotas(e.target.value)}
 rows={2}
 placeholder="Observaciones adicionales…" className="w-full border rounded-lg px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary" /> </div> {error && (
 <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p> )}

 <div className="flex gap-2 justify-end pt-1"> <button
 onClick={onClose}
 className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors" > Cancelar
 </button> <button
 onClick={handleSubmit}
 disabled={isPending}
 className={cn(
 "px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium",
 "hover:bg-orange-600 transition-colors",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "Registrando…" : "Registrar pagos"}
 </button> </div> </div> </div> </div> );
}

// Componente principal 

export function CxPMultiSelect({ grupos }: Props) {
 const router = useRouter();
 const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
 const [showModal, setShowModal] = useState(false);

 const toggle = (id: string) => setSeleccionadas(prev => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });

 const toggleGrupo = (compras: Compra[]) => {
 const pendientes = compras.filter(c => c.estado !== "PAGADO");
 const ids = pendientes.map(c => c.id);
 const todasSel = ids.every(id => seleccionadas.has(id));
 setSeleccionadas(prev => {
 const next = new Set(prev);
 if (todasSel) { ids.forEach(id => next.delete(id)); }
 else { ids.forEach(id => next.add(id)); }
 return next;
 });
 };

 const comprasSeleccionadas = grupos
 .flatMap(g => g.compras)
 .filter(c => seleccionadas.has(c.id));

 const handlePagoOk = () => {
 setShowModal(false);
 setSeleccionadas(new Set());
 router.refresh();
 };

 return (
 <>
 {/* Barra de selección — sticky arriba, justo debajo de la cabecera */}
 {seleccionadas.size > 0 && (
 <div className="sticky top-2 z-40 mb-3">
 <div className="inline-flex items-center gap-3 bg-background border shadow-md rounded-xl px-4 py-2">
 <span className="text-xs font-medium text-muted-foreground shrink-0">
 {seleccionadas.size} compra{seleccionadas.size !== 1 ? "s" : ""}
 </span>
 <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "var(--accent-hex)" }}>
 {fmt(comprasSeleccionadas.reduce((s, c) => s + c.saldo, 0))}
 </span>
 <button
 onClick={() => setShowModal(true)}
 className="px-3 py-1 rounded-full border text-xs font-semibold transition-colors shrink-0"
 style={{ borderColor: "#f97316", color: "#f97316" }}
 > Pago Facturas
 </button>
 <button
 onClick={() => setSeleccionadas(new Set())}
 className="text-muted-foreground hover:text-foreground text-base leading-none shrink-0"
 > ×
 </button>
 </div>
 </div>
 )}
 <div className="space-y-3"> {grupos.map((g) => {
 const pendientes = g.compras.filter(c => c.estado !== "PAGADO");
 const idsPendientes = pendientes.map(c => c.id);
 const todasSel = idsPendientes.length > 0 && idsPendientes.every(id => seleccionadas.has(id));
 const algunaSel = idsPendientes.some(id => seleccionadas.has(id));

 return (
 <GrupoColapsable
 key={g.suplidor.id}
 nombre={g.suplidor.nombre}
 rnc={g.suplidor.rnc}
 count={g.compras.length}
 totalSaldo={g.totalSaldo}
 totalVencido={g.totalVencido}
 etiqueta="compra" defaultOpen={false}
 accion={
 pendientes.length > 0 ? (
 <label
 className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}
 > <input
 type="checkbox" checked={todasSel}
 ref={el => { if (el) el.indeterminate = algunaSel && !todasSel; }}
 onChange={() => toggleGrupo(g.compras)}
 className="w-3.5 h-3.5 cursor-pointer" /> <span className="hidden sm:inline">Seleccionar</span> </label> ) : undefined
 }
 > <div className="overflow-x-auto">
 {g.compras.map((c) => (
 <div key={c.id} className={cn(
 "px-3 py-2 flex items-center gap-2 border-b last:border-0 min-w-[700px]",
 seleccionadas.has(c.id) && "bg-orange-500/5"
 )}>
 {/* Checkbox — 20px */}
 <div className="w-5 shrink-0 flex items-center">
 {c.estado !== "PAGADO"
 ? <input type="checkbox" checked={seleccionadas.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 cursor-pointer" />
 : null}
 </div>
 {/* Número — 92px */}
 <div className="w-[92px] shrink-0">
 <Link href={`/compras/${c.compraId}?from=cxp`}
 className="font-mono text-xs font-semibold hover:underline block truncate"
 style={{ color: "var(--accent-hex)" }}>
 {c.numero}
 </Link>
 </div>
 {/* Fecha factura — 62px */}
 <div className="w-[62px] shrink-0">
 <span className="text-xs text-muted-foreground">
 {c.fechaFactura ? new Date(c.fechaFactura).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
 </span>
 </div>
 {/* NCF — 116px */}
 <div className="w-[116px] shrink-0">
 <span className="font-mono text-xs text-muted-foreground block truncate">
 {c.ncf ?? "—"}
 </span>
 </div>
 {/* Referencia suplidor — 84px */}
 <div className="w-[84px] shrink-0">
 <span className="font-mono text-xs text-muted-foreground block truncate">
 {c.noFacturaSuplidor ?? "—"}
 </span>
 </div>
 {/* Spacer */}
 <div className="flex-1" />
 {/* Días a vencer — 76px, derecha */}
 <div className="w-[76px] shrink-0 text-right">
 <span className={cn(
 "text-xs",
 c.diasRestantes < 0 ? "text-destructive font-semibold" : "text-muted-foreground"
 )}>
 {c.diasRestantes < 0 ? `${Math.abs(c.diasRestantes)}d venc.`
 : c.diasRestantes === 0 ? "hoy"
 : `${c.diasRestantes}d`}
 </span>
 </div>
 {/* Estado badge — 92px, derecha */}
 <div className="w-[92px] shrink-0 flex justify-end">
 <Badge variant={agingVariant(c.diasVencida)} className="text-xs">{agingLabel(c.diasVencida)}</Badge>
 </div>
 {/* Saldo — 120px, derecha */}
 <div className="w-[120px] shrink-0 text-right">
 <p className={cn("font-mono text-sm font-semibold whitespace-nowrap", agingColor(c.diasVencida))}>{fmt(c.saldo)}</p>
 </div>
 </div>
 ))}
 </div>
 </GrupoColapsable> );
 })}
 </div>

 {showModal && (
 <ModalPlanillaPago
 compras={comprasSeleccionadas}
 grupos={grupos}
 onClose={() => setShowModal(false)}
 onOk={handlePagoOk}
 /> )}
 </> );
}
