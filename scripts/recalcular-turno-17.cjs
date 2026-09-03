/**
 * Recalcula montoEsperado y diferencia del turno #17
 * incluyendo los cobros de CxC en EFECTIVO (confirmados o no).
 *
 * Ejecutar: node scripts/recalcular-turno-17.cjs
 */

"use strict";
require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../src/generated/prisma");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Obtener turno #17
  const turno = await prisma.turnoCaja.findFirst({
    where: { numero: 17 },
    include: {
      movimientos: {
        where: { subTipo: { not: null } },
      },
      ventas: {
        where: { tipo: "FACTURADA" },
        include: {
          pagosRecibidos: { select: { metodo: true, monto: true } },
        },
      },
    },
  });

  if (!turno) {
    console.error("❌ Turno #17 no encontrado");
    process.exit(1);
  }

  console.log(`\n📋 Turno #17  id: ${turno.id}`);
  console.log(`   Estado:        ${turno.estado}`);
  console.log(`   montoApertura: RD$ ${Number(turno.montoApertura).toFixed(2)}`);
  console.log(`   montoCierre:   RD$ ${Number(turno.montoCierre ?? 0).toFixed(2)}`);
  console.log(`   montoEsperado guardado: RD$ ${Number(turno.montoEsperado ?? 0).toFixed(2)}`);
  console.log(`   diferencia guardada:    RD$ ${Number(turno.diferencia ?? 0).toFixed(2)}`);

  // 2. Recalcular igual que getResumenTurno (con la lógica corregida)
  const pagos = turno.ventas.flatMap(v => v.pagosRecibidos);
  const efectivoVentas = pagos
    .filter(p => p.metodo === "EFECTIVO")
    .reduce((s, p) => s + Number(p.monto), 0);

  const entradasMov = turno.movimientos
    .filter(m => m.tipo === "ENTRADA" && m.subTipo !== "COBRO_CXC")
    .reduce((s, m) => s + Number(m.monto), 0);

  // CxC en efectivo: siempre cuentan (confirmadas o no)
  const entradasCxC = turno.movimientos
    .filter(m => m.tipo === "ENTRADA" && m.subTipo === "COBRO_CXC" && m.metodo === "EFECTIVO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const salidasMov = turno.movimientos
    .filter(m => m.tipo === "SALIDA")
    .reduce((s, m) => s + Number(m.monto), 0);

  const nuevoMontoEsperado =
    Number(turno.montoApertura) + efectivoVentas + entradasMov + entradasCxC - salidasMov;

  const montoCierre = Number(turno.montoCierre ?? 0);
  const nuevaDiferencia = montoCierre - nuevoMontoEsperado;

  // 3. Desglose para auditoría
  console.log("\n📊 Desglose recalculado:");
  console.log(`   Apertura:          RD$ ${Number(turno.montoApertura).toFixed(2)}`);
  console.log(`   Efectivo ventas:   RD$ ${efectivoVentas.toFixed(2)}`);
  console.log(`   Entradas mov:      RD$ ${entradasMov.toFixed(2)}`);
  console.log(`   CxC en efectivo:   RD$ ${entradasCxC.toFixed(2)}  ← ahora incluido`);
  console.log(`   Salidas:          -RD$ ${salidasMov.toFixed(2)}`);
  console.log(`   ────────────────────────────────`);
  console.log(`   Esperado NUEVO:    RD$ ${nuevoMontoEsperado.toFixed(2)}`);
  console.log(`   Cierre físico:     RD$ ${montoCierre.toFixed(2)}`);
  console.log(`   Diferencia NUEVA:  RD$ ${nuevaDiferencia.toFixed(2)}`);

  // Mostrar los movimientos CxC EFECTIVO encontrados
  const movsCxCEfectivo = turno.movimientos.filter(
    m => m.tipo === "ENTRADA" && m.subTipo === "COBRO_CXC" && m.metodo === "EFECTIVO"
  );
  if (movsCxCEfectivo.length) {
    console.log("\n   Cobros CxC efectivo encontrados:");
    movsCxCEfectivo.forEach(m => {
      console.log(`     • ${m.concepto}  →  RD$ ${Number(m.monto).toFixed(2)}  confirmado: ${m.confirmado}`);
    });
  }

  // 4. Actualizar en BD
  await prisma.turnoCaja.update({
    where: { id: turno.id },
    data: {
      montoEsperado: nuevoMontoEsperado,
      diferencia:    nuevaDiferencia,
    },
  });

  console.log("\n✅ Turno #17 actualizado en la base de datos.");
}

main()
  .catch(err => { console.error("❌ Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
