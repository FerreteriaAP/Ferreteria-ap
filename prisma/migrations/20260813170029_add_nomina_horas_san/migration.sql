-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "descuentoSan" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorHoraExtra" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "nomina_empleados" ADD COLUMN     "prestamos" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "san" DECIMAL(12,2) NOT NULL DEFAULT 0;
