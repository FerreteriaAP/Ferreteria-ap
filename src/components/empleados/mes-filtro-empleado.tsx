"use client";

import { useRouter } from "next/navigation";

interface Props {
  empleadoId: string;
  filtroActual?: string; // "YYYY-MM" | "YYYY" | undefined
  mesDefault: string;   // "YYYY-MM" del mes en curso
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function MesFiltroEmpleado({ empleadoId, filtroActual, mesDefault }: Props) {
  const router = useRouter();
  const anio = Number(mesDefault.slice(0, 4));

  // Valor activo: filtroActual si existe, si no el mesDefault
  const valorActual = filtroActual ?? mesDefault;

  const ir = (v: string) => router.push(`/empleados/${empleadoId}?filtro=${v}`);

  return (
    <select
      value={valorActual}
      onChange={e => ir(e.target.value)}
      className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
    >
      {/* Meses del año en curso */}
      {MESES.map((nombre, i) => {
        const val = `${anio}-${String(i + 1).padStart(2, "0")}`;
        return <option key={val} value={val}>{nombre} {anio}</option>;
      })}
      {/* Año completo */}
      <option value={String(anio)}>Año completo {anio}</option>
    </select>
  );
}
