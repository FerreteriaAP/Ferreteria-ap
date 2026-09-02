"use client";

import { useState, useTransition } from "react";
import { upsertGastoFijo, deleteGastoFijo } from "@/actions/contabilidad";
import { useRouter } from "next/navigation";

interface GastoFijo {
  id: string;
  nombre: string;
  categoria: string;
  monto: number;
  activo: boolean;
  orden: number;
}

interface Props {
  gastosFijos: GastoFijo[];
  totalMensual: number;
}

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function GastosFijosClient({ gastosFijos, totalMensual }: Props) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [editando, setEditando] = useState<GastoFijo | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "", monto: "" });
  const [error, setError] = useState<string | null>(null);

  const abrirEditar = (g: GastoFijo) => {
    setNuevo(false);
    setEditando(g);
    setForm({ nombre: g.nombre, categoria: g.categoria, monto: String(g.monto) });
    setError(null);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setNuevo(true);
    setForm({ nombre: "", categoria: "", monto: "" });
    setError(null);
  };

  const cancelar = () => { setEditando(null); setNuevo(false); setError(null); };

  const guardar = () => {
    const monto = parseFloat(form.monto.replace(",", "."));
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    if (!form.categoria.trim()) { setError("La categoría es requerida"); return; }
    if (isNaN(monto) || monto <= 0) { setError("El monto debe ser mayor a 0"); return; }

    start(async () => {
      const res = await upsertGastoFijo({
        id: editando?.id,
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim(),
        monto,
      });
      if ("ok" in res && res.ok) {
        cancelar();
        router.refresh();
      }
    });
  };

  const toggleActivo = (g: GastoFijo) => {
    start(async () => {
      await upsertGastoFijo({ id: g.id, nombre: g.nombre, categoria: g.categoria, monto: g.monto, activo: !g.activo });
      router.refresh();
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este gasto fijo?")) return;
    start(async () => {
      await deleteGastoFijo(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Resumen total */}
      <div className="rounded-xl border px-5 py-4 flex items-center justify-between bg-card">
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total fijo mensual</p>
          <p className="text-2xl font-bold font-mono mt-1" style={{ color: "var(--accent-hex)" }}>{fmt(totalMensual)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Se aplica el día 10 de cada mes en las analíticas</p>
        </div>
        <button
          onClick={abrirNuevo}
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent-hex)" }}
        >
          + Agregar gasto fijo
        </button>
      </div>

      {/* Formulario nuevo / editar */}
      {(nuevo || editando) && (
        <div className="rounded-xl border p-5 space-y-4 bg-card">
          <h3 className="font-semibold text-sm">{editando ? "Editar gasto fijo" : "Nuevo gasto fijo"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Internet Claro"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Categoría</label>
              <input
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="Internet"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Monto mensual (RD$)</label>
              <input
                type="number"
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="2499.00"
                min="0.01"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={guardar}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--accent-hex)" }}
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={cancelar}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Monto/mes</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
              <th className="w-28 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {gastosFijos.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">Sin gastos fijos configurados</td></tr>
            )}
            {gastosFijos.map((g) => (
              <tr key={g.id} className={`hover:bg-muted/20 transition-colors ${!g.activo ? "opacity-50" : ""}`}>
                <td className="px-5 py-3 font-medium">{g.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{g.categoria}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{fmt(g.monto)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActivo(g)}
                    disabled={isPending}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      g.activo
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-400"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {g.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => abrirEditar(g)}
                      className="text-xs px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(g.id)}
                      disabled={isPending}
                      className="text-xs px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {gastosFijos.some(g => g.activo) && (
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td colSpan={2} className="px-5 py-3 font-bold text-sm">Total activos</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-sm">{fmt(totalMensual)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
