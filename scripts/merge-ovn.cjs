// node scripts/merge-ovn.cjs
// Suma 2 tubos PL-0446 a OVN/2026/0007 (4 → 6) y recalcula totales
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { PrismaClient } = require("../src/generated/prisma");
const { PrismaPg }     = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

const N_0007 = "OVN/2026/0007";
const CODIGO = "PL-0446";
const CANT_AGREGAR = 2;

async function main() {
  const v0007 = await prisma.venta.findFirst({
    where: { numero: N_0007 },
    include: { detalles: { include: { producto: { select: { codigo: true } } } } },
  });

  if (!v0007) { console.error(`❌  No se encontró ${N_0007}`); return; }
  console.log(`✔  ${N_0007} — ${v0007.detalles.length} líneas`);

  const linea = v0007.detalles.find(d => d.producto.codigo === CODIGO);
  if (!linea) { console.error(`❌  No se encontró la línea ${CODIGO} en ${N_0007}`); return; }

  const cantAnterior = Number(linea.cantidad);
  const cantNueva    = cantAnterior + CANT_AGREGAR;
  const precio       = Number(linea.precio);
  const factorDesc   = 1 - Number(linea.descuento) / 100;
  const newSubtotal  = cantNueva * precio * factorDesc;
  const newItbis     = linea.exentoItbis ? 0 : newSubtotal * 0.18;

  console.log(`Línea ${CODIGO}: ${cantAnterior} → ${cantNueva}`);

  const otrasLineas   = v0007.detalles.filter(d => d.id !== linea.id);
  const nuevoSubtotal = otrasLineas.reduce((s, d) => s + Number(d.subtotal), 0) + newSubtotal;
  const nuevoItbis    = otrasLineas.reduce((s, d) => s + Number(d.itbis),    0) + newItbis;
  const nuevoTotal    = nuevoSubtotal + nuevoItbis;

  console.log(`Total: ${Number(v0007.total).toFixed(2)} → ${nuevoTotal.toFixed(2)}`);

  await prisma.$transaction(async tx => {
    await tx.detalleVenta.update({
      where: { id: linea.id },
      data: { cantidad: cantNueva, subtotal: newSubtotal, itbis: newItbis },
    });
    await tx.venta.update({
      where: { id: v0007.id },
      data: { subtotal: nuevoSubtotal, itbis: nuevoItbis, total: nuevoTotal },
    });
  });

  console.log(`\n✅  ${N_0007} actualizada`);
  console.log(`ℹ️   OVN/2026/0008 — elimínala manualmente desde la app si ya no es necesaria`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
