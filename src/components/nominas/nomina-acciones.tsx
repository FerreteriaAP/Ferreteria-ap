"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { procesarNomina, marcarNominaPagada, recalcularPrestamosNomina, eliminarNomina } from "@/actions/nominas";
import { BtnEliminarDocumento } from "@/components/shared/btn-eliminar-documento";
import { cn } from "@/lib/utils";

interface Props {
  nominaId: string;
  numero: string;
  estado: string;
}

const hoy = new Date().toISOString().split("T")[0];

const BTN_BASE =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function NominaAcciones({ nominaId, numero, estado }: Props) {
  const router   = useRouter();
  const [loading, setLoading]  = useState(false);
  const [syncing, setSyncing]  = useState(false);
  const [syncMsg, setSyncMsg]  = useState<string | null>(null);
  const [fechaPago, setFechaPago] = useState(hoy);

  const run = async (fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    setLoading(true);
    await fn();
    setLoading(false);
    router.refresh();
  };

  const syncPrestamos = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const res = await recalcularPrestamosNomina(nominaId);
    setSyncing(false);
    if ("error" in res && res.error) {
      setSyncMsg(`Error: ${res.error}`);
    } else if ("empleadosActualizados" in res) {
      setSyncMsg(`✓ Préstamos sincronizados (${res.empleadosActualizados} empleados)`);
      router.refresh();
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">

        {/* Sincronizar préstamos — disponible en BORRADOR y PROCESADA */}
        {estado !== "PAGADA" && (
          <button
            onClick={syncPrestamos}
            disabled={syncing || loading}
            title="Re-lee los préstamos de caja del período y actualiza la planilla"
            className={cn(BTN_BASE)}
            style={{
              color: "var(--muted-foreground)",
              borderColor: "var(--border)",
            }}
          >
            {syncing ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Sincronizando…
              </>
            ) : (
              "↻ Sincronizar préstamos"
            )}
          </button>
        )}

        {/* Procesar */}
        {estado === "BORRADOR" && (
          <button
            onClick={() => run(() => procesarNomina(nominaId))}
            disabled={loading}
            className={cn(BTN_BASE)}
            style={{
              backgroundColor: "color-mix(in oklch, #3b82f6 12%, var(--card))",
              color: "#3b82f6",
              borderColor: "color-mix(in oklch, #3b82f6 35%, var(--border))",
            }}
          >
            {loading ? "..." : "✓ Procesar nómina"}
          </button>
        )}

        {/* Marcar pagada */}
        {estado === "PROCESADA" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <button
              onClick={() => run(() => marcarNominaPagada(nominaId, fechaPago))}
              disabled={loading}
              className={cn(BTN_BASE)}
              style={{
                backgroundColor: "color-mix(in oklch, #16a34a 12%, var(--card))",
                color: "#16a34a",
                borderColor: "color-mix(in oklch, #16a34a 35%, var(--border))",
              }}
            >
              {loading ? "..." : "✓ Marcar pagada"}
            </button>
          </div>
        )}

        {/* Eliminar — solo BORRADOR */}
        {estado === "BORRADOR" && (
          <BtnEliminarDocumento
            id={nominaId}
            documento={numero}
            accion={eliminarNomina}
            label="Eliminar"
          />
        )}
      </div>

      {/* Mensaje de sincronización */}
      {syncMsg && (
        <p
          className="text-xs font-medium px-3 py-1.5 rounded-lg border"
          style={{
            backgroundColor: syncMsg.startsWith("✓")
              ? "color-mix(in oklch, #16a34a 8%, var(--card))"
              : "color-mix(in oklch, var(--destructive) 8%, var(--card))",
            borderColor: syncMsg.startsWith("✓")
              ? "color-mix(in oklch, #16a34a 25%, var(--border))"
              : "color-mix(in oklch, var(--destructive) 25%, var(--border))",
            color: syncMsg.startsWith("✓") ? "#16a34a" : "var(--destructive)",
          }}
        >
          {syncMsg}
        </p>
      )}
    </div>
  );
}
