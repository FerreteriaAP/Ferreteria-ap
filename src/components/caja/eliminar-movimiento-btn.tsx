"use client";

import { useTransition } from "react";
import { eliminarMovimientoCaja } from "@/actions/caja";

interface Props {
  movimientoId: string;
  concepto: string;
}

export function EliminarMovimientoBtn({ movimientoId, concepto }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar el movimiento "${concepto}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await eliminarMovimientoCaja(movimientoId);
      if (res.error) alert(res.error);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Eliminar movimiento"
      className="ml-2 text-destructive hover:text-destructive/70 disabled:opacity-40 transition-colors"
    >
      {pending ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      )}
    </button>
  );
}
