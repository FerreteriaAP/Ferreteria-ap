-- e-CF con el Conector KRP. Solo agrega columnas nullables: no toca datos existentes.
-- IF NOT EXISTS para poder aplicarla a mano en producción sin riesgo si se corre dos veces.

ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfTipo" INTEGER;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfEncf" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfEstado" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfCodigoSeguridad" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfFechaFirma" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfFechaVencSecuencia" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfQrUrl" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfMensajes" JSONB;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfError" TEXT;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "ecfActualizado" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "ventas_ecfEncf_key" ON "ventas"("ecfEncf");

ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfTipo" INTEGER;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfEncf" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfEstado" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfCodigoSeguridad" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfFechaFirma" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfFechaVencSecuencia" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfQrUrl" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfMensajes" JSONB;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfError" TEXT;
ALTER TABLE "notas_credito" ADD COLUMN IF NOT EXISTS "ecfActualizado" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "notas_credito_ecfEncf_key" ON "notas_credito"("ecfEncf");
