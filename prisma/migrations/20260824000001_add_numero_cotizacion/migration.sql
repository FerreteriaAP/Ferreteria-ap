-- AlterTable: agregar numeroCotizacion a ventas
-- Se preserva el número original de cotización aunque el documento avance a OV/CDC/FAC
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "numeroCotizacion" TEXT;
