"use client";

/**
 * Botón de impresión manual — para páginas que se abren en pestaña nueva.
 * Visible en pantalla, oculto durante la impresión.
 * Con --kiosk-printing en la máquina de caja, window.print() no muestra diálogo.
 */
export function PrintBtn() {
  return (
    <>
      <div className="no-print" style={{
        position: "fixed", top: 12, right: 12, zIndex: 999,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            backgroundColor: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,.3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🖨️ Imprimir
        </button>
      </div>
      <style>{`
        @media print { .no-print { display: none !important; } }
      `}</style>
    </>
  );
}
