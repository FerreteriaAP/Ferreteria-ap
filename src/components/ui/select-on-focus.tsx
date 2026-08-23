"use client";

import { useEffect } from "react";

/**
 * Escucha focusin globalmente y selecciona el contenido de cualquier
 * input[type="number"] al hacer click/tab, para que el 0 (o cualquier
 * valor previo) se sobreescriba directamente al escribir.
 *
 * Se excluyen inputs con data-no-select="true".
 */
export function SelectOnFocus() {
  useEffect(() => {
    const handle = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement;
      if (
        el.tagName === "INPUT" &&
        el.type === "number" &&
        el.getAttribute("data-no-select") !== "true"
      ) {
        // requestAnimationFrame garantiza que el foco ya se aplicó
        // antes de seleccionar (necesario en algunos browsers)
        requestAnimationFrame(() => el.select());
      }
    };
    document.addEventListener("focusin", handle);
    return () => document.removeEventListener("focusin", handle);
  }, []);

  return null;
}
