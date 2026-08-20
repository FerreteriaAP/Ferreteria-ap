"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleUsuario } from "@/actions/usuarios";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { cn } from "@/lib/utils";

type Usuario = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  activo: boolean;
  createdAt: Date;
  empleado: { nombre: string; apellido: string } | null;
};

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ASISTENTE_ADMINISTRATIVO: "Asistente Adm.",
  VENDEDOR: "Vendedor",
  CAJA: "Caja",
};

const ROL_STYLE: Record<string, { bg: string; text: string }> = {
  ADMINISTRADOR:            { bg: "color-mix(in oklch, #ef4444 12%, var(--card))", text: "#ef4444" },
  ASISTENTE_ADMINISTRATIVO: { bg: "color-mix(in oklch, #3b82f6 12%, var(--card))", text: "#3b82f6" },
  VENDEDOR:                 { bg: "color-mix(in oklch, #16a34a 12%, var(--card))", text: "#16a34a" },
  CAJA:                     { bg: "color-mix(in oklch, var(--accent-hex) 12%, var(--card))", text: "var(--accent-hex)" },
};

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

export function UsuariosPanel({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, startToggle] = useTransition();
  // Optimistic toggle: guardamos el estado anticipado mientras espera el servidor
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  function handleToggle(id: string, currentActivo: boolean) {
    setOptimistic((prev) => ({ ...prev, [id]: !currentActivo }));
    startToggle(async () => {
      await toggleUsuario(id);
      router.refresh();
      // Limpiamos el override optimista una vez lleguen los datos frescos
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });
  }

  // Mezcla datos del servidor con estados optimistas
  const display = usuarios.map((u) =>
    u.id in optimistic ? { ...u, activo: optimistic[u.id] } : u
  );

  return (
    <div className="space-y-4">
      {/* Tabla */}
      {display.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>
          Sin usuarios registrados
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                <th className="text-left py-2.5 pr-3 font-medium">Nombre</th>
                <th className="text-left py-2.5 pr-3 font-medium hidden sm:table-cell">Correo</th>
                <th className="text-left py-2.5 pr-3 font-medium">Rol</th>
                <th className="text-center py-2.5 pr-3 font-medium">Estado</th>
                <th className="text-right py-2.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {display.map((u) => {
                const rs = ROL_STYLE[u.rol] ?? { bg: "var(--card)", text: "var(--muted-foreground)" };
                return (
                  <tr
                    key={u.id}
                    className={cn("transition-colors", !u.activo && "opacity-50")}
                  >
                    <td className="py-3 pr-3">
                      <p className="font-medium text-sm leading-tight">
                        {u.nombre} {u.apellido}
                      </p>
                      {u.empleado && (
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                          {u.empleado.nombre} {u.empleado.apellido}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs font-mono hidden sm:table-cell" style={{ color: "var(--muted-foreground)" }}>
                      {u.email}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                        style={{ backgroundColor: rs.bg, color: rs.text }}
                      >
                        {ROL_LABELS[u.rol] ?? u.rol}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: u.activo
                            ? "color-mix(in oklch, #16a34a 10%, var(--card))"
                            : "color-mix(in oklch, var(--foreground) 6%, var(--card))",
                          color: u.activo ? "#16a34a" : "var(--muted-foreground)",
                        }}
                      >
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/usuarios/${u.id}`}
                          className="text-xs px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggle(u.id, u.activo)}
                          disabled={pending}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50",
                            u.activo
                              ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                              : "border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                          )}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {showForm ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: CARD_BG }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ backgroundColor: HEADER_BG }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <p className="text-sm font-semibold">Nuevo usuario</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs px-2 py-1 rounded hover:bg-accent transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cancelar
            </button>
          </div>
          <div className="p-4">
            <UsuarioForm
              onSuccess={() => {
                setShowForm(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : (
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm px-4 py-2 rounded-lg border font-semibold transition-colors hover:bg-accent"
            style={{
              color: "var(--accent-hex)",
              borderColor: "var(--accent-hex)",
            }}
          >
            + Nuevo usuario
          </button>
        </div>
      )}
    </div>
  );
}
