import { notFound } from "next/navigation";
import Link from "next/link";
import { getTurno } from "@/actions/caja";
import { VentasTurnoTable } from "@/components/caja/ventas-turno-table";

interface Props {
 params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
 const { id } = await params;
 const turno = await getTurno(id);
 return { title: turno ? `Cobros — Turno #${turno.numero}` : "Cobros" };
}

export default async function CobrosPage({ params }: Props) {
 const { id } = await params;
 const turno = await getTurno(id);
 if (!turno) notFound();

 const ventas = turno.ventas.map(v => ({
 ...v,
 total: Number(v.total),
 pagosRecibidos: v.pagosRecibidos.map(p => ({ ...p, monto: Number(p.monto) })),
 conduces: v.conduces ?? [],
 }));

 const totalCobrado = ventas.reduce((s, v) => s + v.total, 0);
 const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

 return (
 <div className="max-w-4xl mx-auto px-4 py-6 space-y-5"> {/* Encabezado */}
 <div className="flex items-start justify-between gap-3 flex-wrap"> <div className="space-y-1"> <Link href="/caja" className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full transition-all hover:brightness-110" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)", color: "var(--accent-hex)", border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)" }}>← Volver a Caja</Link> <h1 className="text-xl font-bold">Cobros — Turno #{turno.numero}</h1> <p className="text-sm text-muted-foreground"> Cajero: {turno.usuario.nombre} {turno.usuario.apellido}
 </p> </div> {ventas.length > 0 && (
 <div className="text-right"> <p className="text-xs text-muted-foreground">Total cobrado</p> <p className="text-lg font-bold font-mono text-green-700 dark:text-green-400"> {fmt(totalCobrado)}
 </p> </div> )}
 </div> {/* Tabla */}
 <div className="rounded-xl border bg-card overflow-hidden"> <div className="px-4 py-3 border-b flex items-center gap-2"> <h2 className="font-semibold text-sm">Facturas cobradas en este turno</h2> {ventas.length > 0 && (
 <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full"> {ventas.length}
 </span> )}
 </div> {ventas.length === 0 ? (
 <div className="px-4 py-12 text-center text-muted-foreground"> <p className="text-2xl mb-2"></p> <p className="text-sm">Sin facturas cobradas en este turno</p> </div> ) : (
 <VentasTurnoTable ventas={ventas} /> )}
 </div> <p className="text-xs text-muted-foreground text-center"> Para generar un conduce de despacho, usa el botón " Generar conduce" en la fila correspondiente.
 El equipo de despacho lo verá en{" "}
 <a href="/ventas/despachos" target="_blank" className="text-primary hover:underline"> Ventas  Despachos PDV
 </a>.
 </p> </div> );
}
