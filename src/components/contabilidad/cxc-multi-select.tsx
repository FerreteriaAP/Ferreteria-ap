"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { GrupoColapsable } from "./grupo-colapsable";
import { pagarMultiplesCxC, type PagoMasivoCxCItem } from "@/actions/contabilidad";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Tipos 

interface Factura {
 id: string; // cxcId
 ventaId: string;
 numero: string;
 monto: number;
 saldo: number;
 fechaVencimiento: Date;
 fechaEmision: Date | null;
 ncf: string | null;
 estado: string;
 diasVencida: number;
 diasRestantes: number;
}

interface Grupo {
 cliente: { id: string; nombre: string; rnc: string | null };
 totalSaldo: number;
 totalVencido: number;
 facturas: Factura[];
}

interface Props {
 grupos: Grupo[];
}

// Helpers visuales 

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
 facturas: Factura[];
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

function ModalPlanillaPago({ facturas, grupos, onClose, onOk }: ModalProps) {
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [metodo, setMetodo] = useState("EFECTIVO");
 const [referencia, setRef] = useState("");
 const [notas, setNotas] = useState("");
 const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

 const total = facturas.reduce((s, f) => s + f.saldo, 0);

 // Obtener nombre de cliente para cada factura
 const getCliente = (ventaId: string) => {
 for (const g of grupos) {
 if (g.facturas.some(f => f.ventaId === ventaId)) return g.cliente.nombre;
 }
 return "—";
 };

 const handleSubmit = () => {
 if (!metodo) { setError("Selecciona la forma de pago"); return; }
 setError(null);
 const pagos: PagoMasivoCxCItem[] = facturas.map(f => ({
 cxcId: f.id,
 ventaId: f.ventaId,
 monto: f.saldo,
 }));
 start(async () => {
 const res = await pagarMultiplesCxC(pagos, metodo, fecha, referencia || undefined, notas || undefined);
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"> <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"> {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b"> <h2 className="font-bold text-base"> Planilla de pago CxC</h2> <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button> </div> <div className="px-5 py-4 space-y-4"> {/* Lista de facturas a pagar */}
 <div className="border rounded-lg overflow-hidden"> <table className="w-full text-sm"> <thead> <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide"> <th className="px-3 py-2 text-left">Factura</th> <th className="px-3 py-2 text-left">Cliente</th> <th className="px-3 py-2 text-right">Monto</th> </tr> </thead> <tbody> {facturas.map((f, i) => (
 <tr key={f.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}> <td className="px-3 py-2 font-mono text-xs font-medium" style={{ color: "var(--accent-hex)" }}>{f.numero}</td> <td className="px-3 py-2 text-xs">{getCliente(f.ventaId)}</td> <td className="px-3 py-2 text-right tabular-nums font-medium text-sm">{fmt(f.saldo)}</td> </tr> ))}
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
 "px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
 "hover:bg-primary/90 transition-colors",
 isPending && "opacity-50 cursor-not-allowed" )}
 > {isPending ? "Registrando…" : " Registrar pagos"}
 </button> </div> </div> </div> </div> );
}

// Componente principal 

