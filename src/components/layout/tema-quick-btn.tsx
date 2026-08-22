"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Palette, CheckCircle2, Loader2 } from "lucide-react";
import { setTemaActivo } from "@/actions/config";

const TEMAS = [
  { id: "dark-ops",       nombre: "Dark Ops",   bg: "#111923", panel: "#151C24", accent: "#F47717", border: "#29333D" },
  { id: "gris-claro",     nombre: "Gris Claro", bg: "#F1F3F5", panel: "#F5F6F7", accent: "#F47717", border: "#D4D9DE" },
  { id: "azul-metal",     nombre: "Azul Metal", bg: "#F2F4F6", panel: "#F7F8FA", accent: "#075E9E", border: "#D7DEE5" },
  { id: "dark-multicolor",nombre: "Dark Multi", bg: "#111C2A", panel: "#0F1724", accent: "#FF6A16", border: "#26384C" },
  { id: "carbon",         nombre: "Carbon",     bg: "#131A1E", panel: "#121A1C", accent: "#2DD4BF", border: "#1E2C2E" },
];

export function TemaQuickBtn({ temaActual }: { temaActual: string }) {
  const [open, setOpen]           = useState(false);
  const [selected, setSelected]   = useState(temaActual);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Aplica el tema del usuario (cookie) después de que ThemeProvider aplique el tema global de DB
  useEffect(() => {
    document.documentElement.setAttribute("data-ap-theme", temaActual);
    setSelected(temaActual);
  }, [temaActual]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function applyTema(id: string) {
    if (id === selected || pending) return;
    setSelected(id);
    document.documentElement.setAttribute("data-ap-theme", id);
    startTransition(async () => {
      const r = await setTemaActivo(id);
      if (!r.ok) {
        setSelected(temaActual);
        document.documentElement.setAttribute("data-ap-theme", temaActual);
      }
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Cambiar tema"
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--panel)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <Palette size={17} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--panel)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.50)",
            minWidth: 230,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
              Tema del sistema
            </p>
          </div>

          {/* Swatches */}
          <div className="p-2.5 flex gap-2">
            {TEMAS.map(t => {
              const activo = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTema(t.id)}
                  title={t.nombre}
                  disabled={pending}
                  className="flex-1 rounded-lg overflow-hidden transition-all"
                  style={{
                    border: `2px solid ${activo ? t.accent : t.border}`,
                    boxShadow: activo ? `0 0 0 1px ${t.accent}55` : "none",
                    opacity: pending && !activo ? 0.5 : 1,
                    aspectRatio: "1",
                  }}
                >
                  {/* Mini preview */}
                  <div style={{ backgroundColor: t.bg, padding: "4px 4px 3px", height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ backgroundColor: t.panel, borderRadius: 2, padding: "2px 3px", display: "flex", alignItems: "center", gap: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: t.accent }} />
                      <div style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: t.accent, opacity: 0.25 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, flex: 1 }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{ backgroundColor: t.panel, borderRadius: 2, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 4, height: 4, borderRadius: 1, backgroundColor: t.accent, opacity: i === 0 ? 0.9 : 0.25 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected label */}
          <div className="px-3 pb-2.5 flex items-center justify-between">
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {TEMAS.find(t => t.id === selected)?.nombre}
            </p>
            {pending
              ? <Loader2 size={11} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
              : <CheckCircle2 size={11} style={{ color: TEMAS.find(t => t.id === selected)?.accent ?? "var(--accent-hex)" }} />
            }
          </div>
        </div>
      )}
    </div>
  );
}
