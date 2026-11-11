export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupCotizacionesVencidas } = await import("./lib/cleanup-cotizaciones");

    // Limpieza inicial al arrancar el servidor
    cleanupCotizacionesVencidas().catch(console.error);

    // Limpieza diaria (cada 24h mientras el proceso esté vivo)
    setInterval(() => {
      cleanupCotizacionesVencidas().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }
}
