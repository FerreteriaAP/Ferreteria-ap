import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVentaParaVDP } from "@/actions/ventas";
import { VDPEditor, VDPSearch } from "@/components/ventas/vdp-editor";

interface PageProps {
  searchParams: Promise<{ numero?: string }>;
}

export const metadata = { title: "Cálculo VDP — Ferretería AP" };

export default async function VDPPage({ searchParams }: PageProps) {
  const session = await auth();
  const rol = ((session?.user) as { rol?: string })?.rol ?? "";
  if (rol !== "ADMINISTRADOR") redirect("/ventas");

  const params = await searchParams;
  const numero = params.numero?.trim() ?? "";

  let venta = null;
  let error: string | null = null;

  if (numero) {
    const res = await getVentaParaVDP(numero);
    if (res.error) error = res.error;
    else venta = res.venta!;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cálculo VDP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verificación de Precios — modifica los precios de una orden y revisa
            el % de ganancia antes de facturar
          </p>
        </div>
        <a
          href="/ventas"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          ← Volver a Ventas
        </a>
      </div>

      {/* Buscador */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Buscar documento
        </p>
        <VDPSearch defaultValue={numero} />
        {error && (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        )}
      </div>

      {/* Editor (solo si hay venta cargada) */}
      {venta ? (
        <VDPEditor venta={venta} busqueda={numero} />
      ) : !numero ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Ingresa el número de un documento para comenzar</p>
          <p className="text-sm mt-1">
            Ejemplo: <span className="font-mono">ONV/2026/0001</span> ·{" "}
            <span className="font-mono">FAC/2026/0001</span> ·{" "}
            <span className="font-mono">COT/2026/0001</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
