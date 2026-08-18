-- CreateTable
CREATE TABLE "pagos_impuesto" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" TIMESTAMP(3),
    "referencia" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_impuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagos_impuesto_mes_anio_idx" ON "pagos_impuesto"("mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_impuesto_tipo_mes_anio_key" ON "pagos_impuesto"("tipo", "mes", "anio");
