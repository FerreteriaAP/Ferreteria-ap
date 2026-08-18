-- AlterEnum
ALTER TYPE "EstadoVenta" ADD VALUE 'PDV_PENDIENTE';

-- AlterTable
ALTER TABLE "movimientos_caja" ADD COLUMN     "confirmado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmadoPor" TEXT,
ADD COLUMN     "cxcId" TEXT,
ADD COLUMN     "empleadoId" TEXT,
ADD COLUMN     "fechaConfirmacion" TIMESTAMP(3),
ADD COLUMN     "subTipo" TEXT;
