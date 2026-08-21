-- NCF único en compras: no puede haber dos facturas con el mismo comprobante fiscal.
-- Usamos un índice parcial (WHERE ncf IS NOT NULL) para permitir múltiples compras sin NCF.
CREATE UNIQUE INDEX "compras_ncf_unique"
  ON "compras"("ncf")
  WHERE "ncf" IS NOT NULL;

-- NCF único en ventas: tampoco se puede emitir el mismo comprobante dos veces.
CREATE UNIQUE INDEX "ventas_ncf_unique"
  ON "ventas"("ncf")
  WHERE "ncf" IS NOT NULL;
