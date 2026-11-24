import Link from "next/link";
import { getPanelEcf } from "@/actions/ecf";
import { ESTADO_ECF_LABEL, TIPO_ECF_NOMBRE } from "@/lib/ecf";
import { EcfAcciones, EcfSincronizarBtn } from "@/components/contabilidad/ecf-acciones";

export const dynamic = "force-dynamic";

const CARD_BG = "color-mix(in srgb, var(--card) 55%, transparent)";
const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Salud = Record<string, unknown>;

function Tarjeta({ titulo, children, color }: { titulo: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: CARD_BG, ...(color ? { borderColor: `color-mix(in oklch, ${color} 35%, var(--border))` } : {}) }}>
      <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{titulo}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function mensajes(v: { ecfError: string | null; ecfMensajes: unknown }) {
  const m = Array.isArray(v.ecfMensajes) ? v.ecfMensajes.map((x) => (typeof x === "string" ? x : JSON.stringify(x))) : [];
  return [v.ecfError, ...m].filter(Boolean).join(" · ");
}

export default async function EcfPage() {
  const p = await getPanelEcf();
  const salud = p.salud.ok ? (p.salud.datos as Salud) : null;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Comprobantes electrónicos (e-CF)</h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {p.activo ? "Facturación electrónica ACTIVA (conector KRP → DGII)." : "Facturación electrónica desactivada (ECF_ACTIVO=false)."}
          </p>
        </div>
        <EcfSincronizarBtn />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tarjeta titulo="Conector" color={p.salud.ok ? "#16a34a" : "#dc2626"}>
          {p.salud.ok
            ? <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>Conectado</p>
            : <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Sin conexión: {p.salud.error}</p>}
        </Tarjeta>
        <Tarjeta titulo="En proceso en la DGII">
          <p className="text-xl font-bold tabular-nums">{p.enCurso}</p>
        </Tarjeta>
        <Tarjeta titulo="Aceptados (últimas 24 h)">
          <p className="text-xl font-bold tabular-nums">{p.aceptadasUltimas24h}</p>
        </Tarjeta>
      </div>

      {salud && (
        <details className="rounded-xl border p-4 text-xs" style={{ backgroundColor: CARD_BG }}>
          <summary className="cursor-pointer font-semibold text-sm">Certificado y secuencias disponibles</summary>
          <pre className="mt-3 whitespace-pre-wrap break-all" style={{ color: "var(--muted-foreground)" }}>{JSON.stringify(salud, null, 2)}</pre>
        </details>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Facturas que requieren atención ({p.ventas.length})
        </h2>
        {p.ventas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Nada pendiente.</p>
        ) : (
          <div className="rounded-xl border divide-y" style={{ backgroundColor: CARD_BG }}>
            {p.ventas.map((v) => (
              <div key={v.id} className="p-3 flex flex-wrap items-start justify-between gap-3 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <Link href={`/ventas/${v.id}`} className="font-mono font-semibold hover:underline">{v.numero}</Link>
                  <span className="ml-2" style={{ color: "var(--muted-foreground)" }}>{v.cliente.nombre} · {fmt(v.total)}</span>
                  <p className="text-xs">
                    {v.ecfEncf ? <span className="font-mono">{v.ecfEncf}</span> : "Sin e-CF"}
                    {v.ecfTipo ? ` · ${TIPO_ECF_NOMBRE[v.ecfTipo] ?? v.ecfTipo}` : ""}
                    {" · "}
                    <strong>{v.ecfEstado ? (ESTADO_ECF_LABEL[v.ecfEstado] ?? v.ecfEstado) : "No emitido"}</strong>
                  </p>
                  {mensajes(v) && <p className="text-xs break-words" style={{ color: "#dc2626" }}>{mensajes(v)}</p>}
                </div>
                <EcfAcciones tipo="venta" id={v.id} encf={v.ecfEncf} estado={v.ecfEstado} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Notas de crédito que requieren atención ({p.notasCredito.length})
        </h2>
        {p.notasCredito.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Nada pendiente.</p>
        ) : (
          <div className="rounded-xl border divide-y" style={{ backgroundColor: CARD_BG }}>
            {p.notasCredito.map((n) => (
              <div key={n.id} className="p-3 flex flex-wrap items-start justify-between gap-3 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <span className="font-mono font-semibold">{n.numero}</span>
                  <span className="ml-2" style={{ color: "var(--muted-foreground)" }}>{n.cliente.nombre} · {fmt(n.monto)}</span>
                  <p className="text-xs">
                    {n.ecfEncf ? <span className="font-mono">{n.ecfEncf}</span> : "Sin e-CF"}
                    {" · "}
                    <strong>{n.ecfEstado ? (ESTADO_ECF_LABEL[n.ecfEstado] ?? n.ecfEstado) : "No emitido"}</strong>
                  </p>
                  {mensajes(n) && <p className="text-xs break-words" style={{ color: "#dc2626" }}>{mensajes(n)}</p>}
                </div>
                <EcfAcciones tipo="nc" id={n.id} encf={n.ecfEncf} estado={n.ecfEstado} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
