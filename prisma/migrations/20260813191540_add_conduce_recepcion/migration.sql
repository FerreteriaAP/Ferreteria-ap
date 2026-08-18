-- AlterTable
ALTER TABLE "conduces" ADD COLUMN     "clienteRecibio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaRecepcion" TIMESTAMP(3);
