"use client";

import { useEffect } from "react";

/**
 * Imprime automáticamente al cargar.
 * - Cuando es pestaña directa: cierra la ventana después de imprimir.
 * - Cuando está en iframe oculto: notifica al padre para que lo elimine.
 */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
      window.onafterprint = () => {
        // Notifica al iframe padre (si aplica)
        try { window.parent?.postMessage({ type: "printDone" }, "*"); } catch { /* noop */ }
        // Cierra si fue abierto como ventana/pestaña
        window.close();
      };
    }, 900);
    return () => clearTimeout(t);
  }, []);
  return null;
}
