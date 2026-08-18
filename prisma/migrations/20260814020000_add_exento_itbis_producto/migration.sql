-- AlterTable: productos — marcar si el producto está exento de ITBIS
ALTER TABLE "productos" ADD COLUMN "exentoItbis" BOOLEAN NOT NULL DEFAULT false;
