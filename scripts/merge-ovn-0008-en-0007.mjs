// Fusiona OVN/2026/0008 en OVN/2026/0007:
//   - Suma 2 tubos PL-0446 a la línea existente en 0007 (4 → 6)
//   - Recalcula subtotal/itbis/total de 0007
//   - Cancela 0008 (estado CANCELADO si existe ese estado, o elimina)
//
// Correr: node scripts/merge-ovn-0008-en-0007.mjs

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const N_0007 = "OVN/2026/0007";
const N_0008 = "OVN/2026/0008";
const CODIGO = "PL-0446";
const CANT_AGREGAR = 2;

async function main() {
  // ── 1. Cargar ambas ventas ────────────────────────────────────────────────

  const v0007 = await prisma.venta.findFirst({
    where: { numero: N_0007 },
    include: { detalles: { include: { producto: { select: { codigo: true } } } } },
  });
  const v0008 = await prisma.venta.findFirst({
    where: { numero: N_0008 },
    include: { detalles: { include: { producto: { select: { codigo: true } } } } },
  });

  if (!v0007) { console.error(`❌  No se encontró ${N_0007}`); return; }
  if (!v0008) { console.error(`❌  No se encontró ${N_0008}`); return; }

  console.log(`✔  ${N_0007} — ${v0007.detalles.length} líneas`);
  console.log(`✔  ${N_0008} — ${v0008.detalles.length} líneas`);

  // ── 2. Buscar la línea PL-0446 en 0007 ───────────────────────────────────

  const linea = v0007.detalles.find((d) => d.producto.codigo === CODIGO);
  if (!linea) {
    console.error(`❌  No se encontró la línea ${CODIGO} en ${N_0007}`);
    return;
  }

  const cantAnterior = Number(linea.cantidad);
  const cantNueva    = cantAnterior + CANT_AGREGAR;
  const precio       = Number(linea.precio);       // sin ITBIS
  const precioFinal  = Number(linea.precioFinal);  // con ITBIS
  const descPct      = Number(linea.descuento);
  const esExento     = linea.exentoItbis;

  console.log(`\nLínea ${CODIGO}:`);
  console.log(`  cantidad: ${cantAnterior} → ${cantNueva}`);
  console.log(`  precio base (sin ITBIS): ${precio}`);
  console.log(`  precioFinal (con ITBIS): ${precioFinal}`);

  // Recalcular itbis y subtotal de la línea
  const factorDesc  = 1 - descPct / 100;
  const newSubtotal = cantNueva * precio * factorDesc;         // sin ITBIS
  const newItbis    = esExento ? 0 : newSubtotal * 0.18;

  console.log(`  nuevo subtotal línea: ${newSubtotal.toFixed(2)}`);
  console.log(`  nuevo itbis línea:    ${newItbis.toFixed(2)}`);

  // ── 3. Recalcular totales del venta 0007 ─────────────────────────────────

  const otrasLineas = v0007.detalles.filter((d) => d.id !== linea.id);

  const subtotalOtras = otrasLineas.reduce((s, d) => s + Number(d.subtotal), 0);
  const itbisOtras    = otrasLineas.reduce((s, d) => s + Number(d.itbis),    0);

  const nuevoSubtotal = subtotalOtras + newSubtotal;
  const nuevoItbis    = itbisOtras    + newItbis;
  const nuevoTotal    = nuevoSubtotal + nuevoItbis;

  console.log(`\nTotales ${N_0007}:`);
  console.log(`  subtotal: ${Number(v0007.subtotal).toFixed(2)} → ${nuevoSubtotal.toFixed(2)}`);
  console.log(`  itbis:    ${Number(v0007.itbis).toFixed(2)} → ${nuevoItbis.toFixed(2)}`);
  console.log(`  total:    ${Number(v0007.total).toFixed(2)} → ${nuevoTotal.toFixed(2)}`);

  // ── 4. Aplicar cambios en transacción ────────────────────────────────────

  await prisma.$transaction(async (tx) => {
    // Actualizar línea PL-0446 en 0007
    await tx.detalleVenta.update({
      where: { id: linea.id },
      data: {
        cantidad: cantNueva,
        subtotal: newSubtotal,
        itbis:    newItbis,
      },
    });

    // Actualizar totales de 0007
    await tx.venta.update({
      where: { id: v0007.id },
      data: {
        subtotal: nuevoSubtotal,
        itbis:    nuevoItbis,
        total:    nuevoTotal,
      },
    });

    // Cancelar 0008
    await tx.venta.update({
      where: { id: v0008.id },
      data: { estado: "CANCELADO" },
    });

    console.log(`\n✅  ${N_0007} actualizada y ${N_0008} cancelada`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
