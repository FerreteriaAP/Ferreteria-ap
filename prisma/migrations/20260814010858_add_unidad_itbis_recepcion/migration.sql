-- AlterTable: conduces — agregar detalle de recepción por ítem
ALTER TABLE "conduces" ADD COLUMN "detallesRecepcion" JSONB;

-- AlterTable: detalles_venta — unidad de venta, precio final con ITBIS, exento
ALTER TABLE "detalles_venta"
  ADD COLUMN "unidad"      TEXT,
  ADD COLUMN "exentoItbis" BOOLEAN NOT NULL DEFAULT false,
  -- precioFinal: para filas existentes usamos precio * 1.18 (o precio si exento)
  ADD COLUMN "precioFinal" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- Rellenar precioFinal en registros existentes con precio × 1.18
UPDATE "detalles_venta" SET "precioFinal" = "precio" * 1.18 WHERE "exentoItbis" = false;

-- Quitar el default temporal (ya no lo necesitamos)
ALTER TABLE "detalles_venta" ALTER COLUMN "precioFinal" DROP DEFAULT;
