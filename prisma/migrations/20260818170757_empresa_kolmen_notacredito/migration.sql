-- AlterTable
ALTER TABLE "contactos" ADD COLUMN     "margenPrecio" DECIMAL(5,2),
ADD COLUMN     "reglaPrecio" TEXT,
ADD COLUMN     "saldoFavor" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "notas_credito" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "turnoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalles" JSONB,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notas_credito_numero_key" ON "notas_credito"("numero");

-- CreateIndex
CREATE INDEX "notas_credito_clienteId_idx" ON "notas_credito"("clienteId");

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
