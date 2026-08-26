"use client";

import { useEffect } from "react";

/**
 * Dispara window.print() automáticamente al cargar el recibo.
 * Se usa en la página de recibo thermal para imprimir sin intervención.
 */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}
