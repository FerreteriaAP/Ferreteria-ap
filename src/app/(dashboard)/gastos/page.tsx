import Link from "next/link";
import { getGastos, getCategoriasGasto } from "@/actions/gastos";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GastoForm } from "@/components/gastos/gasto-form";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string; mes?: string; page?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

export default async function GastosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const busqueda   = params.q   ?? "";
  const categoriaId = params.cat ?? "";
  const mes        = params.mes  ?? "";
  const page       = Number(params.page ?? 1);

  const [{ gastos, total, pages }, categorias] = await Promise.all([
    getGastos({ categoriaId: categoriaId || undefined, busqueda, mes: mes || undefined, page }),
    getCategoriasGasto(),
  ]);

  // Solo categorías variables para el formulario de registro
  // (las fijas se proyectan automáticamente desde gastos_fijos)
  const categoriasForm = categorias.filter((c) => c.tipo === "VARIABLE");

  const totalMonto = gastos.reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gastos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} registros — <span className="font-semibold" style={{ color: "var(--accent-hex)" }}>{fmt(totalMonto)}</span> en esta vista
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Formulario nuevo gasto */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: HEADER_BG }}>
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <h2 className="font-semibold text-sm">Registrar gasto</h2>
            </div>
            <div className="p-5">
              <GastoForm categorias={categoriasForm} />
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filtros */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            <div className="px-4 py-3 border-b" style={{ backgroundColor: HEADER_BG }}>
              <form method="GET" className="flex flex-col sm:flex-row gap-2">
                <Input name="q" defaultValue={busqueda} placeholder="Buscar descripción..." className="flex-1 h-8 text-sm" />
                <select name="cat" defaultValue={categoriaId}
                  className="h-8 border rounded-md px-2 text-sm bg-background">
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <input name="mes" type="month" defaultValue={mes}
                  className="h-8 border rounded-md px-2 text-sm bg-background" />
                <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Filtrar
                </button>
              </form>
            </div>

            {/* Tabla */}
            {gastos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="font-medium">Sin gastos registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5 font-medium">#</th>
                      <th className="text-left px-4 py-2.5 font-medium">Descripción</th>
                      <th className="text-left px-4 py-2.5 font-medium">Categoría</th>
                      <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                      <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                      <th className="text-right px-4 py-2.5 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {gastos.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--accent-hex)" }}>
                          {g.numero}
                        </td>
                        <td className="px-4 py-2.5 text-sm max-w-xs truncate">{g.descripcion}</td>
                        <td className="px-4 py-2.5 text-sm">{g.categoria.nombre}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={g.categoria.tipo === "FIJO" ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {g.categoria.tipo === "FIJO" ? "Fijo" : "Variable"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {new Date(g.fecha).toLocaleDateString("es-DO")}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                          {fmt(g.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                        Total vista ({gastos.length} registros)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-bold" style={{ color: "var(--accent-hex)" }}>
                        {fmt(totalMonto)}
                      </td>
                    </tr>
                  </tfoot>
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
                  href={`/gastos?q=${busqueda}&cat=${categoriaId}&page=${p}`}
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
