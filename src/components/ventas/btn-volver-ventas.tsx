"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearVendedorActivo } from "@/actions/vendedor-activo";

interface Props {
  modoVendedor: boolean;
  href: string;
  label: string;
}

/**
 * Botón de "volver" en la vista de detalle de venta.
 * Si el usuario opera en modo vendedor, cierra su sesión antes de navegar
 * (para que deba volver a seleccionarse la próxima vez).
 */
export function BtnVolverVentas({ modoVendedor, href, label }: Props) {
  const router = useRouter();
  const [, start] = useTransition();

  function handleClick() {
    if (modoVendedor) {
      start(async () => {
        await clearVendedorActivo();
        router.push(href);
      });
    } else {
      router.push(href);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
      style={{
        backgroundColor: "color-mix(in oklch, var(--accent-hex) 14%, transparent)",
        color: "var(--accent-hex)",
      }}
    >
      ← {label}
    </button>
  );
}
