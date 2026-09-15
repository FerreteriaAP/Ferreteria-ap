import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVentaParaVDP, getVentaVDPById, type VDPMatch } from "@/actions/ventas";
import { VDPEditor, VDPSearch } from "@/components/ventas/vdp-editor";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ q?: string; id?: string }>;
}

export const metadata = { title: "Cálculo VDP — Ferretería AP" };

const DOP = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const tipoLabel: Record<string, string> = {
  COTIZACION:  "Cotización",
  ORDEN_VENTA: "Orden de Venta",
  CONDUCE:     "Conduce",
  FACTURADA:   "Factura",
  CANCELADA:   "Cancelada",
};

function MatchesList({ matches, q }: { matches: VDPMatch[]; q: string }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b" style={{ background: "color-mix(in oklch, var(--border) 20%, transparent)" }}>
        <p className="text-sm font-semibold">
          {matches.length} documentos encontrados para &ldquo;{q}&rdquo; — selecciona uno:
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase text-muted-foreground border-b">
            <th className="px-4 py-2 text-left">Número</th>
            <th className="px-4 py-2 text-left">Tipo</th>
            <th className="px-4 py-2 text-left">Cliente</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr
              key={m.id}
              style={{
                borderBottom: "1px solid color-mix(in oklch, var(--border) 35%, transparent)",
                background: i % 2 === 0 ? "transparent" : "color-mix(in oklch, var(--border) 10%, transparent)",
              }}
            >
              <td className="px-4 py-2 font-mono text-xs font-semibold" style={{ color: "#F47717" }}>
                {m.numero}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {tipoLabel[m.tipo] ?? m.tipo}
              </td>
              <td className="px-4 py-2">{m.cliente}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {new Date(m.fecha).toLocaleDateString("es-DO")}
              </td>
              <td className="px-4 py-2 text-right font-medium tabular-nums">
                {DOP(m.total)}
              </td>
              <td className="px-4 py-2 text-right">
                <Link
                  href={`/ventas/vdp?id=${m.id}&q=${encodeURIComponent(q)}`}
                  className="text-xs font-semibold px-3 py-1 rounded"
                  style={{ background: "#F47717", color: "#fff" }}
                >
                  Cargar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function VDPPage({ searchParams }: PageProps) {
  const session = await auth();
  const rol = ((session?.user) as { rol?: string })?.rol ?? "";
  if (rol !== "ADMINISTRADOR") redirect("/ventas");

  const params = await searchParams;
  const q      = params.q?.trim() ?? "";
  const ventaId = params.id?.trim() ?? "";

  let venta   = null;
  let matches: VDPMatch[] | null = null;
  let error: string | null = null;

  if (ventaId) {
    // Carga directa por ID (usuario eligió de la lista)
    const res = await getVentaVDPById(ventaId);
    if (res.error) error = res.error;
    else venta = res.venta!;
  } else if (q) {
    const res = await getVentaParaVDP(q);
    if (res.error)        error   = res.error;
    else if (res.venta)   venta   = res.venta;
    else if (res.matches) matches = res.matches;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cálculo VDP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verificación de Precios — busca por número de documento o nombre de cliente
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
        <VDPSearch defaultValue={q} />
        <p className="text-xs text-muted-foreground">
          Puedes buscar por número (ej. <span className="font-mono">OVN/2026/0045</span>) o por nombre de cliente
        </p>
        {error && (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        )}
      </div>

      {/* Lista de coincidencias */}
      {matches && <MatchesList matches={matches} q={q} />}

      {/* Editor */}
      {venta ? (
        <VDPEditor venta={venta} busqueda={q} />
      ) : !q && !ventaId ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Ingresa el número de un documento o nombre de cliente</p>
          <p className="text-sm mt-1">
            Ejemplo: <span className="font-mono">OVN/2026/0045</span> ·{" "}
            <span className="font-mono">FAC/2026/0001</span> · <span className="font-mono">Constructora</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
