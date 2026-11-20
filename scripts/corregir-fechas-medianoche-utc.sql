-- Corrige fechas "sin hora" guardadas como medianoche UTC.
--
-- Antes, las acciones guardaban los <input type="date"> con new Date("YYYY-MM-DD"),
-- que es medianoche UTC = 8:00 p. m. del día ANTERIOR en RD. Por eso los listados
-- mostraban un día antes y los filtros por mes dejaban fuera el día 1.
-- El código ahora guarda a mediodía UTC (fechaInputRD en src/lib/fechas.ts).
-- Este script mueve los registros viejos a esa misma hora (+12 h): la fecha de
-- calendario que el usuario eligió no cambia, solo deja de verse corrida.
--
-- Criterio: valor exactamente a las 00:00:00.000 UTC. Un new Date() real casi
-- nunca cae justo ahí, así que esos registros vienen de un campo de fecha.
-- Es idempotente: después de correrlo, esos valores quedan a las 12:00 y no se
-- vuelven a tocar.
--
-- USO (en el servidor, DESPUÉS de desplegar el código nuevo y CON BACKUP):
--   pg_dump -Fc ferreteria_ap > C:\backup-antes-fechas.dump
--   psql -d ferreteria_ap
--   ferreteria_ap=# \i scripts/corregir-fechas-medianoche-utc.sql
-- Revisa los conteos "UPDATE n" y, si todo cuadra, escribe COMMIT; si no, ROLLBACK;
-- (No uses psql -f: al terminar el archivo descarta la transacción abierta.)

\set ON_ERROR_STOP on
BEGIN;
UPDATE "compras" SET "fechaFactura" = "fechaFactura" + interval '12 hours' WHERE "fechaFactura"::time = '00:00:00';
UPDATE "compras" SET "fechaVencimiento" = "fechaVencimiento" + interval '12 hours' WHERE "fechaVencimiento"::time = '00:00:00';
UPDATE "cuentas_por_cobrar" SET "fechaEmision" = "fechaEmision" + interval '12 hours' WHERE "fechaEmision"::time = '00:00:00';
UPDATE "cuentas_por_cobrar" SET "fechaVencimiento" = "fechaVencimiento" + interval '12 hours' WHERE "fechaVencimiento"::time = '00:00:00';
UPDATE "cuentas_por_pagar" SET "fechaEmision" = "fechaEmision" + interval '12 hours' WHERE "fechaEmision"::time = '00:00:00';
UPDATE "cuentas_por_pagar" SET "fechaVencimiento" = "fechaVencimiento" + interval '12 hours' WHERE "fechaVencimiento"::time = '00:00:00';
UPDATE "empleados" SET "fechaIngreso" = "fechaIngreso" + interval '12 hours' WHERE "fechaIngreso"::time = '00:00:00';
UPDATE "empleados" SET "fechaNacimiento" = "fechaNacimiento" + interval '12 hours' WHERE "fechaNacimiento"::time = '00:00:00';
UPDATE "gastos" SET "fecha" = "fecha" + interval '12 hours' WHERE "fecha"::time = '00:00:00';
UPDATE "nominas" SET "fechaPago" = "fechaPago" + interval '12 hours' WHERE "fechaPago"::time = '00:00:00';
UPDATE "ordenes_compra" SET "fechaEntrega" = "fechaEntrega" + interval '12 hours' WHERE "fechaEntrega"::time = '00:00:00';
UPDATE "pagos_compra" SET "fecha" = "fecha" + interval '12 hours' WHERE "fecha"::time = '00:00:00';
UPDATE "pagos_venta" SET "fecha" = "fecha" + interval '12 hours' WHERE "fecha"::time = '00:00:00';
UPDATE "ventas" SET "fechaEntrega" = "fechaEntrega" + interval '12 hours' WHERE "fechaEntrega"::time = '00:00:00';
UPDATE "transacciones_bancarias" SET "fecha" = "fecha" + interval '12 hours' WHERE "fecha"::time = '00:00:00';
UPDATE "pagos_impuesto" SET "fechaPago" = "fechaPago" + interval '12 hours' WHERE "fechaPago"::time = '00:00:00';

-- Termina con COMMIT; (aplicar) o ROLLBACK; (descartar).
