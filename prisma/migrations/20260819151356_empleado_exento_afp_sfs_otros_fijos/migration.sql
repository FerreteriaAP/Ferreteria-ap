-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "exentoAfp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exentoSfs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otrosDescuentosFijos" DECIMAL(12,2) NOT NULL DEFAULT 0;
