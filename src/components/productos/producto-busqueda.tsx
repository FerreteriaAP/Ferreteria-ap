"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
  const [q, setQ] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navegar con debounce al escribir
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
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

  return (
    <div className="relative max-w-xs flex-1">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar por nombre, código, barras..."
        className="w-full h-9 rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
