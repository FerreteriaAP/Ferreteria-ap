"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTemaActivo } from "@/actions/config";
import { CheckCircle2, Loader2 } from "lucide-react";

const TEMAS = [
 {
 id: "dark-ops",
 nombre: "Dark Ops",
 desc: "Oscuro profundo · naranja",
 bg: "#111923",
 panel: "#151C24",
 accent: "#F47717",
 text: "#F5F7FA",
 border: "#29333D",
 },
 {
 id: "gris-claro",
 nombre: "Gris Claro",
 desc: "Fondo claro · naranja",
 bg: "#F1F3F5",
 panel: "#F5F6F7",
 accent: "#F47717",
 text: "#171C21",
 border: "#D4D9DE",
 },
 {
 id: "azul-metal",
 nombre: "Azul Metal",
 desc: "Claro · azul metálico",
 bg: "#F2F4F6",
 panel: "#F7F8FA",
 accent: "#075E9E",
 text: "#17212B",
 border: "#D7DEE5",
 },
 {
 id: "dark-multicolor",
 nombre: "Noir",
 desc: "Gris claro · tarjetas negras",
 bg: "#E9E9E9",
 panel: "#F4F4F4",
 accent: "#1A1A1A",
 text: "#111111",
 border: "#D2D2D2",
 cardBg: "#1A1A1A",
 },
 {
 id: "carbon",
 nombre: "Carbon",
 desc: "Carbón · turquesa",
 bg: "#131A1E",
 panel: "#121A1C",
 accent: "#2DD4BF",
 text: "#E0F5F2",
 border: "#1E2C2E",
 },
];

export function TemaSelector({ temaActual }: { temaActual: string }) {
 const [seleccionado, setSeleccionado] = useState(temaActual);
 const [pending, startTransition] = useTransition();
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const router = useRouter();

 function handleSeleccionar(id: string) {
 if (id === seleccionado || pending) return;
 setSeleccionado(id);
 setErrorMsg(null);

 // Preview inmediato en el cliente — sin esperar al servidor
 document.documentElement.setAttribute("data-ap-theme", id);

 startTransition(async () => {
 const result = await setTemaActivo(id);
 if (!result.ok) {
 setErrorMsg(result.error ?? "Error desconocido");
 // Revertir preview si falló
 document.documentElement.setAttribute("data-ap-theme", temaActual);
 setSeleccionado(temaActual);
 } else {
 // Refresca el árbol de layouts para que el servidor también quede sincronizado
 router.refresh();
 }
 });
 }

 return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {TEMAS.map((t) => {
          const activo = seleccionado === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleSeleccionar(t.id)}
              disabled={pending}
              className="group relative rounded-xl overflow-hidden text-left transition-all duration-150 focus:outline-none"
              style={{
                aspectRatio: "1",
                border: `2px solid ${activo ? t.accent : t.border}`,
                boxShadow: activo ? `0 0 0 1px ${t.accent}40, 0 4px 16px rgba(0,0,0,0.4)` : "none",
                opacity: pending && !activo ? 0.6 : 1,
                display: "flex",
                flexDirection: "column",
              }}
              title={t.nombre}
            >
              {/* Miniatura — ocupa todo el espacio disponible */}
              <div style={{ flex: 1, backgroundColor: t.bg, padding: "8px 8px 6px" }}>
                {/* Header mini */}
                <div className="rounded mb-1.5 flex items-center gap-1 px-1.5 py-0.5" style={{ backgroundColor: t.panel }}>
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.accent, opacity: 0.9 }} />
                  <div className="h-1 rounded-full flex-1" style={{ backgroundColor: t.text, opacity: 0.2 }} />
                </div>
                {/* Cards mini */}
                <div className="grid grid-cols-3 gap-0.5">
                  {[...Array(6)].map((_, i) => {
                    const cardColor = (t as typeof t & { cardBg?: string }).cardBg ?? t.panel;
                    const iconColor = (t as typeof t & { cardBg?: string }).cardBg ? "#FFFFFF" : t.accent;
                    return (
                    <div
                      key={i}
                      className="rounded aspect-square flex items-center justify-center"
                      style={{ backgroundColor: cardColor, border: `1px solid ${t.border}` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: iconColor, opacity: i === 0 ? 1 : 0.35 }} />
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Info strip — fijo en el fondo */}
              <div className="px-2 py-1.5 shrink-0" style={{ backgroundColor: t.panel, borderTop: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold leading-tight" style={{ color: t.text }}>{t.nombre}</p>
                  {activo && !pending && <CheckCircle2 size={11} style={{ color: t.accent }} />}
                  {activo && pending  && <Loader2 size={11} className="animate-spin" style={{ color: t.accent }} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        El tema se aplica a <strong>todos los usuarios</strong> del sistema de forma inmediata.
      </p>
    </div>
  );
}
