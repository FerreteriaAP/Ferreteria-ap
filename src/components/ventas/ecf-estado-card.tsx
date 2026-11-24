"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitirEcfVenta, reemitirEcf, reintentarEcf } from "@/actions/ecf";

const LABEL: Record<string, string> = {
  firmado: "Firmado (enviando a la DGII)",
  en_proceso: "En proceso en la DGII",
  aceptado: "Aceptado por la DGII",
  aceptado_condicional: "Aceptado condicional",
  pendiente_envio: "Pendiente de envío (sin conexión con la DGII)",
  verificar: "Verificar: se cortó la comunicación después de enviar",
  rechazado: "Rechazado por la DGII",
  error_interno: "Error del conector",
};

function color(estado: string | null) {
  if (estado === "aceptado" || estado === "aceptado_condicional") return "#16a34a";
  if (estado === "rechazado" || estado === "error_interno" || !estado) return "#dc2626";
  return "#ca8a04";
}

export function EcfEstadoCard({ ventaId, ecf }: {
  ventaId: string;
  ecf: {
    ecfEncf: string | null; ecfEstado: string | null; ecfError: string | null;
    ecfMensajes: unknown; ecfQrUrl: string | null; ecfCodigoSeguridad: string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const accion = (fn: () => Promise<{ error?: string } | object>) => start(async () => {
    setMsg(null);
    const r = await fn();
    if ("error" in r && r.error) setMsg(r.error);
    router.refresh();
  });

  const c = color(ecf.ecfEncf ? ecf.ecfEstado : null);
  const mensajes = Array.isArray(ecf.ecfMensajes) ? ecf.ecfMensajes : [];
  const btn = "text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50";

  return (
    <div className="rounded-xl border p-4 space-y-2 text-sm" style={{ backgroundColor: `color-mix(in oklch, ${c} 6%, var(--card))`, borderColor: `color-mix(in oklch, ${c} 30%, var(--border))` }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Comprobante electrónico</p>
      {ecf.ecfEncf ? (
        <>
          <p className="font-mono font-bold">{ecf.ecfEncf}</p>
          <p className="text-xs font-semibold" style={{ color: c }}>{LABEL[ecf.ecfEstado ?? ""] ?? ecf.ecfEstado}</p>
          {ecf.ecfCodigoSeguridad && <p className="text-xs">Código de seguridad: <span className="font-mono">{ecf.ecfCodigoSeguridad}</span></p>}
        </>
      ) : (
        <p className="text-xs font-semibold" style={{ color: c }}>Esta factura no tiene e-CF todavía.</p>
      )}
      {ecf.ecfError && <p className="text-xs" style={{ color: "#dc2626" }}>{ecf.ecfError}</p>}
      {mensajes.length > 0 && (
        <ul className="text-xs list-disc pl-4" style={{ color: "var(--muted-foreground)" }}>
          {mensajes.map((m, i) => <li key={i}>{typeof m === "string" ? m : JSON.stringify(m)}</li>)}
        </ul>
      )}
      {msg && <p className="text-xs" style={{ color: "#dc2626" }}>{msg}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {!ecf.ecfEncf && (
          <button className={btn} disabled={pending} onClick={() => accion(() => emitirEcfVenta(ventaId))}>
            {pending ? "…" : "Emitir e-CF"}
          </button>
        )}
        {ecf.ecfEncf && (ecf.ecfEstado === "pendiente_envio" || ecf.ecfEstado === "verificar") && (
          <button className={btn} disabled={pending}
            onClick={() => {
              if (ecf.ecfEstado === "verificar" && !confirm("Antes de reintentar, abre el QR y confirma que la DGII NO tiene este comprobante. ¿Reintentar?")) return;
              accion(() => reintentarEcf("venta", ventaId));
            }}>
            {pending ? "…" : "Reintentar envío"}
          </button>
        )}
        {ecf.ecfEncf && (ecf.ecfEstado === "rechazado" || ecf.ecfEstado === "error_interno") && (
          <button className={btn} disabled={pending}
            onClick={() => {
              if (!confirm("Se asignará un e-NCF NUEVO con los datos actuales de la factura. Después hay que reimprimirla. ¿Continuar?")) return;
              accion(() => reemitirEcf("venta", ventaId));
            }}>
            {pending ? "…" : "Reemitir con e-NCF nuevo"}
          </button>
        )}
        {ecf.ecfQrUrl && (
          <a className={btn} href={ecf.ecfQrUrl} target="_blank" rel="noopener noreferrer">Consultar en la DGII</a>
        )}
      </div>
    </div>
  );
}
