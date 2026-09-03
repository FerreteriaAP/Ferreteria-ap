// Extiende CMP/2026/0001: crédito 30→60 días (+30 días a fechaVencimiento)
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  const compra = await prisma.compra.findFirst({
    where: { numero: "CMP/2026/0001" },
    include: { cuentasPorPagar: true },
  });

  if (!compra) {
    console.error("❌  No se encontró CMP/2026/0001");
    return;
  }

  console.log("Compra encontrada:", compra.numero);
  console.log("  fechaVencimiento actual:", compra.fechaVencimiento);

  const nuevaFecha = compra.fechaVencimiento
    ? new Date(new Date(compra.fechaVencimiento).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  console.log("  nuevaFechaVencimiento:  ", nuevaFecha);

  // Actualizar compra
  await prisma.compra.update({
    where: { id: compra.id },
    data: { fechaVencimiento: nuevaFecha },
  });

  // Actualizar CxP asociada (si existe)
  for (const cxp of compra.cuentasPorPagar) {
    const nuevaFechaCxp = cxp.fechaVencimiento
      ? new Date(new Date(cxp.fechaVencimiento).getTime() + 30 * 24 * 60 * 60 * 1000)
      : nuevaFecha;

    await prisma.cuentaPorPagar.update({
      where: { id: cxp.id },
      data: { fechaVencimiento: nuevaFechaCxp },
    });
    console.log("  CxP actualizada:", cxp.id, "→", nuevaFechaCxp);
  }

  console.log("✅  Listo");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
