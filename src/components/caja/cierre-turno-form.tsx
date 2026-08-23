"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cerrarTurno } from "@/actions/caja";

export function CierreTurnoForm({ turnoId }: { turnoId: string }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(cerrarTurno, null);
  const [montoStr, setMontoStr] = useState("");

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col sm:flex-row gap-3 max-w-lg">
      <input type="hidden" name="turnoId" value={turnoId} />
      <div className="flex-1">
        <label className="text-xs text-muted-foreground font-medium block mb-1">
          Monto contado (RD$)
        </label>
        <input
          type="number"
          name="montoCierre"
          min="0"
          step="0.01"
          value={montoStr}
          placeholder="0"
          required
          onChange={e => setMontoStr(e.target.value)}
          className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-muted-foreground font-medium block mb-1">
          Notas (opcional)
        </label>
        <input
          type="text"
          name="notas"
          placeholder="Observaciones del arqueo…"
          className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#dc2626", color: "#fff" }}
        >
          {isPending ? "Cerrando…" : "Cerrar turno"}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
