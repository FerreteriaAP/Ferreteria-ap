"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  avanzarCotizacion,
  crearConduce,
  facturarVenta,
  cancelarVenta,
  confirmarRecepcionConduce,
  type ItemRecepcion,
} from "@/actions/ventas";

interface DetalleResumen {
  productoId: string;
  nombre: string;
  unidad: string;
  cantidad: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ItemConduce = { productoId: string; nombre: string; unidad: string; cantEnviada: number; [k: string]: any };

interface ConduceResumen {
  id: string;
  numero: string;
  clienteRecibio: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detallesRecepcion: any; // null | ItemConduce[]
}

interface Props {
  ventaId: string;
  tipo: string;
  conduceId?: string;
  conduceRecibido: boolean;
  todosConducesEntregados?: boolean;
  conduces?: ConduceResumen[];
  detalles?: DetalleResumen[];
}

// Estilos de pill reutilizables
const PILL =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

// ─── Sub-componente: card de confirmación por conduce ───────────────────────
function ConduceConfirmCard({
  conduce, fallbackDetalles, onConfirmado,
}: {
  conduce: ConduceResumen;
  fallbackDetalles: DetalleResumen[];
  onConfirmado: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [isPending, start]        = useTransition();
  const [error, setError]         = useState<string | null>(null);

  // Items del conduce (detallesRecepcion) o todos los detalles como fallback
  const itemsBase: ItemConduce[] = Array.isArray(conduce.detallesRecepcion) && conduce.detallesRecepcion.length > 0
    ? conduce.detallesRecepcion
    : fallbackDetalles.map(d => ({ productoId: d.productoId, nombre: d.nombre, unidad: d.unidad, cantEnviada: d.cantidad }));

  const [items, setItems] = useState<Array<{ cantRecibida: number; devuelto: boolean; nota: string }>>(
    itemsBase.map(it => ({ cantRecibida: it.cantEnviada, devuelto: false, nota: "" }))
  );

  const actualizar = (i: number, campo: "cantRecibida" | "devuelto" | "nota", valor: number | boolean | string) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it));

  const confirmar = () => {
    setError(null);
    const payload: ItemRecepcion[] = itemsBase.map((base, i) => ({
      productoId:   base.productoId,
      nombre:       base.nombre,
      unidad:       base.unidad,
      cantEnviada:  base.cantEnviada,
      cantRecibida: items[i]?.devuelto ? 0 : (items[i]?.cantRecibida ?? base.cantEnviada),
      devuelto:     items[i]?.devuelto ?? false,
      nota:         items[i]?.nota || undefined,
    }));
    start(async () => {
      const res = await confirmarRecepcionConduce(conduce.id, payload);
      if ("error" in res && res.error) { setError(res.error as string); return; }
      onConfirmado();
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: "color-mix(in oklch, var(--accent-hex) 30%, var(--border))" }}>
      {/* Header conduce */}
      <div className="px-4 py-3 space-y-2"
        style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 6%, var(--card))" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-sm">{conduce.numero}</span>
          <span className="text-xs px-1.5 py-0.5 rounded border font-medium shrink-0"
            style={{ backgroundColor: "color-mix(in oklch, #ca8a04 8%, var(--card))", color: "#ca8a04", borderColor: "color-mix(in oklch, #ca8a04 30%, var(--border))" }}>
            Pendiente
          </span>
        </div>
        <button type="button" onClick={() => setExpandido(v => !v)}
          className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-accent text-center"
          style={{ color: "var(--accent-hex)", borderColor: "var(--accent-hex)" }}>
          {expandido ? "Ocultar" : "Confirmar recepcion"}
        </button>
      </div>

      {/* Items del conduce */}
      {!expandido && (
        <div className="px-4 py-2">
          {itemsBase.map((base, i) => (
            <div key={base.productoId || i} className="flex justify-between text-xs py-1 border-b last:border-0"
              style={{ color: "var(--muted-foreground)" }}>
              <span>{base.nombre}</span>
              <span className="font-mono tabular-nums">{Number(base.cantEnviada).toLocaleString("es-DO", { maximumFractionDigits: 4 })} {base.unidad}</span>
            </div>
          ))}
        </div>
      )}

