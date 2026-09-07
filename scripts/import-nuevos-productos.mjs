/**
 * Importa los nuevos productos desde el archivo Excel.
 * - Precios COSTO y VENTA vienen CON ITBIS → se dividen entre 1.18 para guardar sin ITBIS
 * - % Ganancia se auto-calcula: (precioVenta - costo) / costo * 100
 * - Códigos se asignan en secuencia por categoría
 *
 * Uso: node scripts/import-nuevos-productos.mjs [--dry-run]
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
// Cargar .env
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
}

import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const DRY_RUN = process.argv.includes("--dry-run");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/* ── Replicar lógica cap() de src/lib/format.ts ── */
const SIGLAS_FIJAS = new Set([
  "PPR","PVC","CPVC","SDR","SCH","EMT","IMC","RGS","LED","STD","SRL","SA",
  "GL","GLL","MM","CM","MT","KG","LB","LT","UND","GRS","RNC",
]);
function capWord(word) {
  if (SIGLAS_FIJAS.has(word.toUpperCase()) && /^[A-Za-z]+$/.test(word)) return word.toUpperCase();
  if (/^[A-Z]{2,4}\d*$/.test(word)) return word;
  const mNum = word.match(/^([\d.]+)([A-Za-z]+)$/);
  if (mNum) return mNum[1] + mNum[2].toUpperCase();
  if (word.toLowerCase() === "x") return "x";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
function cap(s) {
  if (!s) return "";
  return s.trim().replace(/\S+/g, (token) => {
    if (token.includes("/")) return token.split("/").map(capWord).join("/");
    return capWord(token);
  });
}

/* ── Cargar datos pre-procesados desde JSON (generado por Python/openpyxl) ── */
function loadData() {
  const raw = readFileSync("/tmp/productos_nuevos.json", "utf8");
  return JSON.parse(raw);
}

/* ── Generar código secuencial ── */
function nextCode(prefix, lastNum, offset) {
  const n = lastNum + offset + 1;
  const padLen = prefix === "FT" ? 4 : 4;
  return `${prefix}-${String(n).padStart(padLen, "0")}`;
}

/* ── Main ── */
async function main() {
  console.log(DRY_RUN ? "🔍  DRY-RUN — no se escribirá nada\n" : "⬆️   Importando productos...\n");

  const data = loadData();

  // Últimos números por categoría
  const CAT_MAP = {
    Ferretería: { id: "FT", prefix: "FT" },
    Plomería: { id: "PL", prefix: "PL" },
    Construcción: { id: "CTC", prefix: "CTC" },
    Electricidad: { id: "ET", prefix: "ET" },
  };

  const lastNums = {};
  for (const [cat, { prefix }] of Object.entries(CAT_MAP)) {
    const last = await prisma.producto.findFirst({
      where: { codigo: { startsWith: prefix + "-" } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });
    if (last) {
      const parts = last.codigo.split("-");
      lastNums[cat] = parseInt(parts[parts.length === 2 ? 1 : 2] ?? "0", 10);
    } else {
      lastNums[cat] = 0;
    }
    console.log(`  ${prefix}: último código → ${last?.codigo ?? "ninguno"} (siguiente: ${lastNums[cat] + 1})`);
  }
  console.log();

  let totalInsertados = 0;
  const todasLasFilas = [];

  for (const [cat, productos] of Object.entries(data)) {
    const { id: catId, prefix } = CAT_MAP[cat];
    console.log(`\n═══ ${cat} (${productos.length} productos) ═══`);

    productos.forEach((p, idx) => {
      const costoNeto = p.costoConItbis / 1.18;   // sin ITBIS
      const precioVenta = p.ventaConItbis / 1.18;  // sin ITBIS
      const ganancia = ((precioVenta - costoNeto) / costoNeto) * 100;
      const codigo = nextCode(prefix, lastNums[cat], idx);
      const nombreFinal = cap(p.nombre);

      const fila = {
        codigo,
        nombre: nombreFinal,
        categoriaId: catId,
        costoNeto: Math.round(costoNeto * 10000) / 10000,
        precioVenta: Math.round(precioVenta * 100) / 100,
        ganancia: Math.round(ganancia * 100) / 100,
        stockActual: p.cantidad,
      };
      todasLasFilas.push(fila);

      console.log(
        `  ${codigo}  ${nombreFinal.padEnd(45).slice(0,45)}  ` +
        `costo=${fila.costoNeto.toFixed(2).padStart(9)}  ` +
        `venta=${fila.precioVenta.toFixed(2).padStart(9)}  ` +
        `gan=${fila.ganancia.toFixed(1).padStart(7)}%  ` +
        `stock=${p.cantidad}`
      );
    });
  }

  console.log(`\n${"─".repeat(80)}`);
  console.log(`Total a insertar: ${todasLasFilas.length} productos`);

  if (DRY_RUN) {
    console.log("\n🔍  Dry-run completado. Corre sin --dry-run para insertar.");
    return;
  }

  // Insertar en DB
  let ok = 0;
  for (const f of todasLasFilas) {
    await prisma.producto.create({
      data: {
        codigo: f.codigo,
        nombre: f.nombre,
        categoriaId: f.categoriaId,
        costoUltimo: f.costoNeto,
        costoPromedio: f.costoNeto,
        precioVenta: f.precioVenta,
        porcentajeGanancia: f.ganancia,
        stockActual: f.stockActual,
        unidadMedida: "UND",
        exentoItbis: false,
      },
    });
    ok++;
    process.stdout.write(`\r  Insertados: ${ok}/${todasLasFilas.length}`);
  }

  console.log(`\n\n✅  ${ok} productos insertados correctamente.`);
}

main()
  .catch((e) => { console.error("\n❌  Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
