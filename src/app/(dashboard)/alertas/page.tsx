import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function getAlertas() {
 const hoy = new Date();
 const en7dias = new Date(hoy);
 en7dias.setDate(en7dias.getDate() + 7);

 const [
 stockBajoItems,
 cxcVencidas,
 cxpVencidas,
 cxcPorVencer,
 cxpPorVencer,
 nominasBorrador,
 ocAprobadas,
 turnosAbiertos,
 ] = await Promise.all([
 // Productos bajo stock mínimo
 prisma.producto.findMany({
 where: { activo: true, stockMinimo: { gt: 0 }, stockActual: { lte: prisma.producto.fields.stockMinimo } },
 select: { id: true, codigo: true, nombre: true, stockActual: true, stockMinimo: true },
 orderBy: { nombre: "asc" },
 }).catch(() => // fallback con raw si la comparación de campos no está soportada
 prisma.$queryRaw<{ id: string; codigo: string; nombre: string; stockActual: number; stockMinimo: number }[]>` SELECT id, codigo, nombre, "stockActual", "stockMinimo" FROM productos
 WHERE activo = true AND "stockMinimo" > 0 AND "stockActual" <= "stockMinimo" ORDER BY nombre ASC
 LIMIT 50
 ` ),

 // CxC vencidas
 prisma.cuentaPorCobrar.findMany({
 where: { estado: { in: ["PENDIENTE","PAGADO_PARCIAL"] }, fechaVencimiento: { lt: hoy } },
 select: { id: true, venta: { select: { numero: true } }, cliente: { select: { nombre: true } }, saldo: true, fechaVencimiento: true },
 orderBy: { fechaVencimiento: "asc" },
 }),

 // CxP vencidas
 prisma.cuentaPorPagar.findMany({
 where: { estado: { in: ["PENDIENTE","PAGADO_PARCIAL"] }, fechaVencimiento: { lt: hoy } },
 select: { id: true, compra: { select: { numero: true } }, suplidor: { select: { nombre: true } }, saldo: true, fechaVencimiento: true },
 orderBy: { fechaVencimiento: "asc" },
 }).catch(() => [] as never[]),

 // CxC por vencer en 7 días
 prisma.cuentaPorCobrar.findMany({
 where: { estado: { in: ["PENDIENTE","PAGADO_PARCIAL"] }, fechaVencimiento: { gte: hoy, lte: en7dias } },
 select: { id: true, venta: { select: { numero: true } }, cliente: { select: { nombre: true } }, saldo: true, fechaVencimiento: true },
 orderBy: { fechaVencimiento: "asc" },
 }),

 // CxP por vencer en 7 días
 prisma.cuentaPorPagar.findMany({
 where: { estado: { in: ["PENDIENTE","PAGADO_PARCIAL"] }, fechaVencimiento: { gte: hoy, lte: en7dias } },
 select: { id: true, compra: { select: { numero: true } }, suplidor: { select: { nombre: true } }, saldo: true, fechaVencimiento: true },
 orderBy: { fechaVencimiento: "asc" },
 }).catch(() => [] as never[]),

 // Nóminas en borrador
 prisma.nomina.findMany({
 where: { estado: "BORRADOR" },
 select: { id: true, numero: true, mes: true, anio: true, periodo: true },
 orderBy: { createdAt: "desc" },
 }),

 // Órdenes de compra aprobadas sin convertir
 prisma.ordenCompra.findMany({
 where: { estado: "ENVIADA" },
 select: { id: true, numero: true, suplidor: { select: { nombre: true } }, fechaEmision: true, total: true },
 orderBy: { fechaEmision: "asc" },
 }).catch(() => [] as never[]),

 // Turnos de caja abiertos hace más de 24h
 prisma.turnoCaja.findMany({
 where: { estado: "ABIERTO", fechaApertura: { lt: new Date(hoy.getTime() - 24 * 60 * 60 * 1000) } },
 select: { id: true, numero: true, usuario: { select: { nombre: true, apellido: true } }, fechaApertura: true },
 orderBy: { fechaApertura: "asc" },
 }),
 ]);

 return {
 stockBajoItems,
 cxcVencidas,
 cxpVencidas,
 cxcPorVencer,
 cxpPorVencer,
 nominasBorrador,
 ocAprobadas,
 turnosAbiertos,
 };
}

function fmt(n: unknown) {
 return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}
function fmtFecha(d: Date | string) {
 return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}
function diasVencido(d: Date | string) {
 const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
 return diff;
}

