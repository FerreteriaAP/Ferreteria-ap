import Link from "next/link";
import { getCxPPorSuplidor } from "@/actions/contabilidad";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { CxPMultiSelect } from "@/components/contabilidad/cxp-multi-select";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; todas?: string }>;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function CxPContabilidadPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const busqueda    = params.q ?? "";
  const mostrarTodas = params.todas === "1";

  const grupos = await getCxPPorSuplidor({ mostrarTodas, busqueda });

  const totalGeneral = grupos.reduce((s, g) => s + g.totalSaldo,   0);
  const totalVencido = grupos.reduce((s, g) => s + g.totalVencido, 0);
  const totalCompras = grupos.reduce((s, g) => s + g.compras.length, 0);

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/contabilidad"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full transition-all hover:brightness-110"
              style={{
                backgroundColor: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
                color: "var(--accent-hex)",
                border: "1px solid color-mix(in oklch, var(--accent-hex) 40%, transparent)",
              }}
            >
              ← Contabilidad
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-1">Cuentas por Pagar</h1>
          <p className="text-sm text-muted-foreground">
            {grupos.length} suplidor{grupos.length !== 1 ? "es" : ""} · {totalCompras} compra{totalCompras !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={mostrarTodas ? "/contabilidad/cxp" : "/contabilidad/cxp?todas=1"}
          className={cn(buttonVariants({ variant: mostrarTodas ? "default" : "outline", size: "sm" }))}
        >
          {mostrarTodas ? "Ver solo pendientes" : "Ver todas (incl. pagadas)"}
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))" }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total pendiente</p>
          <p className="text-2xl font-bold" style={{ color: "var(--accent-hex)" }}>{fmt(totalGeneral)}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Vencido</p>
          <p className="text-2xl font-bold text-destructive">{fmt(totalVencido)}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: "color-mix(in oklch, #16a34a 8%, var(--card))", borderColor: "color-mix(in oklch, #16a34a 30%, var(--border))" }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Al día</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalGeneral - totalVencido)}</p>
        </div>
      </div>

      {/* Buscador */}
      <form method="GET">
        {mostrarTodas && <input type="hidden" name="todas" value="1" />}
        <Input name="q" defaultValue={busqueda} placeholder="Buscar suplidor o número de compra..." className="max-w-sm" />
      </form>

      {/* Slot centrado para pill de selección */}
      <div className="flex justify-center">
        <div id="cxp-selection-bar" className="w-full max-w-sm" />
      </div>

      {/* Lista */}
      {grupos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3 text-muted-foreground/30">—</div>
          <p className="font-medium text-lg">Sin cuentas pendientes por pagar</p>
          <p className="text-sm mt-1">Todos los suplidores están pagados</p>
        </div>
      ) : (
        <CxPMultiSelect grupos={grupos} />
      )}
    </div>
  );
}
