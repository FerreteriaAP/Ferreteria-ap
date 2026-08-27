"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SESSION_KEY = "inventario-busqueda";

interface ProductoBusquedaProps {
  defaultValue?: string;
  categoriaId?: string;
  stockBajo?: boolean;
  vista?: string;
}

export function ProductoBusqueda({
  defaultValue = "",
  categoriaId = "",
  stockBajo = false,
  vista = "lista",
}: ProductoBusquedaProps) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Inicializa con el valor de URL; si no hay, recupera de sessionStorage
  const [q, setQ] = useState(() => {
    if (defaultValue) return defaultValue;
    try { return sessionStorage.getItem(SESSION_KEY) ?? ""; } catch { return ""; }
  });
  // Si al montar no hay param en URL pero sí hay algo guardado, redirigir con el filtro
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    if (!defaultValue && q) {
      const params = new URLSearchParams();
      params.set("q", q);
      if (categoriaId) params.set("categoria", categoriaId);
      if (stockBajo) params.set("stockBajo", "1");
      if (vista === "grid") params.set("vista", "grid");
      params.set("page", "1");
      router.replace(`/productos?${params.toString()}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navegar con debounce al escribir
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Persistir en sessionStorage
      try {
        if (q.trim()) sessionStorage.setItem(SESSION_KEY, q.trim());
        else sessionStorage.removeItem(SESSION_KEY);
      } catch { /* noop */ }

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (categoriaId) params.set("categoria", categoriaId);
      if (stockBajo) params.set("stockBajo", "1");
      if (vista === "grid") params.set("vista", "grid");
      params.set("page", "1");
      router.push(`/productos?${params.toString()}`);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const limpiar = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    setQ("");
  };

  return (
    <div className="relative max-w-xs flex-1">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === "Escape") limpiar(); }}
        placeholder="Buscar por nombre, código, barras..."
        className="w-full h-9 rounded-md border bg-background pl-8 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {q && (
        <button
          type="button"
          onClick={limpiar}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1 leading-none"
          title="Limpiar búsqueda"
        >
          ✕
        </button>
      )}
    </div>
  );
}
