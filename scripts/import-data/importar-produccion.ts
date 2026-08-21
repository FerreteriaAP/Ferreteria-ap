/**
 * Script de importación de datos de producción.
 * Usa pg directamente para evitar problemas con el driver adapter de Prisma 7.
 *
 * Ejecutar desde la raíz del proyecto:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-data/importar-produccion.ts
 */

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DATA_DIR = path.join(__dirname);

interface Supplier {
  tipo: string;
  nombre: string;
  rnc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  credito: string;
}

interface Client {
  tipo: string;
  nombre: string;
  credito: string;
}

interface Product {
  codigo: string;
  nombre: string;
  categoriaCode: string;
  costoSinItbis: number;
  precioVenta: number;
  porcentajeGanancia: number;
  unidadMedida: string;
}

// ─── PASO 1: LIMPIAR DATOS ────────────────────────────────────────────────────

async function limpiarDatos() {
  console.log("🗑  Limpiando datos...");
  const client = await pool.connect();
  try {
    // TRUNCATE CASCADE maneja las FK automáticamente
    await client.query(`
      TRUNCATE TABLE
        movimientos_inventario,
        alertas_inventario,
        detalles_venta,
        pagos_venta,
        conduces,
        ventas,
        detalles_compra,
        pagos_compra,
        detalles_orden_compra,
        ordenes_compra,
        compras,
        notas_credito,
        cuentas_por_cobrar,
        cuentas_por_pagar,
        movimientos_caja,
        turnos_caja,
        precios_especiales,
        productos,
        direcciones_entrega,
        contactos
      CASCADE
    `);
    console.log("   ✓ Datos eliminados");
  } finally {
    client.release();
  }
}

// ─── PASO 2: IMPORTAR CONTACTOS ────────────────────────────────────────────────

async function importarContactos() {
  console.log("👥 Importando contactos...");

  const suppliers: Supplier[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "suppliers.json"), "utf-8")
  );
  const clients: Client[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "clients.json"), "utf-8")
  );

  const client = await pool.connect();
  let supCount = 0, cliCount = 0;

  try {
    await client.query("BEGIN");

    // Suplidores
    for (const s of suppliers) {
      // Si RNC duplicado, intentar sin RNC
      let contactoId: string | null = null;
      try {
        const res = await client.query(
          `INSERT INTO contactos (id, tipo, nombre, rnc, email, telefono, "tipoComprobante", credito, "esEmisorElectronico", "saldoFavor", activo, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'SUPLIDOR', $1, $2, $3, $4, 'B01', $5, false, 0, true, NOW(), NOW())
           RETURNING id`,
          [s.nombre, s.rnc, s.email, s.telefono, s.credito]
        );
        contactoId = res.rows[0].id;
      } catch {
        // RNC duplicado → sin RNC
        const res = await client.query(
          `INSERT INTO contactos (id, tipo, nombre, rnc, email, telefono, "tipoComprobante", credito, "esEmisorElectronico", "saldoFavor", activo, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'SUPLIDOR', $1, NULL, $2, $3, 'B01', $4, false, 0, true, NOW(), NOW())
           RETURNING id`,
          [s.nombre, s.email, s.telefono, s.credito]
        );
        contactoId = res.rows[0].id;
      }

      // Dirección
      if (s.direccion && contactoId) {
        await client.query(
          `INSERT INTO direcciones_entrega (id, "contactoId", etiqueta, direccion, ciudad, "esPrincipal", "createdAt")
           VALUES (gen_random_uuid(), $1, 'Principal', $2, 'Santo Domingo', true, NOW())`,
          [contactoId, s.direccion]
        );
      }
      supCount++;
    }

    // Clientes
    for (const c of clients) {
      try {
        await client.query(
          `INSERT INTO contactos (id, tipo, nombre, "tipoComprobante", credito, "esEmisorElectronico", "saldoFavor", activo, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'CLIENTE', $1, 'B02', $2, false, 0, true, NOW(), NOW())`,
          [c.nombre, c.credito]
        );
        cliCount++;
      } catch {
        // duplicado, omitir
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  console.log(`   ✓ Suplidores: ${supCount}`);
  console.log(`   ✓ Clientes: ${cliCount}`);
}

// ─── PASO 3: IMPORTAR PRODUCTOS ────────────────────────────────────────────────

async function importarProductos() {
  console.log("📦 Importando productos...");

  const products: Product[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf-8")
  );

  // Obtener mapa categoriaCode → categoriaId
  const catRes = await pool.query(`SELECT id, codigo FROM categorias`);
  const catMap = new Map<string, string>(
    catRes.rows.map((r: { codigo: string; id: string }) => [r.codigo, r.id])
  );

  const stats: Record<string, number> = {};
  let errors = 0;
  const BATCH = 200;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const p of batch) {
        const categoriaId = catMap.get(p.categoriaCode);
        if (!categoriaId) {
          console.error(`  ⚠ Categoría no encontrada: ${p.categoriaCode}`);
          errors++;
          continue;
        }

        try {
          await client.query(
            `INSERT INTO productos (id, codigo, nombre, "categoriaId", "costoPromedio", "costoUltimo", "precioVenta", "porcentajeGanancia", "unidadMedida", "stockActual", "stockMinimo", "esFraccionable", "exentoItbis", activo, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $4, $5, $6, $7, 0, 0, false, false, true, NOW(), NOW())`,
            [p.codigo, p.nombre, categoriaId, p.costoSinItbis, p.precioVenta, p.porcentajeGanancia, p.unidadMedida]
          );
          stats[p.categoriaCode] = (stats[p.categoriaCode] ?? 0) + 1;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate")) {
            console.error(`  ⚠ Error "${p.codigo}":`, msg.slice(0, 60));
          }
          errors++;
        }
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    const done = Math.min(i + BATCH, products.length);
    process.stdout.write(`   ${done}/${products.length} productos...\r`);
  }

  console.log("\n   Productos por categoría:");
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`   ✓ ${cat}: ${count}`);
  }
  if (errors > 0) console.log(`   ⚠ Errores/duplicados: ${errors}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Ferretería AP — Importación Producción");
  console.log("═══════════════════════════════════════\n");

  try {
    await limpiarDatos();
    await importarContactos();
    await importarProductos();

    console.log("\n✅ Importación completada exitosamente");
  } catch (e) {
    console.error("\n❌ Error fatal:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
