/*
  Warnings:

  - Added the required column `montoRestante` to the `notas_credito` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notas_credito" ADD COLUMN     "montoRestante" DECIMAL(12,2) NOT NULL;
