"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { enviarOrdenCompra, cancelarOrdenCompra } from "@/actions/ordenes-compra";

interface Props {
  id: string;
  canSend: boolean;
  canReceive: boolean;
  canCancel: boolean;
}

export function OcActions({ id, canSend, canReceive, canCancel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function handleEnviar() {
    setLoading("enviar");
    setError(null);
    const res = await enviarOrdenCompra(id);
    setLoading(null);
    if ("error" in res) {
      setError(typeof res.error === "string" ? res.error : "Error al enviar");
    } else {
      router.refresh();
    }
  }

  async function handleCancelar() {
    if (!confirm("¿Cancelar esta orden de compra? Esta acción no se puede revertir.")) return;
    setLoading("cancelar");
    setError(null);
    const res = await cancelarOrdenCompra(id);
    setLoading(null);
    if ("error" in res) {
      setError(typeof res.error === "string" ? res.error : "Error al cancelar");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded">{error}</p>
      )}

      <div className="flex gap-2 flex-wrap justify-end">

        {/* Marcar como enviada — pill azul outline */}
        {canSend && (
          <button
            onClick={handleEnviar}
            disabled={loading === "enviar"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors disabled:opacity-60"
            style={{ borderColor: "#3b82f6", color: "#3b82f6", backgroundColor: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "color-mix(in oklch, #3b82f6 8%, transparent)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {loading === "enviar" ? "Enviando…" : "✉ Marcar como enviada"}
          </button>
        )}

        {/* Confirmar recepción — pill verde outline */}
        {canReceive && (
          <Link
            href={`/ordenes-compra/${id}/recibir`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors"
            style={{ borderColor: "#22c55e", color: "#22c55e", backgroundColor: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "color-mix(in oklch, #22c55e 8%, transparent)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            ✓ Confirmar recepción
          </Link>
        )}

        {/* Cancelar orden — pill rojo outline */}
        {canCancel && (
          <button
            onClick={handleCancelar}
            disabled={loading === "cancelar"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors disabled:opacity-60"
            style={{ borderColor: "#ef4444", color: "#ef4444", backgroundColor: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "color-mix(in oklch, #ef4444 8%, transparent)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {loading === "cancelar" ? "Cancelando…" : "✕ Cancelar orden"}
          </button>
        )}

      </div>
    </div>
  );
}
