"use client";

import { useEffect } from "react";

/**
 * Imprime automáticamente al cargar y cierra la pestaña al terminar.
 */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
      // Cierra la pestaña automáticamente después de imprimir
      window.onafterprint = () => window.close();
    }, 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}
