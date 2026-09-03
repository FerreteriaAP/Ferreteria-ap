// node scripts/merge-ovn.cjs
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { PrismaClient } = require("../src/generated/prisma");
const { PrismaPg }     = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

const N_0007 = "OVN/2026/0007";
const N_0008 = "OVN/2026/0008";
const CODIGO = "PL-0446";
const CANT_AGREGAR = 2;

async function main() {
  const v0007 = await prisma.venta.findFirst({
    where: { numero: N_0007 },
    include: { detalles: { include: { producto: { select: { codigo: true } } } } },
  });
  const v0008 = await prisma.venta.findFirst({ where: { numero: N_0008 } });

  if (!v0007) { console.error(`❌  No se encontró ${N_0007}`); return; }
  if (!v0008) { console.error(`❌  No se encontró ${N_0008}`); return; }

  console.log(`✔  ${N_0007} — ${v0007.detalles.length} líneas`);
  console.log(`✔  ${N_0008} encontrada`);

  const linea = v0007.detalles.find(d => d.producto.codigo === CODIGO);
  if (!linea) { console.error(`❌  No se encontró la línea ${CODIGO} en ${N_0007}`); return; }

  const cantAnterior = Number(linea.cantidad);
  const cantNueva    = cantAnterior + CANT_AGREGAR;
  const precio       = Number(linea.precio);
  const factorDesc   = 1 - Number(linea.descuento) / 100;
  const newSubtotal  = cantNueva * precio * factorDesc;
  const newItbis     = linea.exentoItbis ? 0 : newSubtotal * 0.18;

  console.log(`\nLínea ${CODIGO}: ${cantAnterior} → ${cantNueva}`);

  const otrasLineas   = v0007.detalles.filter(d => d.id !== linea.id);
  const nuevoSubtotal = otrasLineas.reduce((s, d) => s + Number(d.subtotal), 0) + newSubtotal;
  const nuevoItbis    = otrasLineas.reduce((s, d) => s + Number(d.itbis),    0) + newItbis;
  const nuevoTotal    = nuevoSubtotal + nuevoItbis;

  console.log(`Totales: ${Number(v0007.total).toFixed(2)} → ${nuevoTotal.toFixed(2)}`);

  await prisma.$transaction(async tx => {
    await tx.detalleVenta.update({ where: { id: linea.id }, data: { cantidad: cantNueva, subtotal: newSubtotal, itbis: newItbis } });
    await tx.venta.update({ where: { id: v0007.id }, data: { subtotal: nuevoSubtotal, itbis: nuevoItbis, total: nuevoTotal } });
    await tx.venta.update({ where: { id: v0008.id }, data: { estado: "CANCELADO" } });
  });

  console.log(`\n✅  ${N_0007} actualizada y ${N_0008} cancelada`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
