"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pagarMultiplesCxC } from "@/actions/contabilidad";

interface Props {
  cxcId:    string;
  ventaId?: string | null;
  numero:   string;
  saldo:    number;
  cliente:  string;
}

const METODOS = [
  { value: "EFECTIVO",      label: "Efectivo",       icon: "💵" },
  { value: "TRANSFERENCIA", label: "Transferencia",   icon: "🏦" },
  { value: "TARJETA",       label: "Tarjeta",         icon: "💳" },
  { value: "CHEQUE",        label: "Cheque",          icon: "📝" },
] as const;

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CobrarCxcBtn({ cxcId, ventaId, numero, saldo, cliente }: Props) {
  const router    = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();

  const hoy = new Date().toISOString().split("T")[0];
  const [monto,     setMonto]     = useState("");
  const [metodo,    setMetodo]    = useState<string>("EFECTIVO");
  const [fecha,     setFecha]     = useState(hoy);
  const [referencia,setReferencia]= useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [ok,        setOk]        = useState(false);

  const montoNum = parseFloat(monto.replace(",", ".")) || 0;

  function handleOpen() {
    setMonto("");
    setMetodo("EFECTIVO");
    setFecha(hoy);
    setReferencia("");
    setError(null);
    setOk(false);
    setOpen(true);
  }

  function handleExacto() {
    setMonto(saldo.toFixed(2));
  }

  function handleSubmit() {
    if (!monto || montoNum <= 0) { setError("Ingresa el monto a cobrar"); return; }
    if (montoNum > saldo + 0.01)  { setError(`El monto no puede superar el saldo (${fmt(saldo)})`); return; }
    if (!fecha) { setError("Selecciona la fecha"); return; }

    setError(null);
    start(async () => {
      const res = await pagarMultiplesCxC(
        [{ cxcId, ventaId, monto: montoNum }],
        metodo,
        fecha,
        referencia || undefined,
      );
      if ("error" in res && res.error) { setError(res.error); return; }
      setOk(true);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1000);
    });
  }

  return (
    <>
      {/* Botón compacto en la tabla */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:brightness-110 active:scale-95"
        style={{
          background: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
          color: "var(--accent-hex)",
          border: "1px solid color-mix(in oklch, var(--accent-hex) 35%, transparent)",
        }}
      >
        Cobrar
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-sm">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-bold text-base">Registrar cobro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{cliente}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >×</button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">

              {/* Info factura */}
              <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-hex)" }}>
                  {numero}
                </span>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                  <p className="font-bold text-base">{fmt(saldo)}</p>
                </div>
              </div>

              {/* Monto + botón Exacto */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                  Monto a cobrar
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monto}
                    onChange={e => { setMonto(e.target.value); setError(null); }}
                    placeholder="0.00"
                    className="flex-1 h-10 rounded-lg border bg-background px-3 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleExacto}
                    className="px-3 h-10 rounded-lg text-xs font-bold border transition-all hover:brightness-110"
                    style={{
                      background: "color-mix(in oklch, var(--accent-hex) 15%, transparent)",
                      color: "var(--accent-hex)",
                      border: "1px solid color-mix(in oklch, var(--accent-hex) 30%, transparent)",
                    }}
                  >
                    Exacto
                  </button>
                </div>
                {montoNum > 0 && montoNum < saldo - 0.01 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Abono parcial — quedará pendiente {fmt(saldo - montoNum)}
                  </p>
                )}
              </div>

              {/* Método de pago */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                  Forma de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {METODOS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMetodo(m.value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all"
                      style={metodo === m.value ? {
                        background: "color-mix(in oklch, var(--accent-hex) 18%, transparent)",
                        borderColor: "var(--accent-hex)",
                        color: "var(--accent-hex)",
                      } : undefined}
                    >
                      <span>{m.icon}</span>{m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                  Fecha del cobro
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Referencia (opcional) */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                  Referencia <span className="font-normal normal-case">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  placeholder="No. cheque, transferencia, etc."
                  className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Éxito */}
              {ok && (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-lg px-3 py-2.5">
                  <span className="text-base">✓</span>
                  <p className="text-sm font-semibold">Cobro registrado correctamente</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {!ok && (
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !monto || montoNum <= 0}
                  className="flex-1 h-10 rounded-lg text-sm font-bold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "var(--accent-hex)", color: "white" }}
                >
                  {isPending ? "Registrando…" : `Cobrar ${montoNum > 0 ? fmt(montoNum) : ""}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
