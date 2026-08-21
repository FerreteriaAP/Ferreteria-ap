/**
 * actualizar-credito.ts
 * Actualiza SOLO el campo credito de los contactos existentes
 * según los JSONs de suppliers.json y clients.json.
 * No borra ni re-crea nada — solo un UPDATE por nombre.
 *
 * Uso: npx tsx scripts/import-data/actualizar-credito.ts
 */

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const DATA_DIR = path.join(__dirname);

interface ContactoJSON {
  nombre: string;
  credito: string;
}

async function main() {
  const suppliers: ContactoJSON[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "suppliers.json"), "utf-8"));
  const clients: ContactoJSON[]   = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "clients.json"), "utf-8"));

  const todos = [...suppliers, ...clients];
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const c of todos) {
    if (!c.credito || c.credito === "CONTADO") { skipped++; continue; }

    const { rows } = await pool.query<{ id: string; credito: string }>(
      `SELECT id, credito FROM contactos WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
      [c.nombre]
    );

    if (rows.length === 0) {
      console.log(`  ⚠ No encontrado: ${c.nombre}`);
      notFound++;
      continue;
    }

    const contacto = rows[0];
    if (contacto.credito === c.credito) { skipped++; continue; }

    await pool.query(
      `UPDATE contactos SET credito = $1, "updatedAt" = NOW() WHERE id = $2`,
      [c.credito, contacto.id]
    );

    console.log(`  ✓ ${c.nombre}: ${contacto.credito} → ${c.credito}`);
    updated++;
  }

  console.log(`\nListo: ${updated} actualizados, ${skipped} sin cambio, ${notFound} no encontrados.`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
