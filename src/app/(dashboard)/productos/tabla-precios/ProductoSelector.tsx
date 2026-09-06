"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ProductoParaTabla } from "@/actions/tabla-precios";

interface ProductoSelectorProps {
  productos: ProductoParaTabla[];
  productoId: string;
}

export function ProductoSelector({ productos, productoId }: ProductoSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const items = productos.map((p) => ({
    id: p.id,
    label: p.nombre,
    sublabel: p.codigo,
  }));

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("productoId", id);
    } else {
      params.delete("productoId");
    }
    router.push(`/productos/tabla-precios?${params.toString()}`);
  }

  return (
    <SearchableSelect
      items={items}
      value={productoId}
      onChange={handleChange}
      placeholder="Buscar producto..."
      searchPlaceholder="Código o nombre..."
      className="w-full max-w-md"
    />
  );
}
