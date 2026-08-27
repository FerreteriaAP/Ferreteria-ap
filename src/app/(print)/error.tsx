"use client";
/**
 * Error boundary para el grupo (print).
 * Captura errores de renderizado en las páginas de recibos.
 */
export default function PrintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: 12,
      color: "#333",
      background: "#f5f5f5",
      padding: 24,
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Error al cargar el recibo</h2>
      <p style={{ margin: 0, fontSize: 13, color: "#666", textAlign: "center", maxWidth: 320 }}>
        {error.message || "Ocurrió un error al generar el documento."}
      </p>
      {error.digest && (
        <p style={{ margin: 0, fontSize: 11, color: "#999" }}>
          Ref: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{
            backgroundColor: "#000", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Reintentar
        </button>
        <button
          onClick={() => window.close()}
          style={{
            backgroundColor: "#fff", color: "#333", border: "1px solid #ccc",
            borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
