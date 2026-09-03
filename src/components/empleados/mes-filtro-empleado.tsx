"use client";

import { useRouter } from "next/navigation";

interface Props {
  empleadoId: string;
  mesActual?: string;
}

export function MesFiltroEmpleado({ empleadoId, mesActual }: Props) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      router.push(`/empleados/${empleadoId}?mes=${val}`);
    } else {
      router.push(`/empleados/${empleadoId}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={mesActual ?? ""}
        onChange={handleChange}
        className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
      {mesActual && (
        <button
          type="button"
          onClick={() => router.push(`/empleados/${empleadoId}`)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
        >
          ✕ Todo
        </button>
      )}
    </div>
  );
}