      {/* Formulario de confirmación */}
      {expandido && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {itemsBase.map((base, i) => (
              <div key={base.productoId || i} className="rounded-lg border p-3 space-y-2 text-xs"
                style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-sm leading-tight">{base.nombre}</span>
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {Number(base.cantEnviada).toLocaleString("es-DO", { maximumFractionDigits: 4 })} {base.unidad}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Cant. recibida</Label>
                    <Input type="text" inputMode="decimal"
                      value={items[i]?.devuelto ? "0" : String(items[i]?.cantRecibida ?? base.cantEnviada)}
                      disabled={items[i]?.devuelto}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(",", "."));
                        if (!isNaN(v) && v >= 0) actualizar(i, "cantRecibida", v);
                        else if (e.target.value === "") actualizar(i, "cantRecibida", 0);
                      }}
                      className="h-7 text-right" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Nota (opcional)</Label>
                    <Input type="text" value={items[i]?.nota ?? ""}
                      onChange={(e) => actualizar(i, "nota", e.target.value)}
                      placeholder="ej. golpeado, faltante…" className="h-7" />
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                  <input type="checkbox" checked={items[i]?.devuelto ?? false}
                    onChange={(e) => actualizar(i, "devuelto", e.target.checked)}
                    className="h-3.5 w-3.5" />
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Devuelto / no recibido</span>
                </label>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={confirmar} disabled={isPending}
              className={PILL + " w-full justify-center"}
              style={{ backgroundColor: "color-mix(in oklch, #16a34a 12%, var(--card))", color: "#16a34a", borderColor: "color-mix(in oklch, #16a34a 35%, var(--border))" }}>
              {isPending ? "…" : "✓ Confirmar recepción"}
            </button>
            <button type="button" onClick={() => setExpandido(false)}
              className={PILL + " w-full justify-center"}
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export function AvanzarVentaButtons({
  ventaId, tipo, conduceId, conduceRecibido, todosConducesEntregados, conduces = [], detalles = [],
}: Props) {
  // Para el gate de factura: todos los conduces deben estar confirmados.
  // Si no hay conduces array, cae al valor de conduceRecibido (caso legacy).
  const puedeFacturar = conduces.length > 0
    ? (todosConducesEntregados ?? conduces.every(c => c.clienteRecibio))
    : (todosConducesEntregados ?? conduceRecibido);

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [mostrarConduce,   setMostrarConduce]   = useState(false);
  const [entregado,        setEntregado]         = useState("");
  const [recibido,         setRecibido]          = useState("");
  const [chofer,           setChofer]            = useState("");
  const [obsConduce,       setObsConduce]        = useState("");

  const [mostrarFactura,   setMostrarFactura]    = useState(false);
  const [ncf,              setNcf]               = useState("");
  const [tipoNcf,          setTipoNcf]           = useState("B02");

  const run = async (fn: () => Promise<{ error?: string; ok?: boolean; id?: string; numero?: string }>) => {
    setLoading(true);
    setError(null);
    const result = await fn();
    setLoading(false);
    if ("error" in result && result.error) { setError(result.error as string); return; }
    router.refresh();
  };

  // Conduces pendientes de confirmación
  const conducesPendientes = conduces.filter(c => !c.clienteRecibio);

  if (tipo === "CANCELADA" || tipo === "FACTURADA") return null;

  return (
    <div className="w-fit mx-auto flex flex-col gap-2.5">
      {error && (
        <p className="w-full text-xs rounded-lg border px-3 py-2"
          style={{
            backgroundColor: "color-mix(in oklch, var(--destructive) 8%, var(--card))",
            borderColor: "color-mix(in oklch, var(--destructive) 25%, var(--border))",
            color: "var(--destructive)",
          }}>
          {error}
        </p>
      )}

      {/* COTIZACION → Orden de Venta */}
      {tipo === "COTIZACION" && (
        <button
          onClick={() => run(() => avanzarCotizacion(ventaId))}
          disabled={loading}
          className={PILL + " w-full justify-center"}
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))",
            color: "var(--accent-hex)",
            borderColor: "var(--accent-hex)",
          }}
        >
          {loading ? "…" : "→ Convertir a Orden de Venta"}
        </button>
      )}

      {/* ORDEN_VENTA → Conduce */}
      {tipo === "ORDEN_VENTA" && !mostrarConduce && (
        <button
          onClick={() => setMostrarConduce(true)}
          className={PILL + " w-full justify-center"}
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))",
            color: "var(--accent-hex)",
            borderColor: "var(--accent-hex)",
          }}
        >
          → Crear Conduce
        </button>
      )}

      {/* Formulario conduce */}
      {tipo === "ORDEN_VENTA" && mostrarConduce && (
        <div
          className="w-full rounded-xl border p-4 space-y-3 text-sm"
          style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}
        >
          <p className="font-semibold text-sm">Datos del conduce</p>
          {[
            { label: "Entregado por", val: entregado, set: setEntregado },
            { label: "Recibido por",  val: recibido,  set: setRecibido  },
            { label: "Chofer",        val: chofer,    set: setChofer    },
          ].map(({ label, val, set }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input value={val} onChange={(e) => set(e.target.value)} className="h-8" placeholder="Nombre" />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Observaciones</Label>
            <Input value={obsConduce} onChange={(e) => setObsConduce(e.target.value)} className="h-8" />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => run(() => crearConduce(ventaId, {
                firmaEntregado: entregado  || undefined,
                firmaRecibido:  recibido   || undefined,
                firmaChofer:    chofer     || undefined,
                observaciones:  obsConduce || undefined,
              }))}
              disabled={loading}
              className={PILL + " w-full justify-center"}
              style={{
                backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))",
                color: "var(--accent-hex)",
                borderColor: "var(--accent-hex)",
              }}
            >
              {loading ? "…" : "✓ Confirmar conduce"}
            </button>
            <button
              onClick={() => setMostrarConduce(false)}
              className={PILL + " w-full justify-center"}
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* CONDUCE — confirmación por conduce (uno por uno) */}
      {tipo === "CONDUCE" && !puedeFacturar && conducesPendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold px-1" style={{ color: "var(--accent-hex)" }}>
            Confirmar recepción ({conducesPendientes.length} {conducesPendientes.length === 1 ? "conduce pendiente" : "conduces pendientes"})
          </p>
          {conducesPendientes.map(c => (
            <ConduceConfirmCard
              key={c.id}
              conduce={c}
              fallbackDetalles={detalles}
              onConfirmado={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Recepción confirmada */}
      {tipo === "CONDUCE" && puedeFacturar && (
        <p
          className="text-xs rounded-lg border px-3 py-2 font-medium"
          style={{
            backgroundColor: "color-mix(in oklch, #16a34a 8%, var(--card))",
            borderColor: "color-mix(in oklch, #16a34a 25%, var(--border))",
            color: "#16a34a",
          }}
        >
          ✓ Todos los conduces confirmados — ya puedes emitir la factura
        </p>
      )}

      {/* Emitir Factura (CONDUCE con recepción) */}
      {tipo === "CONDUCE" && puedeFacturar && !mostrarFactura && (
        <button
          onClick={() => setMostrarFactura(true)}
          className={PILL + " w-full justify-center"}
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))",
            color: "var(--accent-hex)",
            borderColor: "var(--accent-hex)",
          }}
        >
          → Emitir Factura
        </button>
      )}

      {/* Facturar sin conduce (ORDEN_VENTA) */}
      {tipo === "ORDEN_VENTA" && !mostrarFactura && (
        <button
          onClick={() => setMostrarFactura(true)}
          className={PILL + " w-full justify-center"}
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Facturar sin conduce
        </button>
      )}

      {/* Formulario factura */}
      {((tipo === "CONDUCE" && puedeFacturar) || tipo === "ORDEN_VENTA") && mostrarFactura && (
        <div
          className="w-full rounded-xl border p-4 space-y-3 text-sm"
          style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}
        >
          <p className="font-semibold text-sm">Datos de la factura</p>
          <div className="space-y-1">
            <Label className="text-xs">Tipo NCF</Label>
            <Select value={tipoNcf} onValueChange={(v) => setTipoNcf((v ?? "B02") as string)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B01">B01 — Crédito Fiscal</SelectItem>
                <SelectItem value="B02">B02 — Consumidor Final</SelectItem>
                <SelectItem value="B14">B14 — Régimen Especial</SelectItem>
                <SelectItem value="B15">B15 — Gubernamental</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">NCF</Label>
            <Input
              value={ncf}
              onChange={(e) => setNcf(e.target.value)}
              className="h-8 font-mono" placeholder="B020000000001"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => run(() => facturarVenta(ventaId, { ncf, tipoNcf }))}
              disabled={loading}
              className={PILL + " w-full justify-center"}
              style={{
                backgroundColor: "color-mix(in oklch, #16a34a 12%, var(--card))",
                color: "#16a34a",
                borderColor: "color-mix(in oklch, #16a34a 35%, var(--border))",
              }}
            >
              {loading ? "…" : "✓ Confirmar factura"}
            </button>
            <button
              onClick={() => setMostrarFactura(false)}
              className={PILL + " w-full justify-center"}
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cancelar documento */}
      {(tipo === "COTIZACION" || tipo === "ORDEN_VENTA") && (
        <>
          <div className="w-full border-t pt-2.5 mt-1" />
          <button
            onClick={() => {
              if (!confirm("¿Cancelar este documento?")) return;
              run(() => cancelarVenta(ventaId));
            }}
            disabled={loading}
            className={PILL + " w-full justify-center"}
            style={{
              backgroundColor: "color-mix(in oklch, var(--destructive) 12%, var(--card))",
              color: "var(--destructive)",
              borderColor: "var(--destructive)",
            }}
          >
            Cancelar documento
          </button>
        </>
      )}
    </div>
  );
}
