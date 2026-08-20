import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { LucideProps } from "lucide-react";
import {
  HandCoins, TrendingDown, BarChart3,
  Receipt, ScrollText, Calculator,
} from "lucide-react";

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

function ModuleCard({ label, sub, href, Icon, color, badge = 0 }: {
  label: string; sub: string; href: string;
  Icon: React.ComponentType<LucideProps>; color: string; badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center justify-between pt-7 pb-0 px-3
        rounded-2xl transition-all duration-150 cursor-pointer select-none overflow-hidden w-full"
      style={{
        backgroundColor: "var(--card-bg-hex)",
        border: "1px solid var(--card-border-hex)",
        minHeight: 160,
      }}
    >
      {/* Badge */}
      {badge > 0 && (
        <span className="absolute top-2.5 right-2.5 min-w-[18px] h-[18px] px-1 rounded-full
          flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: "var(--warning)", color: "var(--warning-foreground)" }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Ícono */}
      <div className="flex items-center justify-center mb-2">
        <Icon size={38} strokeWidth={1.5} style={{ color }} />
      </div>

      {/* Texto */}
      <div className="text-center mb-4 space-y-0.5">
        <p className="font-semibold leading-tight" style={{ color: "var(--foreground)", fontSize: 13 }}>
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
      </div>

      {/* Barrita de color */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-150"
        style={{ width: 32, height: 3, backgroundColor: color, opacity: 0.8 }}
      />

      {/* Hover overlay */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{
          backgroundColor: `color-mix(in oklch, ${color} 6%, transparent)`,
          border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
        }}
      />
    </Link>
  );
}

export default async function ContabilidadPage() {
  const [b, session] = await Promise.all([getBadges(), auth()]);
  const rol = (session?.user as { rol?: string })?.rol ?? "";
  const ocultarAnaliticas = rol === "ASISTENTE_ADMINISTRATIVO";

  const modulos = [
    { label: "Cuentas por Cobrar", sub: "CxC",             href: "/contabilidad/cxc",       Icon: HandCoins,   color: "#3b82f6", badge: b.cxcVencidas },
    { label: "Cuentas por Pagar",  sub: "CxP",             href: "/contabilidad/cxp",       Icon: TrendingDown,color: "#ef4444", badge: b.cxpVencidas },
    { label: "Analíticas",         sub: "Ventas y márgenes",href: "/contabilidad/analiticas",Icon: BarChart3,   color: "#8b5cf6", badge: 0              },
    { label: "Gastos",             sub: "Por categoría",   href: "/contabilidad/gastos",    Icon: Receipt,     color: "#f43f5e", badge: 0              },
    { label: "Reportes",           sub: "Informes",        href: "/contabilidad/reportes",  Icon: ScrollText,  color: "#64748b", badge: 0              },
    { label: "Impuestos",          sub: "ITBIS / DGII",    href: "/contabilidad/impuestos", Icon: Calculator,  color: "#f97316", badge: 0              },
  ].filter(m => !(ocultarAnaliticas && m.href === "/contabilidad/analiticas"));

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Selecciona un módulo</p>
      </div>

      {/* Panel */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[3px] h-5 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
          <h2 className="font-bold tracking-widest text-[13px]" style={{ letterSpacing: "0.14em" }}>
            MÓDULOS
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {modulos.map(m => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}
