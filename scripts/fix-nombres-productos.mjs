/**
 * Corrige los nombres de productos en la base de datos aplicando la lógica cap() actualizada.
 * - Siglas técnicas fijas (PPR, PVC, GL, etc.) → siempre en MAYÚSCULAS
 * - Tokens número + letras (1GL, 5gl) → letras en MAYÚSCULAS
 * - Siglas ALL-CAPS de 2-4 letras con dígitos opcionales (PN20, SCH40) → preservar
 * - Resto: primera letra mayúscula, resto minúscula
 *
 * Uso: node scripts/fix-nombres-productos.mjs [--dry-run]
 *   --dry-run  Muestra qué cambiaría sin escribir en la BD
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Cargar .env manualmente
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
}

import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DRY_RUN = process.argv.includes("--dry-run");

/* ── Replicar exactamente la lógica de src/lib/format.ts ── */
const SIGLAS_FIJAS = new Set([
  "PPR","PVC","CPVC","SDR","SCH","EMT","IMC","RGS","LED","STD","SRL","SA",
  "GL","GLL","MM","CM","MT","KG","LB","LT","UND","GRS","RNC",
]);

function capWord(word) {
  // Siglas técnicas fijas → siempre en mayúsculas
  if (SIGLAS_FIJAS.has(word.toUpperCase()) && /^[A-Za-z]+$/.test(word)) return word.toUpperCase();
  // Siglas ALL-CAPS de 2-4 letras con dígitos opcionales (PN20, SCH40…)
  if (/^[A-Z]{2,4}\d*$/.test(word)) return word;
  // Número (entero o decimal) + letras → letras en MAYÚSCULAS (1GL, 5gl, 0.5GL → 1GL, 5GL, 0.5GL)
  const mNum = word.match(/^([\d.]+)([A-Za-z]+)$/);
  if (mNum) return mNum[1] + mNum[2].toUpperCase();
  // "x" separador → siempre minúscula
  if (word.toLowerCase() === "x") return "x";
  // Normal
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function cap(s) {
  if (!s) return "";
  return s.trim().replace(/\S+/g, (token) => {
    if (token.includes("/")) return token.split("/").map(capWord).join("/");
    return capWord(token);
  });
}

async function main() {
  console.log(DRY_RUN ? "🔍  MODO DRY-RUN — no se escribirá nada\n" : "✏️   Aplicando correcciones...\n");

  const productos = await prisma.producto.findMany({
    select: { id: true, codigo: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  console.log(`Total de productos: ${productos.length}\n`);

  const cambios = [];
  for (const p of productos) {
    const nuevo = cap(p.nombre);
    if (nuevo !== p.nombre) {
      cambios.push({ id: p.id, codigo: p.codigo, antes: p.nombre, despues: nuevo });
    }
  }

  if (cambios.length === 0) {
    console.log("✅  Todos los nombres ya están correctos. Nada que cambiar.");
    return;
  }

  console.log(`Productos a corregir: ${cambios.length}\n`);
  console.log("─".repeat(80));

  for (const c of cambios) {
    console.log(`[${c.codigo}]`);
    console.log(`  ANTES:   ${c.antes}`);
    console.log(`  DESPUÉS: ${c.despues}`);
    console.log();
  }

  console.log("─".repeat(80));

  if (DRY_RUN) {
    console.log("\n🔍  Dry-run completado. Corre sin --dry-run para aplicar los cambios.");
    return;
  }

  // Aplicar los cambios
  let ok = 0;
  for (const c of cambios) {
    await prisma.producto.update({
      where: { id: c.id },
      data: { nombre: c.despues },
    });
    ok++;
    process.stdout.write(`\r  Actualizados: ${ok}/${cambios.length}`);
  }

  console.log(`\n\n✅  ${ok} productos actualizados correctamente.`);
}

main()
  .catch((e) => { console.error("❌  Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
