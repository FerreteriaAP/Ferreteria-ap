"use client";

import { useState } from "react";
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

interface Props {
  ventaId: string;
  tipo: string;
  conduceId?: string;
  conduceRecibido: boolean;
  todosConducesEntregados?: boolean;
  detalles?: DetalleResumen[];
}

// Estilos de pill reutilizables
const PILL =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function AvanzarVentaButtons({
  ventaId, tipo, conduceId, conduceRecibido, todosConducesEntregados, detalles = [],
}: Props) {
  // Para el gate de factura: todos los conduces deben estar confirmados.
  // Si no se pasa todosConducesEntregados, cae al valor de conduceRecibido (caso legacy sin conduces).
  const puedeFacturar = todosConducesEntregados ?? conduceRecibido;
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

  const [mostrarRecepcion, setMostrarRecepcion]  = useState(false);
  const [itemsRecepcion,   setItemsRecepcion]    = useState<
    Array<{ cantRecibida: number; devuelto: boolean; nota: string }>
  >([]);

  const abrirRecepcion = () => {
    setItemsRecepcion(detalles.map((d) => ({ cantRecibida: d.cantidad, devuelto: false, nota: "" })));
    setMostrarRecepcion(true);
  };

  const actualizarItem = (
    i: number,
    campo: "cantRecibida" | "devuelto" | "nota",
    valor: number | boolean | string,
  ) => {
    setItemsRecepcion((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)),
    );
  };

  const run = async (fn: () => Promise<{ error?: string; ok?: boolean; id?: string; numero?: string }>) => {
    setLoading(true);
    setError(null);
    const result = await fn();
    setLoading(false);
    if ("error" in result && result.error) { setError(result.error as string); return; }
    router.refresh();
  };

  const confirmarRecepcion = () => {
    if (!conduceId) return;
    const payload: ItemRecepcion[] = detalles.map((d, i) => ({
      productoId:  d.productoId,
      nombre:      d.nombre,
      unidad:      d.unidad,
      cantEnviada: d.cantidad,
      cantRecibida: itemsRecepcion[i]?.devuelto ? 0 : (itemsRecepcion[i]?.cantRecibida ?? d.cantidad),
      devuelto:    itemsRecepcion[i]?.devuelto ?? false,
      nota:        itemsRecepcion[i]?.nota || undefined,
    }));
    run(() => confirmarRecepcionConduce(conduceId, payload));
  };

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

      {/* CONDUCE — recepción pendiente (solo cuando hay exactamente 1 conduce sin confirmar) */}
      {tipo === "CONDUCE" && !puedeFacturar && !conduceRecibido && conduceId && !mostrarRecepcion && (
        <div
          className="w-full rounded-xl border p-4 space-y-3"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 6%, var(--card))",
            borderColor: "color-mix(in oklch, var(--accent-hex) 25%, var(--border))",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>
            Pendiente: confirmar recepción de mercancía
          </p>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            Obligatorio antes de emitir la factura. Revisa las cantidades recibidas.
          </p>
          <button
            onClick={abrirRecepcion}
            className={PILL + " w-full justify-center"}
            style={{
              backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))",
              color: "var(--accent-hex)",
              borderColor: "var(--accent-hex)",
            }}
          >
            Registrar recepción del cliente
          </button>
        </div>
      )}

      {/* Formulario recepción por ítem */}
      {tipo === "CONDUCE" && !puedeFacturar && !conduceRecibido && conduceId && mostrarRecepcion && (
        <div
          className="w-full rounded-xl border p-4 space-y-3"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 4%, var(--card))",
            borderColor: "color-mix(in oklch, var(--accent-hex) 20%, var(--border))",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>Recepción por producto</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {detalles.map((d, i) => {
              const item = itemsRecepcion[i] ?? { cantRecibida: d.cantidad, devuelto: false, nota: "" };
              return (
                <div
                  key={d.productoId}
                  className="rounded-lg border p-3 space-y-2 text-xs"
                  style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm leading-tight">{d.nombre}</span>
                    <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                      {d.cantidad} {d.unidad}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Cant. recibida</Label>
                      <Input
                        type="text" inputMode="decimal"
                        value={item.devuelto ? "0" : String(item.cantRecibida)}
                        disabled={item.devuelto}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(",", "."));
                          if (!isNaN(v) && v >= 0) actualizarItem(i, "cantRecibida", v);
                          else if (e.target.value === "") actualizarItem(i, "cantRecibida", 0);
                        }}
                        className="h-7 text-right"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Nota (opcional)</Label>
                      <Input
                        type="text" value={item.nota}
                        onChange={(e) => actualizarItem(i, "nota", e.target.value)}
                        placeholder="ej. golpeado, faltante…" className="h-7"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                    <input
                      type="checkbox" checked={item.devuelto}
                      onChange={(e) => actualizarItem(i, "devuelto", e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                      Devuelto / no recibido
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={confirmarRecepcion}
              disabled={loading}
              className={PILL + " w-full justify-center"}
              style={{
                backgroundColor: "color-mix(in oklch, #ca8a04 12%, var(--card))",
                color: "#ca8a04",
                borderColor: "color-mix(in oklch, #ca8a04 35%, var(--border))",
              }}
            >
              {loading ? "…" : "✓ Confirmar recepción"}
            </button>
            <button
              onClick={() => setMostrarRecepcion(false)}
              className={PILL + " w-full justify-center"}
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              Cancelar
            </button>
          </div>
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
