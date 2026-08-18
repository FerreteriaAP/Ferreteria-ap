import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { LucideProps } from "lucide-react";
import {
  UsersRound, TrendingUp, SquareTerminal, ShoppingCart,
  Banknote, Box, Landmark, PieChart, FileText, UserRound,
  Bell, Settings,
} from "lucide-react";

async function getStats() {
  const [cxcVencidas, cxpVencidas, stockBajoRes] = await Promise.all([
    prisma.cuentaPorCobrar.count({
      where: { estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] }, fechaVencimiento: { lt: new Date() } },
    }).catch(() => 0),
    prisma.cuentaPorPagar.count({
      where: { estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] }, fechaVencimiento: { lt: new Date() } },
    }).catch(() => 0),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM productos
      WHERE activo = true AND "stockActual" <= "stockMinimo" AND "stockMinimo" > 0
    `.catch(() => [{ count: BigInt(0) }]),
  ]);
  return {
    cxcVencidas: Number(cxcVencidas),
    cxpVencidas: Number(cxpVencidas),
    stockBajo:   Number((stockBajoRes as { count: bigint }[])[0]?.count ?? 0),
  };
}

const TODOS_MODULOS = [
  { key: "Contactos",      label: "Contactos",      href: "/contactos",    Icon: UsersRound     },
  { key: "Ventas",         label: "Ventas",          href: "/ventas",       Icon: TrendingUp     },
  { key: "Punto de Venta", label: "Punto de Venta",  href: "/pdv",          Icon: SquareTerminal },
  { key: "Compras",        label: "Compras",         href: "/compras",      Icon: ShoppingCart   },
  { key: "Caja",           label: "Caja",            href: "/caja",         Icon: Banknote       },
  { key: "Inventario",     label: "Inventario",      href: "/productos",    Icon: Box            },
  { key: "Contabilidad",   label: "Contabilidad",    href: "/contabilidad", Icon: Landmark       },
  { key: "Gastos",         label: "Gastos",          href: "/gastos",       Icon: PieChart       },
  { key: "Nóminas",        label: "Nóminas",         href: "/nominas",      Icon: FileText       },
  { key: "Empleados",      label: "Empleados",       href: "/empleados",    Icon: UserRound      },
  { key: "Alertas",        label: "Alertas",         href: "/alertas",      Icon: Bell           },
  { key: "Configuración",  label: "Configuración",   href: "/configuracion",Icon: Settings       },
];

const MODULOS_POR_ROL: Record<string, string[] | null> = {
  ADMINISTRADOR:            null,
  VENDEDOR:                 ["Ventas", "Punto de Venta", "Compras", "Inventario", "Contactos", "Alertas"],
  ASISTENTE_ADMINISTRATIVO: ["Contactos", "Ventas", "Punto de Venta", "Compras", "Inventario",
                             "Contabilidad", "Gastos", "Nóminas", "Empleados", "Alertas"],
  CAJA:                     ["Caja", "Alertas"],
};

function ModuleCard({ label, href, Icon, badge = 0, moduleKey }: {
  label: string; href: string; Icon: React.ComponentType<LucideProps>;
  badge?: number; moduleKey: string;
}) {
  const iconColorVar = "var(--icon-color, var(--accent-hex))";

  return (
    <Link
      href={href}
      data-module={moduleKey}
      className="mod-card-link group relative flex flex-col items-center justify-between pt-7 pb-0 px-3
        rounded-2xl transition-all duration-150 cursor-pointer select-none overflow-hidden w-full h-full"
      style={{
        backgroundColor: "var(--card-bg-hex)",
        border: "1px solid var(--card-border-hex)",
        minHeight: 130,
      }}
    >
      {badge > 0 && (
        <span
          className="absolute top-2.5 right-2.5 min-w-[18px] h-[18px] px-1 rounded-full
            flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: "var(--warning)", color: "var(--warning-foreground)" }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      <div className="flex items-center justify-center mb-3">
        <Icon size={30} strokeWidth={1.6} style={{ color: iconColorVar }} />
      </div>

      <p
        className="text-center font-medium leading-tight mb-4"
        style={{ color: "var(--foreground)", fontSize: 13 }}
      >
        {label}
      </p>

      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-150"
        style={{ width: 32, height: 3, backgroundColor: iconColorVar, opacity: 0.8 }}
      />

      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{
          backgroundColor: "color-mix(in oklch, var(--primary) 4%, transparent)",
          border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)",
        }}
      />
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const stats   = await getStats();

  const rol     = (session?.user as { rol?: string })?.rol ?? "VENDEDOR";
  const allowed = MODULOS_POR_ROL[rol] ?? null;

  const modulos = allowed === null
    ? TODOS_MODULOS
    : TODOS_MODULOS.filter(m => allowed.includes(m.key));

  const totalAlertas = stats.cxcVencidas + stats.cxpVencidas + stats.stockBajo;

  return (
    <div className="flex flex-col gap-6 max-w-[960px] mx-auto w-full pt-16">

      {/* Panel de módulos */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: "var(--panel)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[3px] h-5 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
          <h2
            className="font-bold tracking-widest"
            style={{ color: "var(--foreground)", fontSize: 13, letterSpacing: "0.14em" }}
          >
            CENTRO DE OPERACIONES
          </h2>
        </div>

        {/* Grid centrado — filas de 6, centradas cuando son menos */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
          {modulos.map((m) => (
            <ModuleCard
              key={m.key}
              moduleKey={m.key}
              label={m.label}
              href={m.href}
              Icon={m.Icon}
              badge={m.key === "Alertas" ? totalAlertas : 0}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
