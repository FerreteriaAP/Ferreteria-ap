import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getBadges() {
 const hoy = new Date();
 const [cxcVencidas, cxpVencidas] = await Promise.all([
 prisma.cuentaPorCobrar.count({
 where: { estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] }, fechaVencimiento: { lt: hoy } },
 }),
 prisma.cuentaPorPagar.count({
 where: { estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] }, fechaVencimiento: { lt: hoy } },
 }).catch(() => 0),
 ]);
 return { cxcVencidas, cxpVencidas: Number(cxpVencidas) };
}

export default async function ContabilidadPage() {
 const [b, session] = await Promise.all([getBadges(), auth()]);
 const rol = (session?.user as { rol?: string })?.rol ?? "";

 // ASISTENTE no ve Analíticas en este launcher
 const ocultarAnaliticas = rol === "ASISTENTE_ADMINISTRATIVO";

 const modulos = [
 {
 label: "Cuentas por Cobrar",
 sub: "CxC",
 href: "/contabilidad/cxc",
 grad: ["#3b82f6", "#2563eb"],
 badge: b.cxcVencidas,
 icon: (
 <svg viewBox="0 0 40 40" fill="none" className="w-[52%] h-[52%]"> {/* documento con flecha entrante */}
 <rect x="8" y="5" width="18" height="25" rx="2.5" stroke="white" strokeWidth="2.3"/> <path d="M13 12h8M13 17h8M13 22h5" stroke="white" strokeWidth="2" strokeLinecap="round"/> <path d="M30 18v14M30 32l-4-4M30 32l4-4" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/> </svg> ),
 },
 {
 label: "Cuentas por Pagar",
 sub: "CxP",
 href: "/contabilidad/cxp",
 grad: ["#ef4444", "#dc2626"],
 badge: b.cxpVencidas,
 icon: (
 <svg viewBox="0 0 40 40" fill="none" className="w-[52%] h-[52%]"> {/* documento con flecha saliente */}
 <rect x="8" y="5" width="18" height="25" rx="2.5" stroke="white" strokeWidth="2.3"/> <path d="M13 12h8M13 17h8M13 22h5" stroke="white" strokeWidth="2" strokeLinecap="round"/> <path d="M30 32V18M30 18l-4 4M30 18l4 4" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/> </svg> ),
 },
 {
 label: "Analíticas",
 sub: "Ventas y márgenes",
 href: "/contabilidad/analiticas",
 grad: ["#8b5cf6", "#7c3aed"],
 badge: 0,
 icon: (
 <svg viewBox="0 0 40 40" fill="none" className="w-[52%] h-[52%]"> <path d="M6 32L14 18l8 6 8-14 6 4" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/> <path d="M6 32h28" stroke="white" strokeWidth="2" strokeLinecap="round"/> <circle cx="14" cy="18" r="2.5" fill="white"/> <circle cx="22" cy="24" r="2.5" fill="white"/> <circle cx="30" cy="10" r="2.5" fill="white"/> </svg> ),
 },
 {
 label: "Gastos",
 sub: "Por categoría",
 href: "/contabilidad/gastos",
 grad: ["#f43f5e", "#e11d48"],
 badge: 0,
 icon: (
 <svg viewBox="0 0 40 40" fill="none" className="w-[52%] h-[52%]"> {/* pastel / torta */}
 <path d="M20 8a14 14 0 110 28A14 14 0 0120 8z" stroke="white" strokeWidth="2.3"/> <path d="M20 8v14h14" stroke="white" strokeWidth="2.3" strokeLinecap="round"/> <path d="M20 22L8.5 29.5" stroke="white" strokeWidth="2" strokeLinecap="round"/> </svg> ),
 },
 {
 label: "Reportes",
 sub: "Informes generales",
 href: "/contabilidad/reportes",
 grad: ["#64748b", "#475569"],
 badge: 0,
 icon: (
 <svg viewBox="0 0 40 40" fill="none" className="w-[52%] h-[52%]"> <rect x="9" y="4" width="22" height="32" rx="2.5" stroke="white" strokeWidth="2.3"/> <path d="M14 13h12M14 19h12M14 25h8" stroke="white" strokeWidth="2" strokeLinecap="round"/> <path d="M14 31h5" stroke="white" strokeWidth="2" strokeLinecap="round"/> </svg> ),
 },
 {
 label: "Impuestos",
 sub: "ITBIS / DGII",
 href: "/contabilidad/impuestos",
 grad: ["#f97316", "#ea580c"],
 badge: 0,
 icon: (
 <svg viewBox="0 0 40 40" fill="none" className="w-[52%] h-[52%]"> <rect x="7" y="5" width="26" height="30" rx="2.5" stroke="white" strokeWidth="2.3"/> <path d="M12 13h16M12 19h16M12 25h10" stroke="white" strokeWidth="2" strokeLinecap="round"/> <path d="M24 23l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> </svg> ),
 },
 ];

 return (
 <div className="max-w-3xl mx-auto space-y-8 py-4"> {/* Encabezado */}
 <div> <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1> <p className="text-sm text-muted-foreground mt-0.5">Selecciona un módulo</p> </div> {/* Lanzador */}
 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-6 gap-y-8"> {modulos.filter(m => !(ocultarAnaliticas && m.href === "/contabilidad/analiticas")).map((m) => (
 <Link
 key={m.href}
 href={m.href}
 className="flex flex-col items-center gap-2.5 group" > <div className="relative"> <div
 className="w-[90px] h-[90px] rounded-[24px] flex items-center justify-center shadow-md
 transition-all duration-150
 group-hover:scale-110 group-hover:shadow-xl group-active:scale-95" style={{ background: `linear-gradient(145deg, ${m.grad[0]}, ${m.grad[1]})` }}
 > {m.icon}
 </div> {m.badge > 0 && (
 <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5
 bg-red-500 text-white text-[10px] font-bold rounded-full
 flex items-center justify-center ring-2 ring-background"> {m.badge > 99 ? "99+" : m.badge}
 </span> )}
 </div> <div className="text-center max-w-[80px]"> <p className="text-[11.5px] font-medium leading-tight text-foreground/75
 group-hover:text-foreground transition-colors line-clamp-2"> {m.label}
 </p> <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5 line-clamp-1"> {m.sub}
 </p> </div> </Link> ))}
 </div> </div> );
}
