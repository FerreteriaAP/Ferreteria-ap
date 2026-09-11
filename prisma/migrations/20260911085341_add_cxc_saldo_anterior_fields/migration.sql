-- AlterTable: make ventaId optional + add new fields to cuentas_por_cobrar
ALTER TABLE "cuentas_por_cobrar"
  ALTER COLUMN "ventaId" DROP NOT NULL,
  ADD COLUMN "origen"     TEXT NOT NULL DEFAULT 'VENTA',
  ADD COLUMN "referencia" TEXT,
  ADD COLUMN "ncf"        TEXT,
  ADD COLUMN "concepto"   TEXT;

-- Add index on origen
CREATE INDEX "cuentas_por_cobrar_origen_idx" ON "cuentas_por_cobrar"("origen");

-- Add FECHA_INICIO_SISTEMA to configuracion (go-live cutoff date)
INSERT INTO "configuracion" ("id", "clave", "valor", "descripcion", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'FECHA_INICIO_SISTEMA',
  '2026-08-29',
  'Fecha desde la cual el sistema está en producción. Ventas anteriores son SALDO_ANTERIOR.',
  NOW()
)
ON CONFLICT ("clave") DO UPDATE SET "valor" = EXCLUDED."valor", "updatedAt" = NOW();
