import { prisma } from "./prisma";

const DIAS_EXPIRACION = 30;

export async function cleanupCotizacionesVencidas(): Promise<number> {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_EXPIRACION);

  // Cotizaciones que ya fueron convertidas a OV/CDC/FAC (no borrar)
  const convertidas = await prisma.venta.findMany({
    where: { cotizacionId: { not: null } },
    select: { cotizacionId: true },
  });
  const idsConvertidas = [...new Set(convertidas.map(v => v.cotizacionId!))];

  const result = await prisma.venta.deleteMany({
    where: {
      tipo: "COTIZACION",
      fechaEmision: { lt: limite },
      ...(idsConvertidas.length > 0 && { id: { notIn: idsConvertidas } }),
    },
  });

  if (result.count > 0) {
    console.log(`[Cleanup] ${result.count} cotización(es) eliminada(s) (> ${DIAS_EXPIRACION} días)`);
  }

  return result.count;
}
