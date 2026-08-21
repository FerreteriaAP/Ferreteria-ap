-- AlterTable
ALTER TABLE "contactos" ADD COLUMN     "chequeListo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaChequeListo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "alertas_cheque_pago" (
    "id" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "entregadoPorId" TEXT NOT NULL,
    "entregadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vistoPorAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alertas_cheque_pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertas_cheque_pago_vistoPorAdmin_idx" ON "alertas_cheque_pago"("vistoPorAdmin");

-- AddForeignKey
ALTER TABLE "alertas_cheque_pago" ADD CONSTRAINT "alertas_cheque_pago_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_cheque_pago" ADD CONSTRAINT "alertas_cheque_pago_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
