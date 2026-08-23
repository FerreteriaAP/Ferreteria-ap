"use client";

import { useEffect } from "react";

/**
 * Escucha focusin globalmente y selecciona el contenido de cualquier
 * input[type="number"] al hacer click/tab, para que el 0 (o cualquier
 * valor previo) se sobreescriba directamente al escribir.
 *
 * Chrome no soporta .select() en type="number", así que se cambia
 * temporalmente a "text", se selecciona, y se devuelve a "number".
 *
 * Se excluyen inputs con data-no-select="true".
 */
export function SelectOnFocus() {
  useEffect(() => {
    const handle = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement;
      if (
        el.tagName !== "INPUT" ||
        el.type !== "number" ||
        el.getAttribute("data-no-select") === "true"
      ) return;

      requestAnimationFrame(() => {
        try {
          // Truco cross-browser: switch a text → select → switch a number
          el.type = "text";
          el.select();
          el.type = "number";
        } catch {
          // Fallback: select directo (funciona en Firefox)
          el.select();
        }
      });
    };
    document.addEventListener("focusin", handle);
    return () => document.removeEventListener("focusin", handle);
  }, []);

  return null;
}
