"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Check, X, ShieldAlert } from "lucide-react";
import { adminEditarDetalle, adminEliminarDetalle, adminAgregarDetalle } from "@/actions/ventas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmtDOP = (n: number | string) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Detalle {
  id: string;
  productoId: string;
  descripcion?: string | null;
  producto: { nombre: string; codigo: string; unidadMedida: string };
  cantidad: number | string;
  precioFinal: number | string;
  descuento: number | string;
  subtotal: number | string;
  itbis: number | string;
  unidad?: string | null;
}

interface Props {
  ventaId: string;
  detalles: Detalle[];
}

// ─── Fila editable ────────────────────────────────────────────────────────────

function FilaEditable({ d, onSaved }: { d: Detalle; onSaved: () => void }) {
  const [editando, setEditando] = useState(false);
  const [cantidad, setCantidad]     = useState(String(Number(d.cantidad)));
  const [precio, setPrecio]         = useState(String(Number(d.precioFinal)));
  const [descuento, setDescuento]   = useState(String(Number(d.descuento ?? 0)));
  const [error, setError]           = useState("");
  const [pending, startTransition]  = useTransition();

  const guardar = () => {
    const cant = parseFloat(cantidad);
    const prec = parseFloat(precio);
    const desc = parseFloat(descuento) || 0;
    if (isNaN(cant) || cant <= 0) { setError("Cantidad inválida"); return; }
    if (isNaN(prec) || prec < 0)  { setError("Precio inválido");   return; }
    setError("");
    startTransition(async () => {
      const res = await adminEditarDetalle({ detalleId: d.id, cantidad: cant, precioFinal: prec, descuento: desc });
      if (res?.error) { setError(res.error); return; }
      setEditando(false);
      onSaved();
    });
  };

  const cancelar = () => {
    setCantidad(String(Number(d.cantidad)));
    setPrecio(String(Number(d.precioFinal)));
    setDescuento(String(Number(d.descuento ?? 0)));
    setError("");
    setEditando(false);
  };

  const eliminar = () => {
    if (!confirm(`¿Eliminar "${d.descripcion || d.producto.nombre}" de este documento?`)) return;
    startTransition(async () => {
      const res = await adminEliminarDetalle(d.id);
      if (res?.error) { setError(res.error); return; }
      onSaved();
    });
  };

  const unidad = d.unidad ?? d.producto.unidadMedida;

  return (
    <tr className={cn("border-b transition-colors", editando ? "bg-yellow-500/5" : "hover:bg-muted/20")}>
      {/* Producto */}
      <td className="px-4 py-3">
        <p className="font-medium text-sm">{d.descripcion || d.producto.nombre}</p>
        <p className="text-xs text-muted-foreground font-mono">{d.producto.codigo}</p>
      </td>

      {/* Cantidad */}
      <td className="px-4 py-3 text-right">
        {editando ? (
          <Input
            type="number"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            className="w-28 text-right h-8 text-sm ml-auto"
            step="any"
            min="0.001"
          />
        ) : (
          <span className="font-mono text-sm">{Number(d.cantidad).toLocaleString("es-DO")} <span className="text-xs text-muted-foreground">{unidad}</span></span>
        )}
      </td>

      {/* Precio */}
      <td className="px-4 py-3 text-right">
        {editando ? (
          <Input
            type="number"
            value={precio}
            onChange={e => setPrecio(e.target.value)}
            className="w-28 text-right h-8 text-sm ml-auto"
            step="any"
            min="0"
          />
        ) : (
          <span className="font-mono text-sm">{fmtDOP(d.precioFinal)}</span>
        )}
      </td>

      {/* Descuento */}
      <td className="px-4 py-3 text-right">
        {editando ? (
          <Input
            type="number"
            value={descuento}
            onChange={e => setDescuento(e.target.value)}
            className="w-20 text-right h-8 text-sm ml-auto"
            step="0.01"
            min="0"
            max="100"
            placeholder="0"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {Number(d.descuento) > 0 ? `${Number(d.descuento).toFixed(1)}%` : "—"}
          </span>
        )}
      </td>

      {/* Subtotal */}
      <td className="px-4 py-3 text-right font-mono text-sm">
        {fmtDOP(d.subtotal)}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 text-right">
        {editando ? (
          <div className="flex items-center gap-1 justify-end">
            {error && <span className="text-xs text-destructive mr-2">{error}</span>}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={guardar} disabled={pending}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelar} disabled={pending}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-yellow-600" onClick={() => setEditando(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={eliminar} disabled={pending}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Fila para agregar nueva línea ───────────────────────────────────────────

function FilaNueva({ ventaId, onSaved }: { ventaId: string; onSaved: () => void }) {
  const [productoId, setProductoId] = useState("");
  const [codigo, setCodigo]         = useState("");
  const [cantidad, setCantidad]     = useState("");
  const [precio, setPrecio]         = useState("");
  const [descuento, setDescuento]   = useState("0");
  const [unidad, setUnidad]         = useState("");
  const [error, setError]           = useState("");
  const [pending, startTransition]  = useTransition();

  const buscarProducto = async () => {
    if (!codigo.trim()) return;
    try {
      const res = await fetch(`/api/productos/buscar?codigo=${encodeURIComponent(codigo.trim())}`);
      const data = await res.json();
      if (data?.id) {
        setProductoId(data.id);
        setPrecio(String(data.precioVenta ?? ""));
        setUnidad(data.unidadMedida ?? "");
        setError("");
      } else {
        setError("Producto no encontrado");
        setProductoId("");
      }
    } catch {
      setError("Error buscando producto");
    }
  };

  const guardar = () => {
    if (!productoId) { setError("Busca el producto primero (Enter en el campo Código)"); return; }
    const cant = parseFloat(cantidad);
    const prec = parseFloat(precio);
    const desc = parseFloat(descuento) || 0;
    if (isNaN(cant) || cant <= 0) { setError("Cantidad inválida"); return; }
    if (isNaN(prec) || prec < 0)  { setError("Precio inválido");   return; }
    setError("");
    startTransition(async () => {
      const res = await adminAgregarDetalle({ ventaId, productoId, cantidad: cant, precioFinal: prec, descuento: desc, unidad: unidad || undefined });
      if (res?.error) { setError(res.error); return; }
      setCodigo(""); setProductoId(""); setCantidad(""); setPrecio(""); setDescuento("0"); setUnidad("");
      onSaved();
    });
  };

  return (
    <tr className="border-b bg-blue-500/5">
      <td className="px-4 py-2">
        <Input
          placeholder="Código producto"
          value={codigo}
          onChange={e => { setCodigo(e.target.value); setProductoId(""); }}
          onKeyDown={e => { if (e.key === "Enter") buscarProducto(); }}
          onBlur={buscarProducto}
          className="h-8 text-sm w-full"
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <Input type="number" placeholder="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)} className="h-8 text-sm w-28 ml-auto" step="any" min="0.001" />
      </td>
      <td className="px-4 py-2">
        <Input type="number" placeholder="Precio" value={precio} onChange={e => setPrecio(e.target.value)} className="h-8 text-sm w-28 ml-auto" step="any" min="0" />
      </td>
      <td className="px-4 py-2">
        <Input type="number" placeholder="0" value={descuento} onChange={e => setDescuento(e.target.value)} className="h-8 text-sm w-20 ml-auto" step="0.01" min="0" max="100" />
      </td>
      <td className="px-4 py-2 text-right text-xs text-muted-foreground">
        {precio && cantidad ? fmtDOP(parseFloat(precio) * parseFloat(cantidad) * (1 - (parseFloat(descuento) || 0) / 100)) : "—"}
      </td>
      <td className="px-4 py-2 text-right">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={guardar} disabled={pending || !productoId}>
          <Check className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function AdminEditarDetalles({ ventaId, detalles }: Props) {
  const [abierto, setAbierto]     = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [key, setKey]             = useState(0); // fuerza re-render tras cambios

  const refresh = () => setKey(k => k + 1);

  if (!abierto) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-yellow-600 border-yellow-500/40 hover:bg-yellow-500/10"
          onClick={() => setAbierto(true)}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Edición admin
        </Button>
      </div>
    );
  }

  return (
    <div key={key} className="rounded-xl border border-yellow-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-sm font-semibold">Modo edición — Administrador</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setAgregando(a => !a)}
          >
            <Plus className="h-3 w-3" />
            Agregar línea
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
              <th className="text-left px-4 py-2">Producto</th>
              <th className="text-right px-4 py-2">Cantidad</th>
              <th className="text-right px-4 py-2">Precio unit.</th>
              <th className="text-right px-4 py-2">Desc. %</th>
              <th className="text-right px-4 py-2">Subtotal</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {detalles.map(d => (
              <FilaEditable key={d.id} d={d} onSaved={refresh} />
            ))}
            {agregando && (
              <FilaNueva ventaId={ventaId} onSaved={() => { setAgregando(false); refresh(); }} />
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground px-4 py-2 border-t">
        Los cambios se aplican inmediatamente y recalculan los totales del documento.
      </p>
    </div>
  );
}
