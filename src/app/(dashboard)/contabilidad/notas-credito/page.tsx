import Link from "next/link";
import { ChevronLeft, FileX2 } from "lucide-react";
import { getNotasCreditoAdmin } from "@/actions/nota-credito";
import { NcTabla } from "@/components/contabilidad/nc-tabla";

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function NotasCreditoAdminPage() {
  const { rows, total } = await getNotasCreditoAdmin({ pageSize: 200 });

  const pendientes = rows.filter(r => r.estado === "PENDIENTE");
  const aplicadas  = rows.filter(r => r.estado === "APLICADA");
  const anuladas   = rows.filter(r => r.estado === "ANULADA");

  const totalPendiente = pendientes.reduce((s, r) => s + r.montoRestante, 0);
  const totalAplicado  = aplicadas.reduce((s, r) => s + r.monto, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/contabilidad" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft size={14} /> Contabilidad
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Notas de Crédito</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#a855f720", color: "#a855f7" }}
        >
          <FileX2 size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas de Crédito</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} nota{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total NCs", val: String(total), sub: "todas las notas", color: "#a855f7" },
          { label: "Pendientes", val: String(pendientes.length), sub: fmt(totalPendiente), color: "#a855f7" },
          { label: "Aplicadas", val: String(aplicadas.length), sub: fmt(totalAplicado), color: "#22c55e" },
          { label: "Anuladas", val: String(anuladas.length), sub: "canceladas", color: "#64748b" },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border px-5 py-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Panel */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-[3px] h-5 rounded-full" style={{ backgroundColor: "#a855f7" }} />
          <h2 className="font-bold tracking-widest text-[13px]" style={{ letterSpacing: "0.14em" }}>
            HISTORIAL
          </h2>
        </div>

        {/* Tabla interactiva (client component) */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <NcTabla rows={rows as any} />
      </div>
    </div>
  );
}
