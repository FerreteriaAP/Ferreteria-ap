"use client";

import { useRouter } from "next/navigation";

interface Props {
  empleadoId: string;
  filtroActual?: string; // "YYYY-MM" | "YYYY" | undefined
}

export function MesFiltroEmpleado({ empleadoId, filtroActual }: Props) {
  const router = useRouter();
  const hoy = new Date();
  const anioActual = String(hoy.getFullYear());

  const esMes  = filtroActual ? /^\d{4}-\d{2}$/.test(filtroActual) : false;
  const esAnio = filtroActual ? /^\d{4}$/.test(filtroActual) : false;

  const ir = (v: string | null) => {
    if (v) router.push(`/empleados/${empleadoId}?filtro=${v}`);
    else   router.push(`/empleados/${empleadoId}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selector de mes */}
      <input
        type="month"
        value={esMes ? filtroActual! : ""}
        onChange={e => ir(e.target.value || null)}
        className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
      />

      {/* Selector de año */}
      <select
        value={esAnio ? filtroActual! : ""}
        onChange={e => ir(e.target.value || null)}
        className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
      >
        <option value="">— Año</option>
        {[anioActual, String(hoy.getFullYear() - 1), String(hoy.getFullYear() - 2)].map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Borrar filtro */}
      {filtroActual && (
        <button
          type="button"
          onClick={() => ir(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
        >
          ✕ Todo
        </button>
      )}
    </div>
  );
}
