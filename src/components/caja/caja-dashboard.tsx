"use client";

import { useState, useTransition, useRef, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
 procesarPagoCaja,
 eliminarFacturaPendiente,
 registrarGasto,
 registrarCompraEnCaja,
 registrarPrestamo,
 registrarCobroEnCaja,
 registrarCobrosMultiplesCxC,
 buscarCxCPorFactura,
} from "@/actions/caja";
import { NotaCreditoModal } from "@/components/caja/nota-credito-modal";
import { cn } from "@/lib/utils";

// Tipos 

interface DetalleFactura {
 id: string;
 descripcion: string | null;
 unidad: string | null;
 cantidad: number;
 precioFinal: number;
 subtotal: number;
 itbis: number;
}

interface FacturaPendiente {
 id: string;
 numero: string;
 total: number;
 subtotal: number;
 itbis: number;
 notas: string | null;
 createdAt: Date | string;
 cliente: { id: string; nombre: string; rnc: string | null; tipoComprobante: string };
 creador: { nombre: string; apellido: string };
 detalles: DetalleFactura[];
}

interface Empleado {
 id: string; nombre: string; apellido: string; cargo: string;
}

interface Props {
 turnoId: string;
 facturas: FacturaPendiente[];
 empleados: Empleado[];
}

// Helpers 

