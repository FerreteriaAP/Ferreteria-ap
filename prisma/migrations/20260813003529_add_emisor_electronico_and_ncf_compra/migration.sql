-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "ncf" TEXT,
ADD COLUMN     "tipoNcfCompra" TEXT;

-- AlterTable
ALTER TABLE "contactos" ADD COLUMN     "esEmisorElectronico" BOOLEAN NOT NULL DEFAULT false;
