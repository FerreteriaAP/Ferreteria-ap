-- Retroactive: generar codigoSeguridad para todas las ventas FACTURADA que no lo tengan
-- Caracteres permitidos: sin O/0/I/1 (para evitar confusión visual)
-- Formato: XXXX-XXXX (4 chars, guion, 4 chars)
-- Ejecutar UNA sola vez en producción. Es idempotente: WHERE "codigoSeguridad" IS NULL.

DO $$
DECLARE
  CHARS TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v     RECORD;
  b1    TEXT;
  b2    TEXT;
  codigo TEXT;
  intentos INT;
  usado BOOLEAN;
BEGIN
  FOR v IN
    SELECT id FROM ventas WHERE tipo = 'FACTURADA' AND "codigoSeguridad" IS NULL
  LOOP
    intentos := 0;
    LOOP
      -- Generar bloque 1 (4 chars)
      b1 := '';
      FOR i IN 1..4 LOOP
        b1 := b1 || substr(CHARS, floor(random() * length(CHARS) + 1)::int, 1);
      END LOOP;
      -- Generar bloque 2 (4 chars)
      b2 := '';
      FOR i IN 1..4 LOOP
        b2 := b2 || substr(CHARS, floor(random() * length(CHARS) + 1)::int, 1);
      END LOOP;
      codigo := b1 || '-' || b2;

      -- Verificar unicidad
      SELECT EXISTS(SELECT 1 FROM ventas WHERE "codigoSeguridad" = codigo) INTO usado;

      EXIT WHEN NOT usado;
      intentos := intentos + 1;
      IF intentos > 100 THEN
        RAISE EXCEPTION 'No se pudo generar código único después de 100 intentos para venta %', v.id;
      END IF;
    END LOOP;

    UPDATE ventas SET "codigoSeguridad" = codigo WHERE id = v.id;
  END LOOP;

  RAISE NOTICE 'Códigos de seguridad generados correctamente.';
END;
$$;

-- Verificación: cuántas ventas quedaron sin código
SELECT COUNT(*) AS sin_codigo
FROM ventas
WHERE tipo = 'FACTURADA' AND "codigoSeguridad" IS NULL;
