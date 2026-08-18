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
 nombre: "Dark Multi",
 desc: "Carbón · azul / naranja / dorado",
 bg: "#111C2A",
 panel: "#0F1724",
 accent: "#FF6A16",
 text: "#F5F7FA",
 border: "#26384C",
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
 <div className="space-y-4"> <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"> {TEMAS.map((t) => {
 const activo = seleccionado === t.id;
 return (
 <button
 key={t.id}
 onClick={() => handleSeleccionar(t.id)}
 disabled={pending}
 className="group relative rounded-xl p-0 overflow-hidden text-left transition-all duration-150 focus:outline-none" style={{
 border: `2px solid ${activo ? t.accent : t.border}`,
 boxShadow: activo ? `0 0 0 1px ${t.accent}40, 0 4px 16px rgba(0,0,0,0.4)` : "none",
 opacity: pending && !activo ? 0.6 : 1,
 }}
 title={t.nombre}
 > {/* Miniatura del tema */}
 <div style={{ backgroundColor: t.bg, padding: "12px 10px 10px" }}> {/* Header mini */}
 <div
 className="rounded-md mb-2 flex items-center gap-1.5 px-2 py-1" style={{ backgroundColor: t.panel }}
 > <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.accent, opacity: 0.9 }} /> <div className="h-1.5 rounded-full flex-1" style={{ backgroundColor: t.text, opacity: 0.25 }} /> </div> {/* Cards mini */}
 <div className="grid grid-cols-3 gap-1"> {[...Array(6)].map((_, i) => (
 <div
 key={i}
 className="rounded aspect-square flex items-center justify-center" style={{ backgroundColor: t.panel, border: `1px solid ${t.border}` }}
 > <div
 className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.accent, opacity: i === 0 ? 1 : 0.4 }}
 /> </div> ))}
 </div> </div> {/* Info */}
 <div
 className="px-3 py-2" style={{ backgroundColor: t.panel, borderTop: `1px solid ${t.border}` }}
 > <div className="flex items-center justify-between"> <p className="text-xs font-semibold" style={{ color: t.text }}>{t.nombre}</p> {activo && !pending && (
 <CheckCircle2 size={13} style={{ color: t.accent }} /> )}
 {activo && pending && (
 <Loader2 size={13} className="animate-spin" style={{ color: t.accent }} /> )}
 </div> <p className="text-[10px] mt-0.5" style={{ color: t.text, opacity: 0.5 }}>{t.desc}</p> </div> </button> );
 })}
 </div> {errorMsg && (
 <p className="text-sm text-destructive">{errorMsg}</p> )}

 <p className="text-xs" style={{ color: "var(--muted-foreground)" }}> El tema se aplica a <strong>todos los usuarios</strong> del sistema de forma inmediata.
 Los 5 temas pueden personalizarse con los diseños de Manus.
 </p> </div> );
}