function fmt(n: number) {
 return `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtTime(d: Date | string) {
 return new Date(d).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
}

type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CHEQUE" | "CREDITO";

const METODOS: { id: MetodoPago; label: string; icon: string }[] = [
 { id: "EFECTIVO", label: "Efectivo", icon: "" },
 { id: "TARJETA", label: "Tarjeta", icon: "" },
 { id: "TRANSFERENCIA", label: "Transferencia", icon: "" },
 { id: "CHEQUE", label: "Cheque", icon: "" },
 { id: "CREDITO", label: "A crédito", icon: "" },
];

const BILLETES = [100, 200, 500, 1000, 2000];

// 
// MODAL — Pago de factura
// 

function PagoModal({ factura, turnoId, onClose, onOk }: {
 factura: FacturaPendiente;
 turnoId: string;
 onClose: () => void;
 onOk: () => void;
}) {
 const [isPending, startTransition] = useTransition();
 const [error, setError] = useState<string | null>(null);

 // Arranca VACÍO — la cajera ingresa lo que recibe, no lo que cuesta
 const [lineasPago, setLineasPago] = useState<{ metodo: MetodoPago; monto: string; ref: string }[]>([
 { metodo: "EFECTIVO", monto: "", ref: "" },
 ]);

 // Cálculos en vivo 
 const totalIngresado = lineasPago.reduce((s, l) => s + (parseFloat(l.monto) || 0), 0);

 // Pagos que no son efectivo (los que se restan primero al total)
 const otrosIngresados = lineasPago
 .filter(l => l.metodo !== "EFECTIVO")
 .reduce((s, l) => s + (parseFloat(l.monto) || 0), 0);

 // Cuánto efectivo se necesita (lo que no cubre el resto de métodos)
 const efectivoNecesario = Math.max(0, factura.total - otrosIngresados);
 const efectivoIngresado = lineasPago
 .filter(l => l.metodo === "EFECTIVO")
 .reduce((s, l) => s + (parseFloat(l.monto) || 0), 0);

 // Cambio: solo cuando el efectivo supera lo que se necesita
 const cambio = Math.max(0, efectivoIngresado - efectivoNecesario);

 // Pendiente: cuánto falta para completar el pago (considerando el cambio)
 const pendiente = Math.max(0, factura.total - (totalIngresado - cambio));

 const listo = pendiente < 0.01; // pagado exacto o con vuelto en efectivo

 // Handlers 
 const agregarLinea = () => setLineasPago(prev => [...prev, { metodo: "TARJETA", monto: "", ref: "" }]);

 const quitarLinea = (i: number) => {
 if (lineasPago.length === 1) return;
 setLineasPago(prev => prev.filter((_, idx) => idx !== i));
 };

 const updateLinea = (i: number, campo: "metodo" | "monto" | "ref", val: string) => setLineasPago(prev => prev.map((l, idx) => idx === i ? { ...l, [campo]: val } : l));

 // Billetes rápidos: aparecen cuando hay UNA línea efectivo y falta por cobrar
 const hayLineaEfectivo = lineasPago.length === 1 && lineasPago[0].metodo === "EFECTIVO";
 const billetesRelevantes = BILLETES.filter(b => b >= factura.total).slice(0, 5);

 const handlePagar = () => {
 setError(null);
 const pagos = lineasPago
 .filter(l => parseFloat(l.monto) > 0)
 .map(l => ({
 metodo: l.metodo,
 // Cuando hay cambio, el monto efectivo que se registra es el necesario (sin el vuelto)
 monto: l.metodo === "EFECTIVO" ? parseFloat(l.monto) - cambio
 : parseFloat(l.monto),
 referencia: l.ref || undefined,
 }))
 .filter(p => p.monto > 0.001);

 if (!pagos.length) { setError("Ingresa al menos un monto"); return; }
 if (!listo && !lineasPago.some(l => l.metodo === "CREDITO")) {
 setError(`Falta RD$ ${pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })} por cobrar`);
 return;
 }

 startTransition(async () => {
 const res = await procesarPagoCaja(factura.id, pagos, turnoId);
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}> <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"> {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-background z-10"> <div> <h2 className="text-base font-bold"> Procesar pago</h2> <p className="text-xs text-muted-foreground mt-0.5">{factura.numero} · {factura.cliente.nombre}</p> </div> <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl"></button> </div> <div className="p-5 space-y-4"> {/* Resumen de ítems */}
 <div className="rounded-xl bg-muted/40 border p-3 space-y-1"> {factura.detalles.map(d => (
 <div key={d.id} className="flex justify-between text-xs"> <span className="text-muted-foreground"> {d.cantidad}x {d.descripcion ?? "—"} <span className="text-muted-foreground/60">({d.unidad})</span> </span> <span className="font-mono font-medium">{fmt(Number(d.subtotal) + Number(d.itbis))}</span> </div> ))}
 <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5"> <span>TOTAL A COBRAR</span> <span className="font-mono text-primary text-base">{fmt(factura.total)}</span> </div> </div> {/* Contador de pendiente — la pieza clave */}
 {totalIngresado > 0 && (
 <div className={cn(
 "rounded-xl border px-4 py-3 flex items-center justify-between transition-all",
 listo && cambio < 0.01
 ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800" : listo && cambio > 0
 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" : "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800" )}> {!listo ? (
 <> <div> <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Falta cobrar</p> <p className="text-2xl font-bold font-mono text-red-700 dark:text-red-400">{fmt(pendiente)}</p> </div> <span className="text-3xl"></span> </> ) : cambio > 0.01 ? (
 <> <div> <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Cambio a devolver</p> <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">{fmt(cambio)}</p> </div> <span className="text-3xl"></span> </> ) : (
 <> <div> <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Monto exacto</p> <p className="text-lg font-bold text-green-700 dark:text-green-400"> Listo para cobrar</p> </div> <span className="text-3xl"></span> </> )}
 </div> )}

 {/* Líneas de pago */}
 <div className="space-y-2"> <div className="flex items-center justify-between"> <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Forma de pago</p> <button onClick={agregarLinea} className="text-xs text-primary hover:underline font-medium"> + Dividir pago
 </button> </div> {lineasPago.map((l, i) => (
 <div key={i} className="flex gap-2 items-center"> <select
 value={l.metodo}
 onChange={e => updateLinea(i, "metodo", e.target.value)}
 className="h-10 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shrink-0" > {METODOS.map(m => (
 <option key={m.id} value={m.id}>{m.icon} {m.label}</option> ))}
 </select> <input
 type="number" min="0" step="0.01" value={l.monto}
 onChange={e => updateLinea(i, "monto", e.target.value)}
 placeholder="Monto recibido…" autoFocus={i === 0}
 className="flex-1 h-10 rounded-lg border bg-background px-3 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50" /> {l.metodo !== "EFECTIVO" && l.metodo !== "CREDITO" && (
 <input
 type="text" value={l.ref}
 onChange={e => updateLinea(i, "ref", e.target.value)}
 placeholder="Ref." className="w-24 h-10 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" /> )}
 {lineasPago.length > 1 && (
 <button onClick={() => quitarLinea(i)}
 className="h-10 w-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center text-sm shrink-0"> </button> )}
 </div> ))}

 {/* Billetes rápidos — solo efectivo, botones con montos de billetes */}
 {hayLineaEfectivo && (
 <div className="flex gap-1.5 flex-wrap pt-0.5"> <span className="text-xs text-muted-foreground self-center">Billetes:</span> {billetesRelevantes.map(b => (
 <button key={b} onClick={() => updateLinea(0, "monto", String(b))}
 className={cn(
 "text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors",
 parseFloat(lineasPago[0].monto) === b
 ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent" )}> {b.toLocaleString("es-DO")}
 </button> ))}
 <button onClick={() => updateLinea(0, "monto", factura.total.toFixed(2))}
 className={cn(
 "text-xs px-3 py-1.5 rounded-lg border transition-colors",
 parseFloat(lineasPago[0].monto) === factura.total
 ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent bg-muted" )}> Exacto
 </button> </div> )}
 </div> {/* Resumen compacto de totales */}
 <div className="rounded-xl border p-3 space-y-1 text-sm bg-muted/20"> <div className="flex justify-between text-muted-foreground"> <span>Total factura</span> <span className="font-mono font-bold text-foreground">{fmt(factura.total)}</span> </div> {totalIngresado > 0 && (
 <div className="flex justify-between text-muted-foreground"> <span>Total ingresado</span> <span className="font-mono">{fmt(totalIngresado)}</span> </div> )}
 </div> {error && (
 <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"> {error}
 </div> )}

 {/* Acciones */}
 <div className="flex gap-3 pt-1"> <button onClick={onClose}
 className="flex-1 h-11 rounded-xl border text-sm font-medium hover:bg-accent transition-colors"> Cancelar
 </button> <button onClick={handlePagar} disabled={isPending}
 className={cn("flex-1 h-11 rounded-xl text-sm font-bold transition-colors",
 !isPending
 ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20" : "bg-muted text-muted-foreground cursor-not-allowed" )}> {isPending ? "Procesando…" : ` Cobrar ${fmt(factura.total)}`}
 </button> </div> </div> </div> </div> );
}

// 
// MODAL — Gasto
// 

function GastoModal({ turnoId, onClose, onOk }: { turnoId: string; onClose: () => void; onOk: () => void }) {
 const [isPending, startTransition] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [concepto, setConcepto] = useState("");
 const [monto, setMonto] = useState("");

 const handleSubmit = (e: FormEvent) => {
 e.preventDefault();
 if (!concepto.trim() || !parseFloat(monto)) { setError("Completa todos los campos"); return; }
 setError(null);
 startTransition(async () => {
 const res = await registrarGasto({ turnoId, concepto, monto: parseFloat(monto) });
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <ModalWrapper title=" Registrar gasto" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <Field label="Concepto del gasto"> <input type="text" required value={concepto} onChange={e => setConcepto(e.target.value)}
 placeholder="Descripción del gasto..." autoFocus
 className={INPUT_CLS} /> </Field> <Field label="Monto (RD$)"> <input type="number" required min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
 placeholder="0.00" className={INPUT_CLS + " font-mono text-right"} /> </Field> {error && <ErrorMsg>{error}</ErrorMsg>}
 <ModalActions onClose={onClose} label="Registrar gasto" isPending={isPending} /> </form> </ModalWrapper> );
}

// 
// MODAL — Compra de mercancía
// 

function CompraModal({ turnoId, onClose, onOk }: { turnoId: string; onClose: () => void; onOk: () => void }) {
 const [isPending, startTransition] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [concepto, setConcepto] = useState("");
 const [monto, setMonto] = useState("");
 const [notas, setNotas] = useState("");

 const handleSubmit = (e: FormEvent) => {
 e.preventDefault();
 if (!concepto.trim() || !parseFloat(monto)) { setError("Completa todos los campos"); return; }
 setError(null);
 startTransition(async () => {
 const res = await registrarCompraEnCaja({ turnoId, concepto, monto: parseFloat(monto), notas: notas || undefined });
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <ModalWrapper title=" Compra de mercancía" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <Field label="Suplidor / Descripción"> <input type="text" required value={concepto} onChange={e => setConcepto(e.target.value)}
 placeholder="Nombre del suplidor o descripción..." autoFocus
 className={INPUT_CLS} /> </Field> <Field label="Monto pagado (RD$)"> <input type="number" required min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
 placeholder="0.00" className={INPUT_CLS + " font-mono text-right"} /> </Field> <Field label="Notas (opcional)"> <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
 placeholder="Factura, referencia..." className={INPUT_CLS} /> </Field> {error && <ErrorMsg>{error}</ErrorMsg>}
 <ModalActions onClose={onClose} label="Registrar compra" isPending={isPending} /> </form> </ModalWrapper> );
}

// 
// MODAL — Préstamo a empleado
// 

function PrestamoModal({ turnoId, empleados, onClose, onOk }: {
 turnoId: string; empleados: Empleado[]; onClose: () => void; onOk: () => void;
}) {
 const [isPending, startTransition] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? "");
 const [monto, setMonto] = useState("");
 const [notas, setNotas] = useState("");

 const handleSubmit = (e: FormEvent) => {
 e.preventDefault();
 if (!empleadoId || !parseFloat(monto)) { setError("Selecciona un empleado e ingresa el monto"); return; }
 setError(null);
 startTransition(async () => {
 const res = await registrarPrestamo({ turnoId, empleadoId, monto: parseFloat(monto), notas: notas || undefined });
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <ModalWrapper title=" Préstamo a empleado" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> {empleados.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-4">No hay empleados activos registrados</p> ) : (
 <> <Field label="Empleado"> <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)} className={INPUT_CLS}> {empleados.map(emp => (
 <option key={emp.id} value={emp.id}> {emp.nombre} {emp.apellido} — {emp.cargo}
 </option> ))}
 </select> </Field> <Field label="Monto del préstamo (RD$)"> <input type="number" required min="0.01" step="0.01" value={monto}
 onChange={e => setMonto(e.target.value)}
 placeholder="0.00" className={INPUT_CLS + " font-mono text-right"} /> </Field> <Field label="Notas (opcional)"> <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
 placeholder="Motivo del préstamo..." className={INPUT_CLS} /> </Field> <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">  Este préstamo se sumará automáticamente en los descuentos de la nómina del empleado.
 </p> {error && <ErrorMsg>{error}</ErrorMsg>}
 <ModalActions onClose={onClose} label="Registrar préstamo" isPending={isPending} /> </> )}
 </form> </ModalWrapper> );
}

// 
// MODAL — Cobro CxC en efectivo
// 

interface CxCResultado {
 id: string;
 monto: number;
 saldo: number;
 fechaVencimiento: Date | string;
 estado: string;
 venta: { numero: string };
 cliente: { nombre: string; rnc: string | null };
}

const METODOS_COBRO_CXC = [
 { value: "EFECTIVO" as const, label: " Efectivo" },
 { value: "TARJETA" as const, label: " Tarjeta" },
 { value: "TRANSFERENCIA" as const, label: " Transferencia" },
 { value: "CHEQUE" as const, label: " Cheque" },
];

// Línea de CxC agregada al cobro 
interface LineaCobro {
 cxcId: string;
 monto: string; // string para input controlado
 cxc: CxCResultado;
}

function CobroCxCModal({ turnoId, onClose, onOk }: {
 turnoId: string; onClose: () => void; onOk: () => void;
}) {
 const [isPending, startTransition] = useTransition();
 const [error, setError] = useState<string | null>(null);

 // Búsqueda
 const [query, setQuery] = useState("");
 const [resultados, setResultados] = useState<CxCResultado[]>([]);
 const [buscando, setBuscando] = useState(false);
 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 // Lista de facturas agregadas al cobro
 const [lineas, setLineas] = useState<LineaCobro[]>([]);

 // Método y notas (aplican a todo el cobro)
 const [metodo, setMetodo] = useState<"EFECTIVO"|"TARJETA"|"TRANSFERENCIA"|"CHEQUE">("EFECTIVO");
 const [notas, setNotas] = useState("");

 const idsEnLista = new Set(lineas.map(l => l.cxcId));

 const totalCobro = lineas.reduce((s, l) => s + (parseFloat(l.monto) || 0), 0);

 const fmtMoney = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

 const fmtFecha = (d: Date | string) => new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

 // Debounce búsqueda
 const handleQuery = (val: string) => {
 setQuery(val);
 if (timerRef.current) clearTimeout(timerRef.current);
 if (!val.trim()) { setResultados([]); return; }
 setBuscando(true);
 timerRef.current = setTimeout(async () => {
 const r = await buscarCxCPorFactura(val);
 setResultados(r
 .filter(c => !idsEnLista.has(c.id)) // ocultar las ya agregadas
 .map(c => ({ ...c, monto: Number(c.monto), saldo: Number(c.saldo) }))
 );
 setBuscando(false);
 }, 250);
 };

 // Agregar una factura a la lista
 const agregarCxC = (c: CxCResultado) => {
 if (idsEnLista.has(c.id)) return;
 setLineas(prev => [...prev, { cxcId: c.id, monto: c.saldo.toFixed(2), cxc: c }]);
 setResultados([]);
 setQuery("");
 setError(null);
 };

 // Quitar una factura de la lista
 const quitarLinea = (cxcId: string) => setLineas(prev => prev.filter(l => l.cxcId !== cxcId));

 // Actualizar monto de una línea
 const setMontoLinea = (cxcId: string, val: string) => setLineas(prev => prev.map(l => l.cxcId === cxcId ? { ...l, monto: val } : l));

 const handleSubmit = (e: FormEvent) => {
 e.preventDefault();
 if (!lineas.length) { setError("Agrega al menos una factura al cobro"); return; }

 for (const l of lineas) {
 const m = parseFloat(l.monto);
 if (!m || m <= 0) { setError(`Ingresa un monto válido para ${l.cxc.venta.numero}`); return; }
 if (m > l.cxc.saldo) {
 setError(`El monto de ${l.cxc.venta.numero} supera el saldo (${fmtMoney(l.cxc.saldo)})`);
 return;
 }
 }

 setError(null);
 startTransition(async () => {
 const res = await registrarCobrosMultiplesCxC({
 turnoId,
 lineas: lineas.map(l => ({ cxcId: l.cxcId, monto: parseFloat(l.monto) })),
 metodo,
 notas: notas || undefined,
 });
 if ("error" in res && res.error) { setError(res.error); return; }
 onOk();
 });
 };

 return (
 <ModalWrapper title=" Cobro de cuentas por cobrar" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> {/* Buscador */}
 <Field label="Agregar factura (busca por número o nombre de cliente)"> <div className="relative"> <input
 type="text" autoFocus
 value={query}
 onChange={e => handleQuery(e.target.value)}
 placeholder="Ej: FAC-00023 ó nombre del cliente…" className={INPUT_CLS}
 /> {buscando && (
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse"> buscando…
 </span> )}

 {/* Dropdown de resultados */}
 {resultados.length > 0 && (
 <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto"> {resultados.map(c => (
 <button
 key={c.id}
 type="button" onClick={() => agregarCxC(c)}
 className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0" > <div className="flex items-center justify-between gap-3"> <div> <p className="text-sm font-bold font-mono text-primary">{c.venta.numero}</p> <p className="text-xs font-medium">{c.cliente.nombre}</p> {c.cliente.rnc && <p className="text-xs text-muted-foreground">{c.cliente.rnc}</p>}
 </div> <div className="text-right shrink-0"> <p className="text-sm font-bold font-mono text-destructive">{fmtMoney(c.saldo)}</p> <p className="text-[10px] text-muted-foreground">Vence: {fmtFecha(c.fechaVencimiento)}</p> </div> </div> </button> ))}
 </div> )}
 {!buscando && query.trim() && resultados.length === 0 && (
 <p className="text-xs text-muted-foreground mt-1.5">No se encontraron facturas pendientes.</p> )}
 </div> </Field> {/* Lista de facturas agregadas */}
 {lineas.length > 0 && (
 <div className="rounded-xl border overflow-hidden"> {/* Encabezado */}
 <div className="px-3 py-2 bg-muted/40 border-b flex items-center justify-between"> <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"> Facturas a cobrar ({lineas.length})
 </span> <span className="text-xs font-mono font-bold text-primary">{fmtMoney(totalCobro)}</span> </div> {/* Filas */}
 {lineas.map(l => (
 <div key={l.cxcId} className="px-3 py-2.5 border-b last:border-0 flex items-center gap-3"> <div className="flex-1 min-w-0"> <p className="text-sm font-mono font-bold text-primary truncate">{l.cxc.venta.numero}</p> <p className="text-xs text-muted-foreground truncate">{l.cxc.cliente.nombre}</p> <p className="text-[10px] text-muted-foreground">Saldo: {fmtMoney(l.cxc.saldo)}</p> </div> {/* Monto editable */}
 <input
 type="number" min="0.01" step="0.01" max={l.cxc.saldo}
 value={l.monto}
 onChange={e => setMontoLinea(l.cxcId, e.target.value)}
 className="w-28 h-8 rounded-lg border bg-background px-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/40" /> <button
 type="button" onClick={() => quitarLinea(l.cxcId)}
 className="text-xs text-destructive hover:text-destructive/70 transition-colors px-1" title="Quitar" > </button> </div> ))}

 {/* Total */}
 <div className="px-3 py-2.5 bg-primary/5 border-t flex justify-between items-center"> <span className="text-sm font-bold">Total a cobrar</span> <span className="text-base font-mono font-bold text-primary">{fmtMoney(totalCobro)}</span> </div> </div> )}

 {/* Forma de pago (solo si hay facturas) */}
 {lineas.length > 0 && (
 <Field label="Forma de pago"> <div className="grid grid-cols-2 gap-2"> {METODOS_COBRO_CXC.map(m => (
 <button
 key={m.value}
 type="button" onClick={() => setMetodo(m.value)}
 className={cn(
 "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
 metodo === m.value
 ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground hover:text-foreground" )}
 > {m.label}
 </button> ))}
 </div> </Field> )}

 {/* Notas */}
 {lineas.length > 0 && (
 <Field label="Notas (opcional)"> <input
 type="text" value={notas}
 onChange={e => setNotas(e.target.value)}
 placeholder="Referencia, No. cheque, banco…" className={INPUT_CLS}
 /> </Field> )}

 {error && <ErrorMsg>{error}</ErrorMsg>}
 <ModalActions
 onClose={onClose}
 label={lineas.length > 1 ? `Registrar ${lineas.length} cobros (${fmtMoney(totalCobro)})` : "Registrar cobro"}
 isPending={isPending}
 /> </form> </ModalWrapper> );
}

// 
// DASHBOARD PRINCIPAL
// 

type ModalType = "pago" | "gasto" | "compra" | "prestamo" | "cobro_cxc" | "nota_credito" | null;

export function CajaDashboard({ turnoId, facturas: initialFacturas, empleados }: Props) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 const [facturas, setFacturas] = useState(initialFacturas);
 const [modal, setModal] = useState<ModalType>(null);
 const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaPendiente | null>(null);

 const abrirPago = (f: FacturaPendiente) => {
 setFacturaSeleccionada(f);
 setModal("pago");
 };

 const handleEliminar = (id: string) => {
 startTransition(async () => {
 const res = await eliminarFacturaPendiente(id);
 if ("ok" in res && res.ok) {
 setFacturas(prev => prev.filter(f => f.id !== id));
 }
 });
 };

 const handlePagoOk = () => {
 setFacturas(prev => prev.filter(f => f.id !== facturaSeleccionada?.id));
 setModal(null);
 setFacturaSeleccionada(null);
 router.refresh();
 };

 const handleAccionOk = () => {
 setModal(null);
 router.refresh();
 };

 return (
 <div className="space-y-6"> {/* Botones de acción */}
 <div> <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Movimientos de caja</h3> <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> <AccionBtn icon="" label="Gasto" desc="Efectivo pagado" color="red" onClick={() => setModal("gasto")} /> <AccionBtn icon="" label="Compras" desc="Mercancía en efectivo" color="orange" onClick={() => setModal("compra")} /> <AccionBtn icon="" label="Préstamo" desc="A empleado" color="blue" onClick={() => setModal("prestamo")} /> <AccionBtn icon="" label="Cobro CxC" desc="Pago de cliente" color="green" onClick={() => setModal("cobro_cxc")} /> </div> </div> {/* Facturas pendientes del PDV */}
 <div className="rounded-xl border bg-card overflow-hidden"> <div className="px-5 py-3 border-b flex items-center justify-between"> <div className="flex items-center gap-2"> <h2 className="font-bold text-base"> Facturas pendientes de cobro</h2> {facturas.length > 0 && (
 <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full"> {facturas.length}
 </span> )}
 </div> </div> {facturas.length === 0 ? (
 <div className="px-5 py-10 text-center text-muted-foreground"> <p className="text-3xl mb-2"></p> <p className="text-sm font-medium">Sin facturas pendientes</p> <p className="text-xs mt-1">El PDV enviará las facturas aquí cuando las creen</p> </div> ) : (
 <div className="divide-y"> {facturas.map(f => (
 <div key={f.id} className="px-5 py-4 flex items-start gap-4 hover:bg-muted/20 transition-colors"> <div className="flex-1 min-w-0"> <div className="flex items-center gap-2 flex-wrap"> <span className="font-mono text-sm font-bold text-primary">{f.numero}</span> <span className="text-xs text-muted-foreground"> {fmtTime(f.createdAt)} · {f.creador.nombre}
 </span> </div> <p className="text-sm font-semibold mt-0.5">{f.cliente.nombre}</p> {f.cliente.rnc && <p className="text-xs text-muted-foreground">{f.cliente.rnc}</p>}
 <p className="text-xs text-muted-foreground mt-1"> {f.detalles.length} producto{f.detalles.length !== 1 ? "s" : ""}
 {f.notas && <span> · {f.notas}</span>}
 </p> </div> <div className="text-right shrink-0 space-y-1.5"> <p className="text-lg font-bold font-mono">{fmt(f.total)}</p> <div className="flex gap-2 justify-end"> <button
 onClick={() => handleEliminar(f.id)}
 disabled={isPending}
 className="text-xs px-2.5 py-1.5 rounded-lg border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors disabled:opacity-40" > Cancelar
 </button> <button
 onClick={() => abrirPago(f)}
 className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-sm" > Cobrar
 </button> </div> </div> </div> ))}
 </div> )}
 </div> {/* Nota de crédito — debajo del recuadro de facturas pendientes */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> <AccionBtn icon="" label="Nota de Crédito" desc="Crédito a cliente" color="purple" onClick={() => setModal("nota_credito")} /> </div> {/* Modales */}
 {modal === "pago" && facturaSeleccionada && (
 <PagoModal
 factura={facturaSeleccionada}
 turnoId={turnoId}
 onClose={() => { setModal(null); setFacturaSeleccionada(null); }}
 onOk={handlePagoOk}
 /> )}
 {modal === "gasto" && <GastoModal turnoId={turnoId} onClose={() => setModal(null)} onOk={handleAccionOk} />}
 {modal === "compra" && <CompraModal turnoId={turnoId} onClose={() => setModal(null)} onOk={handleAccionOk} />}
 {modal === "prestamo" && <PrestamoModal turnoId={turnoId} empleados={empleados} onClose={() => setModal(null)} onOk={handleAccionOk} />}
 {modal === "cobro_cxc" && <CobroCxCModal turnoId={turnoId} onClose={() => setModal(null)} onOk={handleAccionOk} />}
 {modal === "nota_credito" && (
 <NotaCreditoModal
 turnoId={turnoId}
 onClose={() => setModal(null)}
 onOk={(numero) => {
 setModal(null);
 alert(` Nota de crédito ${numero} generada. El saldo a favor fue acreditado al cliente.`);
 }}
 /> )}
 </div> );
}

// Componentes auxiliares UI 

function AccionBtn({ icon, label, desc, color, onClick }: {
 icon: string; label: string; desc: string;
 color: "red" | "orange" | "blue" | "green" | "purple"; onClick: () => void;
}) {
 const MAP = {
 red: "border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
 orange: "border-orange-200 dark:border-orange-800 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30",
 blue: "border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30",
 green: "border-green-200 dark:border-green-800 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30",
 purple: "border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30",
 };
 return (
 <button onClick={onClick}
 className={cn("rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm", MAP[color])}> <p className="text-2xl mb-1">{icon}</p> <p className="text-sm font-bold">{label}</p> <p className="text-xs text-muted-foreground">{desc}</p> </button> );
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}> <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-md p-5 space-y-4"> <div className="flex items-center justify-between"> <h2 className="text-base font-bold">{title}</h2> <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl"></button> </div> {children}
 </div> </div> );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
 return (
 <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{label}</label> {children}
 </div> );
}

function ErrorMsg({ children }: { children: ReactNode }) {
 return (
 <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"> {children}
 </div> );
}

function ModalActions({ onClose, label, isPending }: { onClose: () => void; label: string; isPending: boolean }) {
 return (
 <div className="flex gap-3 pt-1"> <button type="button" onClick={onClose}
 className="flex-1 h-10 rounded-xl border text-sm font-medium hover:bg-accent transition-colors"> Cancelar
 </button> <button type="submit" disabled={isPending}
 className={cn("flex-1 h-10 rounded-xl text-sm font-bold transition-colors",
 !isPending
 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed" )}> {isPending ? "Guardando…" : label}
 </button> </div> );
}

const INPUT_CLS = "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