// Componente tarjeta de alerta 
function AlertCard({
 titulo, color, count, children, href,
}: {
 titulo: string;
 color: "red" | "amber" | "yellow" | "blue" | "orange";
 count: number;
 children: React.ReactNode;
 href?: string;
}) {
 const ring = {
 red: "border-red-300 dark:border-red-800",
 amber: "border-amber-300 dark:border-amber-700",
 yellow: "border-yellow-300 dark:border-yellow-700",
 blue: "border-blue-300 dark:border-blue-700",
 orange: "border-orange-300 dark:border-orange-700",
 }[color];

 const badge = {
 red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
 amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
 yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
 blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
 orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
 }[color];

 return (
 <div className={`rounded-xl border-2 ${ring} bg-card overflow-hidden`}> <div className="px-4 py-3 border-b flex items-center justify-between gap-2"> <h2 className="font-semibold text-sm">{titulo}</h2> <div className="flex items-center gap-2"> <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}> {count}
 </span> {href && (
 <Link href={href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs h-7")}> Ver todo 
 </Link> )}
 </div> </div> <div className="px-4 py-3"> {children}
 </div> </div> );
}

// Página 
export default async function AlertasPage() {
 const [a, session] = await Promise.all([getAlertas(), auth()]);
 const rol = (session?.user as { rol?: string })?.rol ?? "";

 // VENDEDOR solo ve stock bajo
 const soloStock = rol === "VENDEDOR";

 const totalAlertas = soloStock
 ? a.stockBajoItems.length
 : a.stockBajoItems.length +
 a.cxcVencidas.length +
 a.cxpVencidas.length +
 a.cxcPorVencer.length +
 a.cxpPorVencer.length +
 a.nominasBorrador.length +
 a.ocAprobadas.length +
 a.turnosAbiertos.length;

 return (
 <div className="max-w-4xl mx-auto space-y-6"> {/* Encabezado */}
 <div className="flex items-center gap-3"> <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(145deg,#eab308,#ca8a04)" }}> <svg viewBox="0 0 40 40" fill="none" className="w-5 h-5"> <path d="M20 6a2 2 0 00-2 2v1.1A10 10 0 0010 19v6l-2 3h24l-2-3v-6a10 10 0 00-8-9.9V8a2 2 0 00-2-2z" stroke="white" strokeWidth="2.3" strokeLinejoin="round"/> <path d="M17 28a3 3 0 006 0" stroke="white" strokeWidth="2.3" strokeLinecap="round"/> </svg> </div> <div> <h1 className="text-2xl font-bold">Alertas</h1> <p className="text-sm text-muted-foreground"> {totalAlertas === 0
 ? "Todo en orden " : `${totalAlertas} alerta${totalAlertas !== 1 ? "s" : ""} activa${totalAlertas !== 1 ? "s" : ""}`}
 </p> </div> </div> {totalAlertas === 0 && (
 <div className="rounded-xl border bg-card px-6 py-14 text-center text-muted-foreground"> <p className="text-4xl mb-3"></p> <p className="font-semibold text-foreground">Sin alertas pendientes</p> <p className="text-sm mt-1">El sistema está al día en todos los módulos.</p> </div> )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> {/* Stock bajo */}
 {a.stockBajoItems.length > 0 && (
 <AlertCard titulo=" Stock bajo mínimo" color="amber" count={a.stockBajoItems.length} href="/productos"> <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1"> {(a.stockBajoItems as { id: string; codigo: string; nombre: string; stockActual: number; stockMinimo: number }[]).map((p) => (
 <Link key={p.id} href={`/productos/${p.id}`}
 className="flex items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5 gap-2"> <span className="truncate font-medium">{p.nombre}</span> <span className="shrink-0 text-amber-600 dark:text-amber-400 font-bold"> {Number(p.stockActual)} / {Number(p.stockMinimo)}
 </span> </Link> ))}
 </div> </AlertCard> )}

 {/* CxC vencidas */}
 {!soloStock && a.cxcVencidas.length > 0 && (
 <AlertCard titulo=" CxC vencidas" color="red" count={a.cxcVencidas.length} href="/contabilidad/cxc"> <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1"> {a.cxcVencidas.map((c) => (
 <div key={c.id} className="flex items-center justify-between text-xs gap-2"> <div className="truncate"> <span className="font-medium">{c.cliente.nombre}</span> <span className="text-muted-foreground ml-1">— {c.venta?.numero}</span> </div> <div className="text-right shrink-0"> <p className="font-bold text-red-600 dark:text-red-400">{fmt(c.saldo)}</p> <p className="text-muted-foreground">{diasVencido(c.fechaVencimiento!)} días</p> </div> </div> ))}
 </div> </AlertCard> )}

 {/* CxP vencidas */}
 {!soloStock && a.cxpVencidas.length > 0 && (
 <AlertCard titulo=" CxP vencidas" color="red" count={a.cxpVencidas.length} href="/contabilidad/cxp"> <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1"> {(a.cxpVencidas as { id: string; compra?: { numero: string } | null; suplidor: { nombre: string }; saldo: unknown; fechaVencimiento: Date | null }[]).map((c) => (
 <div key={c.id} className="flex items-center justify-between text-xs gap-2"> <div className="truncate"> <span className="font-medium">{c.suplidor.nombre}</span> {c.compra && <span className="text-muted-foreground ml-1">— {c.compra.numero}</span>}
 </div> <div className="text-right shrink-0"> <p className="font-bold text-red-600 dark:text-red-400">{fmt(c.saldo)}</p> <p className="text-muted-foreground">{diasVencido(c.fechaVencimiento!)} días</p> </div> </div> ))}
 </div> </AlertCard> )}

 {/* CxC por vencer */}
 {!soloStock && a.cxcPorVencer.length > 0 && (
 <AlertCard titulo=" CxC vencen en 7 días" color="yellow" count={a.cxcPorVencer.length} href="/contabilidad/cxc"> <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1"> {a.cxcPorVencer.map((c) => (
 <div key={c.id} className="flex items-center justify-between text-xs gap-2"> <div className="truncate"> <span className="font-medium">{c.cliente.nombre}</span> <span className="text-muted-foreground ml-1">— {c.venta?.numero}</span> </div> <div className="text-right shrink-0"> <p className="font-bold">{fmt(c.saldo)}</p> <p className="text-muted-foreground">{fmtFecha(c.fechaVencimiento!)}</p> </div> </div> ))}
 </div> </AlertCard> )}

 {/* CxP por vencer */}
 {!soloStock && a.cxpPorVencer.length > 0 && (
 <AlertCard titulo=" CxP vencen en 7 días" color="yellow" count={a.cxpPorVencer.length} href="/contabilidad/cxp"> <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1"> {(a.cxpPorVencer as { id: string; compra?: { numero: string } | null; suplidor: { nombre: string }; saldo: unknown; fechaVencimiento: Date | null }[]).map((c) => (
 <div key={c.id} className="flex items-center justify-between text-xs gap-2"> <div className="truncate"> <span className="font-medium">{c.suplidor.nombre}</span> {c.compra && <span className="text-muted-foreground ml-1">— {c.compra.numero}</span>}
 </div> <div className="text-right shrink-0"> <p className="font-bold">{fmt(c.saldo)}</p> <p className="text-muted-foreground">{fmtFecha(c.fechaVencimiento!)}</p> </div> </div> ))}
 </div> </AlertCard> )}

 {/* Nóminas en borrador */}
 {!soloStock && a.nominasBorrador.length > 0 && (
 <AlertCard titulo=" Nóminas en borrador" color="blue" count={a.nominasBorrador.length} href="/nominas"> <div className="space-y-1.5"> {a.nominasBorrador.map((n) => (
 <Link key={n.id} href={`/nominas/${n.id}`}
 className="flex items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5"> <span className="font-medium">{n.numero}</span> <span className="text-muted-foreground"> {n.periodo === "PRIMERA_QUINCENA" ? "1ra quincena" : "2da quincena"} — {n.mes}/{n.anio}
 </span> </Link> ))}
 </div> </AlertCard> )}

 {/* Órdenes de compra aprobadas */}
 {!soloStock && a.ocAprobadas.length > 0 && (
 <AlertCard titulo=" Órdenes de compra aprobadas" color="orange" count={a.ocAprobadas.length} href="/ordenes-compra"> <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1"> {(a.ocAprobadas as { id: string; numero: string; suplidor: { nombre: string }; fechaEmision: Date; total: unknown }[]).map((oc) => (
 <Link key={oc.id} href={`/ordenes-compra/${oc.id}`}
 className="flex items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5 gap-2"> <div className="truncate"> <span className="font-medium">{oc.numero}</span> <span className="text-muted-foreground ml-1">— {oc.suplidor.nombre}</span> </div> <span className="shrink-0 font-bold">{fmt(oc.total)}</span> </Link> ))}
 </div> </AlertCard> )}

 {/* Turnos de caja abiertos +24h */}
 {!soloStock && a.turnosAbiertos.length > 0 && (
 <AlertCard titulo=" Turnos de caja sin cerrar (+24h)" color="red" count={a.turnosAbiertos.length} href="/caja"> <div className="space-y-1.5"> {a.turnosAbiertos.map((t) => (
 <Link key={t.id} href={`/caja/${t.id}`}
 className="flex items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5"> <span className="font-medium">Turno #{t.numero} — {t.usuario.nombre} {t.usuario.apellido}</span> <span className="text-muted-foreground">{fmtFecha(t.fechaApertura)}</span> </Link> ))}
 </div> </AlertCard> )}

 </div> </div> );
}
