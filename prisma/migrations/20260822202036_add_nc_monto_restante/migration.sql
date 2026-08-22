-- AlterTable: agrega montoRestante con DEFAULT 0 para no romper filas existentes
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "montoRestante" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: para NCs ya existentes, montoRestante = monto (crédito completo disponible)
UPDATE "notas_credito" SET "montoRestante" = "monto" WHERE "montoRestante" = 0 AND "estado" = 'PENDIENTE';
