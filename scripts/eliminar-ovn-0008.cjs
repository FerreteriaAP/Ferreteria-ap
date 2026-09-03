// node scripts/eliminar-ovn-0008.cjs
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { PrismaClient } = require("../src/generated/prisma");
const { PrismaPg }     = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const v = await prisma.venta.findFirst({
    where: { numero: "OVN/2026/0008" },
    include: {
      detalles:         { select: { id: true } },
      cuentasPorCobrar: { select: { id: true, saldo: true } },
      pagosRecibidos:   { select: { id: true } },
      notasCredito:     { select: { id: true } },
    },
  });

  if (!v) { console.error("❌  OVN/2026/0008 no encontrada"); return; }

  console.log("Documento:", v.numero, "| tipo:", v.tipo, "| total:", Number(v.total));
  console.log("  detalles:          ", v.detalles.length);
  console.log("  cuentas por cobrar:", v.cuentasPorCobrar.length);
  console.log("  pagos recibidos:   ", v.pagosRecibidos.length);
  console.log("  notas de crédito:  ", v.notasCredito.length);

  if (v.cuentasPorCobrar.length > 0 || v.pagosRecibidos.length > 0) {
    console.error("\n⚠️  Tiene CxC o pagos asociados — no se puede eliminar de forma segura");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Eliminar conduces asociados
    await tx.conduce.deleteMany({ where: { ventaId: v.id } });
    // 2. Eliminar detalles
    await tx.detalleVenta.deleteMany({ where: { ventaId: v.id } });
    // 3. Eliminar la venta
    await tx.venta.delete({ where: { id: v.id } });
  });

  console.log("\n✅  OVN/2026/0008 eliminada");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
