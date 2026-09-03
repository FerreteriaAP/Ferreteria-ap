// node scripts/fix-cmp-credito.cjs
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { PrismaClient } = require("../src/generated/prisma");
const { PrismaPg }     = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const compra = await prisma.compra.findFirst({
    where: { numero: "CMP/2026/0001" },
    include: { cuentasPorPagar: true },
  });

  if (!compra) { console.error("❌  No se encontró CMP/2026/0001"); return; }

  console.log("Compra:", compra.numero);
  console.log("  fechaVencimiento actual:", compra.fechaVencimiento);

  const nuevaFecha = compra.fechaVencimiento
    ? new Date(new Date(compra.fechaVencimiento).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  console.log("  nuevaFecha:             ", nuevaFecha);

  await prisma.compra.update({ where: { id: compra.id }, data: { fechaVencimiento: nuevaFecha } });

  for (const cxp of compra.cuentasPorPagar) {
    const nf = cxp.fechaVencimiento
      ? new Date(new Date(cxp.fechaVencimiento).getTime() + 30 * 24 * 60 * 60 * 1000)
      : nuevaFecha;
    await prisma.cuentaPorPagar.update({ where: { id: cxp.id }, data: { fechaVencimiento: nf } });
    console.log("  CxP actualizada →", nf);
  }

  console.log("✅  Listo");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
