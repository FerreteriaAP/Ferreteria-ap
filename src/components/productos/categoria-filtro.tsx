"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface Categoria {
  id: string;
  codigo: string;
  nombre: string;
}

interface CategoriaFiltroProps {
  categorias: Categoria[];
  categoriaId: string;
  stockBajo: boolean;
  archivados: boolean;
  puedeVerArchivados: boolean;
  busqueda: string;
  vista: string;
}

export function CategoriaFiltro({
  categorias,
  categoriaId,
  stockBajo,
  archivados,
  puedeVerArchivados,
  busqueda,
  vista,
}: CategoriaFiltroProps) {
  const router = useRouter();

  // Determine the current select value
  let valor = "todos";
  if (archivados) valor = "archivados";
  else if (stockBajo) valor = "stock-bajo";
  else if (categoriaId) valor = categoriaId;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const params = new URLSearchParams();
    if (busqueda) params.set("q", busqueda);
    if (vista === "grid") params.set("vista", "grid");
    params.set("page", "1");

    if (v === "todos") {
      // no extra params
    } else if (v === "stock-bajo") {
      params.set("stockBajo", "1");
    } else if (v === "archivados") {
      params.set("archivados", "1");
    } else {
      params.set("categoria", v);
    }

    router.push(`/productos?${params.toString()}`);
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={valor}
        onChange={handleChange}
        className="h-9 appearance-none rounded-md border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
      >
        <option value="todos">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.codigo} — {c.nombre}
          </option>
        ))}
        <option value="stock-bajo">⚠ Stock bajo</option>
        {puedeVerArchivados && (
          <option value="archivados">Archivados</option>
        )}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
