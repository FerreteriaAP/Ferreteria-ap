"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PrintButtons() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Portal al <body> para escapar cualquier contenedor con scroll/transform
  // que rompería position:fixed
  return createPortal(
    <div
      className="no-print"
      style={{
        position: "fixed",
        top: 120,
        right: 16,
        zIndex: 9999,
        display: "flex",
        gap: 8,
      }}
    >
      <button
        onClick={() => window.print()}
        className="px-4 py-2 text-sm font-semibold rounded-lg shadow-lg transition-colors"
        style={{ backgroundColor: "var(--accent-hex, #f47717)", color: "#fff" }}
      >
        Imprimir
      </button>
      <button
        onClick={() => window.close()}
        className="px-3 py-2 text-sm rounded-lg shadow-lg border transition-colors hover:opacity-80"
        style={{ backgroundColor: "#fff", borderColor: "rgba(0,0,0,0.15)", color: "#222" }}
      >
        Cerrar
      </button>
    </div>,
    document.body
  );
}
