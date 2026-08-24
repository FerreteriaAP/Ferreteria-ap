/**
 * Migración de números de documento al nuevo formato PREFIJO/AÑO/NNNN
 *
 * Uso (en el servidor, desde la raíz del proyecto):
 *   pnpm tsx scripts/migrate-numeros.ts
 *
 * Lo que hace:
 *   1. Lee todos los documentos existentes
 *   2. Extrae el número de secuencia del formato antiguo (FAC-00001 → 1)
 *   3. Reformatea usando el año de creación del documento (createdAt)
 *   4. Actualiza los registros en la DB
 *   5. Ajusta los contadores en secuencia_documento para evitar duplicados
 *
 * Es seguro: primero imprime el plan y pide confirmación antes de aplicar.
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

// Extrae el número entero de secuencia desde el string antiguo
// "FAC-00001" → 1 | "COMP00024" → 24 | "OC-0001" → 1
function extraerSecuencia(numero: string): number | null {
  const m = numero.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function formatear(prefijo: string, año: number, seq: number): string {
  return `${prefijo}/${año}/${String(seq).padStart(4, "0")}`;
}

async function main() {
  console.log("\n🔢  Migración de números de documento — Ferretería AP\n");

  const cambios: { tabla: string; id: string; de: string; a: string }[] = [];

  // ── VENTAS (facturas, conduces, cotizaciones, órdenes de venta) ─────────
  const ventas = await prisma.venta.findMany({
    select: { id: true, numero: true, tipo: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const PREFIJO_VENTA: Record<string, string> = {
    FACTURADA:    "FAC",
    PDV_PENDIENTE: "FAC",   // las PDV que se facturen usarán FAC de todas formas
    COTIZACION:   "COT",
    ORDEN_VENTA:  "OVN",
    // los conduces están como ventas con numero CDC-...
  };

  for (const v of ventas) {
    const año = v.createdAt.getFullYear();
    const seq = extraerSecuencia(v.numero);
    if (seq === null) continue;

    let prefijo: string;
    if (v.numero.startsWith("CDC") || v.numero.includes("CONDUCE")) {
      prefijo = "CDC";
    } else if (v.numero.startsWith("COT")) {
      prefijo = "COT";
    } else if (v.numero.startsWith("OV") || v.numero.startsWith("OVN")) {
      prefijo = "OVN";
    } else if (v.numero.startsWith("FAC") || v.numero.startsWith("PDV")) {
      prefijo = "FAC";
    } else {
      prefijo = PREFIJO_VENTA[v.tipo] ?? "DOC";
    }

    const nuevo = formatear(prefijo, año, seq);
    if (nuevo !== v.numero) {
      cambios.push({ tabla: "ventas", id: v.id, de: v.numero, a: nuevo });
    }
  }

  // ── COMPRAS ─────────────────────────────────────────────────────────────
  const compras = await prisma.compra.findMany({
    select: { id: true, numero: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  for (const c of compras) {
    const año = c.createdAt.getFullYear();
    const seq = extraerSecuencia(c.numero);
    if (seq === null) continue;
    const nuevo = formatear("CMP", año, seq);
    if (nuevo !== c.numero) {
      cambios.push({ tabla: "compras", id: c.id, de: c.numero, a: nuevo });
    }
  }

  // ── ÓRDENES DE COMPRA ────────────────────────────────────────────────────
  const ordenes = await prisma.ordenCompra.findMany({
    select: { id: true, numero: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  for (const o of ordenes) {
    const año = o.createdAt.getFullYear();
    const seq = extraerSecuencia(o.numero);
    if (seq === null) continue;
    const nuevo = formatear("ODC", año, seq);
    if (nuevo !== o.numero) {
      cambios.push({ tabla: "ordenes_compra", id: o.id, de: o.numero, a: nuevo });
    }
  }

  // ── NOTAS DE CRÉDITO ─────────────────────────────────────────────────────
  const notas = await prisma.notaCredito.findMany({
    select: { id: true, numero: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  for (const n of notas) {
    const año = n.createdAt.getFullYear();
    const seq = extraerSecuencia(n.numero);
    if (seq === null) continue;
    const nuevo = formatear("NCR", año, seq);
    if (nuevo !== n.numero) {
      cambios.push({ tabla: "notas_credito", id: n.id, de: n.numero, a: nuevo });
    }
  }

  // ── RESUMEN ──────────────────────────────────────────────────────────────
  if (cambios.length === 0) {
    console.log("✅  No hay documentos que migrar — todos usan el nuevo formato.\n");
    await prisma.$disconnect();
    return;
  }

  console.log(`📋  ${cambios.length} documentos a actualizar:\n`);
  const porTabla = cambios.reduce<Record<string, typeof cambios>>((acc, c) => {
    (acc[c.tabla] ??= []).push(c);
    return acc;
  }, {});

  for (const [tabla, filas] of Object.entries(porTabla)) {
    console.log(`  ${tabla} (${filas.length}):`);
    filas.slice(0, 5).forEach(f => console.log(`    ${f.de} → ${f.a}`));
    if (filas.length > 5) console.log(`    … y ${filas.length - 5} más`);
    console.log();
  }

  // Pedir confirmación
  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ok = await new Promise<boolean>(res =>
    rl.question("¿Aplicar cambios? (s/N) ", ans => { rl.close(); res(ans.toLowerCase() === "s"); })
  );

  if (!ok) {
    console.log("\n❌  Cancelado — no se realizó ningún cambio.\n");
    await prisma.$disconnect();
    return;
  }

  // ── APLICAR ──────────────────────────────────────────────────────────────
  console.log("\n⏳  Aplicando...");

  await prisma.$transaction(async (tx) => {
    for (const c of cambios) {
      if (c.tabla === "ventas") {
        await tx.venta.update({ where: { id: c.id }, data: { numero: c.a } });
      } else if (c.tabla === "compras") {
        await tx.compra.update({ where: { id: c.id }, data: { numero: c.a } });
      } else if (c.tabla === "ordenes_compra") {
        await tx.ordenCompra.update({ where: { id: c.id }, data: { numero: c.a } });
      } else if (c.tabla === "notas_credito") {
        await tx.notaCredito.update({ where: { id: c.id }, data: { numero: c.a } });
      }
    }
  });

  // Actualizar contadores — el próximo número sigue desde el máximo actual
  const tiposSeq: { tipo: string; prefijo: string; tabla: string }[] = [
    { tipo: "FACTURA",      prefijo: "FAC", tabla: "ventas" },
    { tipo: "CONDUCE_OUT",  prefijo: "CDC", tabla: "ventas" },
    { tipo: "COTIZACION",   prefijo: "COT", tabla: "ventas" },
    { tipo: "ORDEN_VENTA",  prefijo: "OVN", tabla: "ventas" },
    { tipo: "COMPRA",       prefijo: "CMP", tabla: "compras" },
    { tipo: "ORDEN_COMPRA", prefijo: "ODC", tabla: "ordenes_compra" },
    { tipo: "NOTA_CREDITO", prefijo: "NCR", tabla: "notas_credito" },
  ];

  for (const { tipo, prefijo } of tiposSeq) {
    const docs = cambios.filter(c => c.a.startsWith(prefijo + "/"));
    if (docs.length === 0) continue;
    const maxSeq = docs.reduce((max, c) => {
      const s = extraerSecuencia(c.a) ?? 0;
      return s > max ? s : max;
    }, 0);
    await prisma.secuenciaDocumento.upsert({
      where: { tipo },
      create: { tipo, prefijo, siguiente: maxSeq + 1, digitos: 4 },
      update: { siguiente: maxSeq + 1 },
    });
  }

  console.log(`\n✅  ${cambios.length} documentos migrados exitosamente.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
