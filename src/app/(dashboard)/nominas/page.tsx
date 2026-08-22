import Link from "next/link";
import { getNominas } from "@/actions/nominas";
import { buttonVariants } from "@/components/ui/button";
import { NominaForm } from "@/components/nominas/nomina-form";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const periodoLabel: Record<string, string> = {
  PRIMERA_QUINCENA: "1ra Quincena",
  SEGUNDA_QUINCENA: "2da Quincena",
};

const meses = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ESTADO_STYLE: Record<string, { bg: string; text: string }> = {
  BORRADOR:  { bg: "color-mix(in oklch, var(--foreground) 6%, var(--card))",     text: "var(--muted-foreground)" },
  PROCESADA: { bg: "color-mix(in oklch, #3b82f6 10%, var(--card))",              text: "#3b82f6"                 },
  PAGADA:    { bg: "color-mix(in oklch, #16a34a 10%, var(--card))",              text: "#16a34a"                 },
};

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

export default async function NominasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { nominas, total, pages } = await getNominas(page);

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nóminas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} registros</p>
        </div>
        <Link
          href="/nominas/prestamos"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
        >
          Reporte de Préstamos
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Crear nómina */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HEADER_BG }}>
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <div>
                <h2 className="font-semibold text-sm">Crear nómina</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Se calculan automáticamente TSS, AFP, SFS y SAM</p>
              </div>
            </div>
            <div className="p-5">
              <NominaForm />
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            <div className="px-5 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
              <h2 className="font-semibold text-sm">Historial de nóminas</h2>
            </div>

            {nominas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-2 text-muted-foreground/30">—</div>
                <p className="font-medium">Sin nóminas creadas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5 font-medium">#</th>
                      <th className="text-left px-4 py-2.5 font-medium">Período</th>
                      <th className="text-center px-4 py-2.5 font-medium">Empleados</th>
                      <th className="text-right px-4 py-2.5 font-medium">Total bruto</th>
                      <th className="text-right px-4 py-2.5 font-medium">Total neto</th>
                      <th className="text-left px-4 py-2.5 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {nominas.map((n) => {
                      const est = ESTADO_STYLE[n.estado] ?? ESTADO_STYLE.BORRADOR;
                      return (
                        <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">
                            <Link href={`/nominas/${n.id}`} className="hover:underline" style={{ color: "var(--accent-hex)" }}>
                              {n.numero}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {periodoLabel[n.periodo]} — {meses[n.mes]} {n.anio}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">{n._count.empleados}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs">{fmt(n.totalBruto)}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{fmt(n.totalNeto)}</td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ backgroundColor: est.bg, color: est.text }}
                            >
                              {n.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginación */}
          {pages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/nominas?page=${p}`}
                  className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
