"use client";

import { useTransition } from "react";
import { aprobarSolicitudSinStock, rechazarSolicitudSinStock } from "@/actions/solicitudes-sin-stock";

export function SolicitudStockBtns({ solicitudId }: { solicitudId: string }) {
  const [isPendingA, startA] = useTransition();
  const [isPendingR, startR] = useTransition();

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        disabled={isPendingA || isPendingR}
        onClick={() => startA(async () => { await aprobarSolicitudSinStock(solicitudId); })}
        className="text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-900/60 disabled:opacity-50"
      >
        {isPendingA ? "…" : "✓ Aprobar"}
      </button>
      <button
        disabled={isPendingA || isPendingR}
        onClick={() => startR(async () => { await rechazarSolicitudSinStock(solicitudId); })}
        className="text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/60 disabled:opacity-50"
      >
        {isPendingR ? "…" : "✗ Rechazar"}
      </button>
    </div>
  );
}
