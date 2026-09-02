import { getGastosFijos } from "@/actions/contabilidad";
import { GastosFijosClient } from "./gastos-fijos-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Gastos Fijos — Ferretería AP" };

export default async function GastosFijosPage() {
  const session = await auth();
  const rol = (session?.user as { rol?: string })?.rol;
  if (!["ADMINISTRADOR", "ASISTENTE_ADMINISTRATIVO"].includes(rol ?? "")) {
    redirect("/configuracion");
  }

  const gastosFijos = await getGastosFijos();

  const total = gastosFijos
    .filter((g) => g.activo)
    .reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Gastos Fijos Mensuales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Se proyectan automáticamente en las analíticas a partir del <strong>día 10</strong> de cada mes.
          Aparecen en reportes de gastos pero <em>no</em> generan registros individuales.
        </p>
      </div>

      <GastosFijosClient gastosFijos={gastosFijos.map(g => ({ ...g, monto: Number(g.monto) }))} totalMensual={total} />
    </div>
  );
}
