import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";

async function getHeaderData() {
  try {
    const [cxc, cxp, stock, turno] = await Promise.all([
      prisma.cuentaPorCobrar.count({
        where: { estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] }, fechaVencimiento: { lt: new Date() } },
      }).catch(() => 0),
      prisma.cuentaPorPagar.count({
        where: { estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] }, fechaVencimiento: { lt: new Date() } },
      }).catch(() => 0),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM productos
        WHERE activo = true AND "stockActual" <= "stockMinimo" AND "stockMinimo" > 0
      `.then(r => Number(r[0]?.count ?? 0)).catch(() => 0),
      prisma.turnoCaja.findFirst({ where: { estado: "ABIERTO" } }).catch(() => null),
    ]);
    return {
      alertas:     Number(cxc) + Number(cxp) + Number(stock),
      cajaAbierta: !!turno,
    };
  } catch {
    return { alertas: 0, cajaAbierta: false };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { name?: string | null; email?: string | null; rol?: string };

  const initials = user.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "AP";

  const rolLabel: Record<string, string> = {
    ADMINISTRADOR:            "Administrador",
    ASISTENTE_ADMINISTRATIVO: "Asistente Admin.",
    VENDEDOR:                 "Vendedor",
    CAJA:                     "Cajero",
  };

  const { alertas, cajaAbierta } = await getHeaderData();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      <AppHeader
        name={user.name ?? "Usuario"}
        email={user.email ?? ""}
        rol={rolLabel[user.rol ?? ""] ?? user.rol ?? ""}
        initials={initials}
        alertas={alertas}
        cajaAbierta={cajaAbierta}
      />
      <main className="flex-1 p-6" style={{ backgroundColor: "var(--background)" }}>
        {children}
      </main>
    </div>
  );
}
