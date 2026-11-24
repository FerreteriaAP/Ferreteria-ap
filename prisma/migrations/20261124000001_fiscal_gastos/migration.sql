-- Datos del comprobante fiscal del suplidor en gastos y en gastos/compras de caja (Formato 606).
-- Solo agrega columnas; IF NOT EXISTS para poder aplicarla a mano sin riesgo.

ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "suplidorRnc" TEXT;
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "suplidorNombre" TEXT;
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "ncf" TEXT;
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "tipo606" TEXT;
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "esServicio" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "suplidorRnc" TEXT;
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "suplidorNombre" TEXT;
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "ncf" TEXT;
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "itbis" DECIMAL(12,2);
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "tipo606" TEXT;
