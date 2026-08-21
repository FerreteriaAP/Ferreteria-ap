"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface Sugerencia {
  id: string;
  nombre: string;
  tipo: string;
  rnc: string | null;
  telefono: string | null;
}

interface ContactoBusquedaProps {
  tipo: string;
  vista: string;
  defaultValue?: string;
}

export function ContactoBusqueda({ tipo, vista, defaultValue = "" }: ContactoBusquedaProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Búsqueda con debounce
  useEffect(() => {
    if (q.trim().length < 2) { setSugerencias([]); setMostrar(false); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const params = new URLSearchParams({ q: q.trim(), tipo, limit: "8" });
        const res = await fetch(`/api/contactos/buscar?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSugerencias(data);
          setMostrar(data.length > 0);
        }
      } finally { setBuscando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, tipo]);

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMostrar(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function irA(contactoId: string) {
    setMostrar(false);
    router.push(`/contactos/${contactoId}`);
  }

  function buscar(texto: string) {
    setMostrar(false);
    const vistaQS = vista === "grid" ? "&vista=grid" : "";
    router.push(`/contactos?tipo=${tipo}&q=${encodeURIComponent(texto)}${vistaQS}`);
  }

  const tipoLabel: Record<string, string> = { CLIENTE: "Cliente", SUPLIDOR: "Suplidor", AMBOS: "Ambos" };

  return (
    <div ref={ref} className="relative flex-1 max-w-sm">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => sugerencias.length > 0 && setMostrar(true)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); buscar(q); }
            if (e.key === "Escape") setMostrar(false);
          }}
          placeholder="Buscar por nombre, RNC, teléfono..."
          className="w-full h-9 rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {buscando && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>
        )}
      </div>

      {/* Dropdown */}
      {mostrar && sugerencias.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[280px] rounded-xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          {sugerencias.map(s => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => irA(s.id)}
              className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-sm">{s.nombre}</span>
                  {s.rnc && <span className="text-xs text-muted-foreground ml-2">{s.rnc}</span>}
                  {s.telefono && <div className="text-xs text-muted-foreground">{s.telefono}</div>}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border text-muted-foreground shrink-0">
                  {tipoLabel[s.tipo] ?? s.tipo}
                </span>
              </div>
            </button>
          ))}
          {q.trim().length >= 2 && (
            <button
              type="button"
              onMouseDown={() => buscar(q)}
              className="w-full text-left px-4 py-2 text-xs text-primary font-medium hover:bg-muted/50 transition-colors"
            >
              Ver todos los resultados para «{q}»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
