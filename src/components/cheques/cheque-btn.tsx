"use client";

import { useState } from "react";
import { marcarChequeEntregado, dismissAlertaCheque, marcarChequeListo, desmarcarChequeListo } from "@/actions/cheques";

// ── Botón: Marcar entregado (vendedor/asistente) ──────────────────────────────

export function ChequeEntregadoBtn({ contactoId, nombre }: { contactoId: string; nombre: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span className="text-xs font-medium px-3 py-1 rounded-full"
        style={{ backgroundColor: "#16a34a22", color: "#16a34a" }}>
        ✓ Marcado
      </span>
    );
  }

  return (
    <button
      disabled={loading}
      onClick={async () => {
        if (!window.confirm(`¿Confirmas que el cheque de ${nombre} fue entregado?`)) return;
        setLoading(true);
        await marcarChequeEntregado(contactoId);
        setDone(true);
        setLoading(false);
      }}
      className="text-xs font-semibold px-3 py-1 rounded-full border transition-colors disabled:opacity-50"
      style={{ borderColor: "#16a34a", color: "#16a34a" }}
    >
      {loading ? "…" : "Marcar entregado"}
    </button>
  );
}

// ── Botón: Dismiss alerta (admin) ─────────────────────────────────────────────

export function DismissAlertaBtn({ alertaId }: { alertaId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await dismissAlertaCheque(alertaId);
        setDone(true);
        setLoading(false);
      }}
      title="Marcar como visto"
      className="text-xs px-2 py-1 rounded border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {loading ? "…" : "✓ Visto"}
    </button>
  );
}

// ── Botón: Marcar/desmarcar cheque listo (admin — en perfil de suplidor) ───────

export function ChequeSupllidorBtn({
  contactoId,
  nombre,
  chequeListo,
}: {
  contactoId: string;
  nombre: string;
  chequeListo: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [activo, setActivo] = useState(chequeListo);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        if (activo) {
          if (!window.confirm(`¿Desmarcar cheque de ${nombre}? Ya no aparecerá en la lista.`)) return;
          setLoading(true);
          await desmarcarChequeListo(contactoId);
        } else {
          if (!window.confirm(`¿Marcar cheque de ${nombre} como listo para entrega?`)) return;
          setLoading(true);
          await marcarChequeListo(contactoId);
        }
        setActivo(v => !v);
        setLoading(false);
      }}
      className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors disabled:opacity-50"
      style={
        activo
          ? { backgroundColor: "#16a34a22", borderColor: "#16a34a", color: "#16a34a" }
          : { borderColor: "var(--border)", color: "var(--foreground)" }
      }
    >
      {loading ? "…" : activo ? "✓ Cheque listo — Desmarcar" : "Marcar cheque listo"}
    </button>
  );
}
