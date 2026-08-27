/**
 * Not-found para el grupo (print).
 * Si alguna página de recibo no encuentra datos, muestra esto
 * en lugar de la página 404 genérica.
 */
export default function PrintNotFound() {
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
    }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Documento no encontrado</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#666", textAlign: "center", maxWidth: 280 }}>
        El recibo o documento que buscas no existe o no está disponible.<br />
        Puede que ya haya sido eliminado o que el enlace sea incorrecto.
      </p>
      <button
        onClick={() => window.close()}
        style={{
          marginTop: 8,
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Cerrar pestaña
      </button>
    </div>
  );
}
