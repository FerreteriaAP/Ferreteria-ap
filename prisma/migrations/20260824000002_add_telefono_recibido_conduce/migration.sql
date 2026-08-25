-- AlterTable: agregar telefonoRecibido a conduces
-- Solo para el conduce — teléfono de quien recibe, no afecta al cliente
ALTER TABLE "conduces" ADD COLUMN IF NOT EXISTS "telefonoRecibido" TEXT;
