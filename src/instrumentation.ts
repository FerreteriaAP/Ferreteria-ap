export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupCotizacionesVencidas } = await import("./lib/cleanup-cotizaciones");

    // Limpieza inicial al arrancar el servidor
    cleanupCotizacionesVencidas().catch(console.error);

    // Limpieza diaria (cada 24h mientras el proceso esté vivo)
    setInterval(() => {
      cleanupCotizacionesVencidas().catch(console.error);
    }, 24 * 60 * 60 * 1000);

    // e-CF: cada 3 minutos, actualizar el estado de los comprobantes que la DGII
    // todavía procesa (en_proceso, pendiente_envio, etc.). Solo con ECF_ACTIVO=true.
    if (process.env.ECF_ACTIVO === "true") {
      const { sincronizarPendientes } = await import("./lib/ecf-servicio");
      let corriendo = false;
      setInterval(() => {
        if (corriendo) return;
        corriendo = true;
        sincronizarPendientes()
          .then((r) => { if (r.errores.length) console.error("[ecf] sincronización:", r.errores.slice(0, 3)); })
          .catch((e) => console.error("[ecf] sincronización:", e))
          .finally(() => { corriendo = false; });
      }, 3 * 60 * 1000);
    }
  }
}