export function CxCMultiSelect({ grupos }: Props) {
 const router = useRouter();
 const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
 const [showModal, setShowModal] = useState(false);

 const toggle = (id: string) => setSeleccionadas(prev => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });

 const toggleGrupo = (facturas: Factura[]) => {
 const pendientes = facturas.filter(f => f.estado !== "PAGADO");
 const ids = pendientes.map(f => f.id);
 const todasSeleccionadas = ids.every(id => seleccionadas.has(id));
 setSeleccionadas(prev => {
 const next = new Set(prev);
 if (todasSeleccionadas) { ids.forEach(id => next.delete(id)); }
 else { ids.forEach(id => next.add(id)); }
 return next;
 });
 };

 const facturasSeleccionadas = grupos
 .flatMap(g => g.facturas)
 .filter(f => seleccionadas.has(f.id));

 const handlePagoOk = () => {
 setShowModal(false);
 setSeleccionadas(new Set());
 router.refresh();
 };

 return (
 <>
 {/* Barra de selección — sticky arriba */}
 {seleccionadas.size > 0 && (
 <div className="sticky top-2 z-40 mb-3">
 <div className="flex items-center gap-2 bg-background border shadow-md rounded-lg px-3 py-1.5 max-w-sm">
 <span className="text-xs font-medium text-muted-foreground shrink-0">
 {seleccionadas.size} sel.
 </span>
 <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "var(--accent-hex)" }}>
 {fmt(facturasSeleccionadas.reduce((s, f) => s + f.saldo, 0))}
 </span>
 <button onClick={() => setShowModal(true)}
 className="ml-auto px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0">
 Planilla
 </button>
 <button onClick={() => setSeleccionadas(new Set())}
 className="text-muted-foreground hover:text-foreground text-base leading-none shrink-0">×</button>
 </div>
 </div>
 )}
 <div className="space-y-3"> {grupos.map((g) => {
 const pendientes = g.facturas.filter(f => f.estado !== "PAGADO");
 const idsPendientes = pendientes.map(f => f.id);
 const todasSel = idsPendientes.length > 0 && idsPendientes.every(id => seleccionadas.has(id));
 const algunaSel = idsPendientes.some(id => seleccionadas.has(id));

 return (
 <GrupoColapsable
 key={g.cliente.id}
 nombre={g.cliente.nombre}
 rnc={g.cliente.rnc}
 count={g.facturas.length}
 totalSaldo={g.totalSaldo}
 totalVencido={g.totalVencido}
 etiqueta="factura" defaultOpen={false}
 accion={
 <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}> {pendientes.length > 0 && (
 <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground"> <input
 type="checkbox" checked={todasSel}
 ref={el => { if (el) el.indeterminate = algunaSel && !todasSel; }}
 onChange={() => toggleGrupo(g.facturas)}
 className="w-3.5 h-3.5 cursor-pointer" /> <span className="hidden sm:inline">Seleccionar</span> </label> )}
 <Link
 href={`/contabilidad/cxc/estado/${g.cliente.id}`}
 className={cn(
 buttonVariants({ variant: "ghost", size: "sm" }),
 "h-7 gap-1 text-xs text-muted-foreground hover:text-foreground px-2" )}
 title="Ver estado de cuenta" > <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Estado</span> </Link> </div> }
 > {g.facturas.map((f) => (
 <div key={f.id} className={cn(
 "px-3 py-2 flex items-center gap-2 border-b last:border-0 overflow-hidden",
 seleccionadas.has(f.id) && "bg-orange-500/5"
 )}>
 {/* Checkbox */}
 {f.estado !== "PAGADO"
 ? <input type="checkbox" checked={seleccionadas.has(f.id)} onChange={() => toggle(f.id)} className="w-4 h-4 cursor-pointer shrink-0" />
 : <div className="w-4 shrink-0" />}
 {/* Número factura */}
 <Link href={`/ventas/${f.ventaId}?from=cxc`}
 className="font-mono text-sm font-semibold hover:underline shrink-0 w-[90px]"
 style={{ color: "var(--accent-hex)" }}>
 {f.numero}
 </Link>
 {/* Fecha */}
 <span className="text-xs text-muted-foreground shrink-0 w-[62px] hidden sm:block">
 {f.fechaEmision ? new Date(f.fechaEmision).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
 </span>
 {/* NCF */}
 <span className="font-mono text-xs text-muted-foreground shrink-0 w-[110px] truncate hidden md:block">
 {f.ncf ?? "—"}
 </span>
 {/* Días vencer */}
 <span className={cn(
 "text-xs shrink-0 w-[70px] hidden sm:block",
 f.diasRestantes < 0 ? "text-destructive font-semibold" : "text-muted-foreground"
 )}>
 {f.diasRestantes < 0 ? `${Math.abs(f.diasRestantes)}d venc.`
 : f.diasRestantes === 0 ? "hoy"
 : `${f.diasRestantes}d`}
 </span>
 {/* Estado badge */}
 <Badge variant={agingVariant(f.diasVencida)} className="text-xs shrink-0">{agingLabel(f.diasVencida)}</Badge>
 {/* Saldo */}
 <p className={cn("font-mono text-sm font-semibold ml-auto shrink-0", agingColor(f.diasVencida))}>{fmt(f.saldo)}</p>
 </div>
 ))}
 </GrupoColapsable> );
 })}
 </div>

 {/* Modal planilla */}
 {showModal && (
 <ModalPlanillaPago
 facturas={facturasSeleccionadas}
 grupos={grupos}
 onClose={() => setShowModal(false)}
 onOk={handlePagoOk}
 /> )}
 </> );
}
