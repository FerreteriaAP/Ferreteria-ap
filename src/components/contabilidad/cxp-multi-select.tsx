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
 { value: "EFECTIVO", label: " Efectivo" },
 { value: "TRANSFERENCIA", label: " Transferencia" },
 { value: "CHEQUE", label: " Cheque" },
 { value: "TARJETA", label: " Tarjeta" },
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
 ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground hover:text-foreground" )}
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
 "px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
 "hover:bg-primary/90 transition-colors",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "Registrando…" : " Registrar pagos"}
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
 <> <div className="space-y-3"> {grupos.map((g) => {
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
 > {g.compras.map((c) => (
 <div
 key={c.id}
 className={cn(
 "flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5",
 seleccionadas.has(c.id) && "bg-primary/5" )}
 > <div className="flex items-center gap-3 min-w-0"> {c.estado !== "PAGADO" && (
 <input
 type="checkbox" checked={seleccionadas.has(c.id)}
 onChange={() => toggle(c.id)}
 className="w-4 h-4 cursor-pointer shrink-0" /> )}
 <Link
 href={`/compras/${c.compraId}?from=cxp`}
 className="font-mono text-xs font-medium hover:underline shrink-0"
 style={{ color: "var(--accent-hex)" }} > {c.numero}
 </Link>
 {c.noFacturaSuplidor && (
 <span className="text-[10px] text-muted-foreground">Ref: <span className="font-mono">{c.noFacturaSuplidor}</span></span>
 )}
 {c.ncf && <span className="font-mono text-[10px] text-muted-foreground truncate">{c.ncf}</span>}
 <Badge variant={agingVariant(c.diasVencida)} className="text-[10px] shrink-0"> {agingLabel(c.diasVencida)}
 </Badge> {c.estado === "PAGADO" && (
 <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 shrink-0"> Pagado
 </Badge> )}
 </div>
 <div className="flex items-center gap-4 text-sm shrink-0">
 {c.fechaFactura && (
 <span className="text-muted-foreground text-[10px]">
 Fac: {new Date(c.fechaFactura).toLocaleDateString("es-DO")}
 </span>
 )}
 <span className="text-muted-foreground text-[10px]">
 Vence: {new Date(c.fechaVencimiento).toLocaleDateString("es-DO")}
 {c.diasRestantes > 0
 ? <span className="ml-1 text-green-600 dark:text-green-400">({c.diasRestantes}d)</span>
 : c.diasRestantes < 0
 ? <span className="ml-1 text-destructive">({Math.abs(c.diasRestantes)}d vencida)</span>
 : <span className="ml-1 text-yellow-600"> (hoy)</span>}
 </span>
 <span className={cn("font-mono text-xs font-medium", agingColor(c.diasVencida))}> {c.estado === "PAGADO_PARCIAL" && (
 <span className="text-muted-foreground mr-1 font-normal text-[10px]">Saldo:</span> )}
 {fmt(c.saldo)}
 </span> </div> </div> ))}
 </GrupoColapsable> );
 })}
 </div> {/* Barra flotante de selección */}
 {seleccionadas.size > 0 && (
 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"> <div className="flex items-center gap-3 bg-background border shadow-xl rounded-2xl px-5 py-3"> <span className="text-sm font-medium"> {seleccionadas.size} compra{seleccionadas.size !== 1 ? "s" : ""} seleccionada{seleccionadas.size !== 1 ? "s" : ""}
 </span> <span className="text-sm font-bold tabular-nums" style={{ color: "var(--accent-hex)" }}> {fmt(comprasSeleccionadas.reduce((s, c) => s + c.saldo, 0))}
 </span> <button
 onClick={() => setShowModal(true)}
 className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors" > Planilla de pago
 </button> <button
 onClick={() => setSeleccionadas(new Set())}
 className="text-muted-foreground hover:text-foreground text-lg leading-none" > ×
 </button> </div> </div> )}

 {showModal && (
 <ModalPlanillaPago
 compras={comprasSeleccionadas}
 grupos={grupos}
 onClose={() => setShowModal(false)}
 onOk={handlePagoOk}
 /> )}
 </> );
}
