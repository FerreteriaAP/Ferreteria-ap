"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivarProducto, eliminarProducto, reactivarProducto } from "@/actions/productos";

interface Props {
  productoId: string;
  nombreProducto: string;
  activo: boolean;
}

export function BtnArchivarProducto({ productoId, nombreProducto, activo }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"archivar" | "eliminar">("archivar");
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const abrirModal = (m: "archivar" | "eliminar") => {
    setModo(m);
    setError(null);
    setOpen(true);
  };

  const reactivar = () => {
    start(async () => {
      await reactivarProducto(productoId);
      router.refresh();
    });
  };

  const confirmar = () => {
    setError(null);
    start(async () => {
      if (modo === "archivar") {
        await archivarProducto(productoId);
        router.push("/productos");
      } else {
        const res = await eliminarProducto(productoId);
        if ("error" in res && res.error) {
          setError(res.error as string);
          return;
        }
        router.push("/productos");
      }
    });
  };

  return (
    <>
      {/* Botones */}
      <div className="flex gap-2 flex-wrap">
        {activo ? (
          <button
            type="button"
            onClick={() => abrirModal("archivar")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
              text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700
              hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            Archivar
          </button>
        ) : (
          <button
            type="button"
            onClick={reactivar}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
              text-green-700 dark:text-green-400 border-green-300 dark:border-green-700
              hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
          >
            {isPending ? "Reactivando…" : "↩ Reactivar"}
          </button>
        )}
        <button
          type="button"
          onClick={() => abrirModal("eliminar")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
            text-red-700 dark:text-red-400 border-red-300 dark:border-red-700
            hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Eliminar
        </button>
      </div>

      {/* Modal de confirmación */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold">
              {modo === "archivar" ? "¿Archivar producto?" : "¿Eliminar producto?"}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {modo === "archivar" ? (
                <>
                  El producto <strong className="text-foreground">{nombreProducto}</strong> quedará
                  inactivo y no aparecerá en el inventario ni en ventas nuevas.
                  El historial se conserva y puede reactivarse editando el campo <em>Activo</em>.
                </>
              ) : (
                <>
                  Se eliminará <strong className="text-foreground">{nombreProducto}</strong> de forma
                  permanente. Solo es posible si el producto no tiene ventas, compras ni movimientos
                  de inventario registrados.
                </>
              )}
            </p>

            {error && (
              <div className="rounded-lg px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={isPending}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                  modo === "archivar"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isPending ? "Procesando…" : modo === "archivar" ? "Sí, archivar" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
