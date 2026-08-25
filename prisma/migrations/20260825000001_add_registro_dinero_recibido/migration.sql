-- CreateTable
CREATE TABLE "registros_dinero_recibido" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "montoCierre" DECIMAL(12,2) NOT NULL,
    "montoAperturaSig" DECIMAL(12,2),
    "efectivoEsperado" DECIMAL(12,2) NOT NULL,
    "montoRecibido" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "notas" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_dinero_recibido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registros_dinero_recibido_turnoId_key" ON "registros_dinero_recibido"("turnoId");

-- AddForeignKey
ALTER TABLE "registros_dinero_recibido" ADD CONSTRAINT "registros_dinero_recibido_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos_caja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_dinero_recibido" ADD CONSTRAINT "registros_dinero_recibido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
