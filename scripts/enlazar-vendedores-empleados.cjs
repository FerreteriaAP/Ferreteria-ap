/**
 * Enlaza los usuarios VENDEDOR a sus registros de Empleado por nombre.
 * Solo actualiza si los nombres coinciden y el empleado no tiene usuario ya enlazado.
 *
 * Ejecutar: node scripts/enlazar-vendedores-empleados.cjs
 */

"use strict";
require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../src/generated/prisma");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function normalizar(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

async function main() {
  // 1. Todos los usuarios VENDEDOR
  const vendedores = await prisma.usuario.findMany({
    where: { rol: "VENDEDOR", activo: true },
    select: { id: true, nombre: true, apellido: true, email: true, empleadoId: true },
  });

  // 2. Todos los empleados
  const empleados = await prisma.empleado.findMany({
    select: { id: true, nombre: true, apellido: true },
    include: { usuario: { select: { id: true, email: true } } },
  });

  console.log(`\n📋 Vendedores VENDEDOR encontrados: ${vendedores.length}`);
  vendedores.forEach(v => {
    console.log(`   • ${v.nombre} ${v.apellido}  (${v.email})  empleadoId: ${v.empleadoId ?? "❌ sin enlace"}`);
  });

  console.log(`\n📋 Empleados encontrados: ${empleados.length}`);
  empleados.forEach(e => {
    const u = (e as any).usuario;
    console.log(`   • ${e.nombre} ${e.apellido}  usuario: ${u ? u.email : "❌ sin usuario"}`);
  });

  console.log("\n🔗 Intentando enlazar por nombre...\n");

  let enlazados = 0;
  for (const v of vendedores) {
    if (v.empleadoId) {
      console.log(`   ✅ ${v.nombre} ${v.apellido} ya está enlazado`);
      continue;
    }

    // Buscar empleado con nombre+apellido similar
    const match = (empleados as any[]).find(e =>
      normalizar(e.nombre) === normalizar(v.nombre) &&
      normalizar(e.apellido) === normalizar(v.apellido)
    );

    if (!match) {
      console.log(`   ⚠️  ${v.nombre} ${v.apellido} — no se encontró empleado con ese nombre`);
      continue;
    }

    // Verificar que ese empleado no tenga ya otro usuario enlazado
    if ((match as any).usuario && (match as any).usuario.id !== v.id) {
      console.log(`   ⚠️  ${v.nombre} ${v.apellido} — el empleado ya tiene otro usuario enlazado (${(match as any).usuario.email})`);
      continue;
    }

    // Enlazar
    await prisma.usuario.update({
      where: { id: v.id },
      data: { empleadoId: match.id },
    });

    console.log(`   ✅ Enlazado: Usuario "${v.nombre} ${v.apellido}" → Empleado id ${match.id}`);
    enlazados++;
  }

  console.log(`\n✅ Proceso terminado. ${enlazados} usuario(s) enlazado(s).`);
}

main()
  .catch(err => { console.error("❌ Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
