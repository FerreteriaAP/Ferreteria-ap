// Verifica el estado actual de CMP/2026/0001 y OVN/2026/0007
// Correr: node scripts/verificar.cjs

const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  // CMP
  const compra = await prisma.compra.findFirst({
    where: { numero: "CMP/2026/0001" },
    select: { numero: true, fechaVencimiento: true, cuentasPorPagar: { select: { fechaVencimiento: true, saldo: true } } },
  });
  console.log("\n── CMP/2026/0001 ──");
  console.log(compra ?? "No encontrada");

  // OVN 0007
  const v0007 = await prisma.venta.findFirst({
    where: { numero: "OVN/2026/0007" },
    select: {
      numero: true, total: true, subtotal: true,
      detalles: { select: { cantidad: true, producto: { select: { codigo: true, nombre: true } } } }
    },
  });
  console.log("\n── OVN/2026/0007 ──");
  if (v0007) {
    console.log("total:", v0007.total, "subtotal:", v0007.subtotal);
    v0007.detalles.forEach(d => {
      console.log(`  ${d.producto.codigo} — ${d.producto.nombre}: ${d.cantidad}`);
    });
  } else {
    console.log("No encontrada");
  }

  // OVN 0008
  const v0008 = await prisma.venta.findFirst({
    where: { numero: "OVN/2026/0008" },
    select: { numero: true, estado: true, total: true },
  });
  console.log("\n── OVN/2026/0008 ──");
  console.log(v0008 ?? "No encontrada");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
