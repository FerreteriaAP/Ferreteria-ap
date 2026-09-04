"use client";

import { useRouter } from "next/navigation";

interface Props {
  empleadoId: string;
  filtroActual?: string; // "YYYY-MM" | "YYYY" | undefined
  mesDefault: string;   // "YYYY-MM" actual (calculado en servidor)
}

export function MesFiltroEmpleado({ empleadoId, filtroActual, mesDefault }: Props) {
  const router = useRouter();
  const hoy = new Date();
  const anioActual = String(hoy.getFullYear());

  const esMes  = !!filtroActual && /^\d{4}-\d{2}$/.test(filtroActual);
  const esAnio = !!filtroActual && /^\d{4}$/.test(filtroActual);

  // El mes que muestra el picker: el filtro actual si es mes, o el mes por defecto
  const valorMes = esMes ? filtroActual! : mesDefault;
  // El año seleccionado en el dropdown
  const valorAnio = esAnio ? filtroActual! : "";

  const ir = (v: string | null) => {
    if (v) router.push(`/empleados/${empleadoId}?filtro=${v}`);
    else   router.push(`/empleados/${empleadoId}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selector de mes */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Mes:</span>
        <input
          type="month"
          value={valorMes}
          onChange={e => {
            if (e.target.value) ir(e.target.value);
          }}
          className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </label>

      {/* Selector de año completo */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Año:</span>
        <select
          value={valorAnio}
          onChange={e => ir(e.target.value || null)}
          className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">—</option>
          {[anioActual, String(hoy.getFullYear() - 1), String(hoy.getFullYear() - 2)].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
