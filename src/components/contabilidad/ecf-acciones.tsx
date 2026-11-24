"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitirEcfNotaCredito, emitirEcfVenta, reemitirEcf, reintentarEcf, sincronizarEcf } from "@/actions/ecf";

const BTN = "text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50";

export function EcfAcciones({ tipo, id, encf, estado }: {
  tipo: "venta" | "nc"; id: string; encf: string | null; estado: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<object>) => start(async () => {
    setMsg(null);
    const r = await fn();
    if ("error" in r && r.error) setMsg(String(r.error));
    router.refresh();
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        {!encf && (
          <button className={BTN} disabled={pending}
            onClick={() => run(() => (tipo === "venta" ? emitirEcfVenta(id) : emitirEcfNotaCredito(id)))}>
            Emitir e-CF
          </button>
        )}
        {encf && (estado === "pendiente_envio" || estado === "verificar") && (
          <button className={BTN} disabled={pending}
            onClick={() => {
              if (estado === "verificar" && !confirm("Antes de reintentar, abre el QR y confirma que la DGII NO tiene este comprobante. ¿Reintentar?")) return;
              run(() => reintentarEcf(tipo, id));
            }}>
            Reintentar
          </button>
        )}
        {encf && (estado === "rechazado" || estado === "error_interno") && (
          <button className={BTN} disabled={pending}
            onClick={() => {
              if (!confirm("Se asignará un e-NCF NUEVO con los datos actuales. Después hay que reimprimir. ¿Continuar?")) return;
              run(() => reemitirEcf(tipo, id));
            }}>
            Reemitir
          </button>
        )}
      </div>
      {msg && <p className="text-xs max-w-xs text-right" style={{ color: "#dc2626" }}>{msg}</p>}
    </div>
  );
}

export function EcfSincronizarBtn() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{msg}</span>}
      <button className={BTN} disabled={pending}
        onClick={() => start(async () => {
          const r = await sincronizarEcf();
          setMsg("error" in r ? String(r.error) : `Revisados ${r.revisados}, actualizados ${r.actualizados}${r.errores.length ? `, ${r.errores.length} con error` : ""}`);
          router.refresh();
        })}>
        {pending ? "Sincronizando…" : "Sincronizar con la DGII"}
      </button>
    </div>
  );
}
