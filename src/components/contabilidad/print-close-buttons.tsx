"use client";

export function PrintCloseButtons() {
  return (
    <div className="no-print fixed top-[80px] right-4 z-50 flex gap-2">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 text-sm font-semibold rounded-lg shadow-lg transition-colors hover:brightness-110"
        style={{ backgroundColor: "var(--accent-hex, #f47717)", color: "#fff" }}
      >
        Imprimir / Guardar PDF
      </button>
      <button
        onClick={() => window.close()}
        className="px-3 py-2 text-sm rounded-lg shadow-lg border transition-colors hover:opacity-80"
        style={{ backgroundColor: "#fff", borderColor: "rgba(0,0,0,0.15)", color: "#222" }}
      >
        Cerrar
      </button>
    </div>
  );
}
