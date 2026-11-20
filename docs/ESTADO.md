# Estado del proyecto — Ferretería AP

> Actualizado: 2026-11-20 (tarde). Leer esto al inicio de cada sesión.

---

## ¿Qué es esta app?

Sistema de gestión interno de **Ferretería AP**, Santo Domingo, República Dominicana.
Corre en un servidor Windows propio y solo lo usa el equipo de la empresa.

**Módulos activos:**
- Ventas (cotizaciones → órdenes → conduces → facturas)
- PDV / Caja (punto de venta con turnos)
- Inventario (productos, categorías, alertas de stock)
- CxC / CxP (cuentas por cobrar y por pagar)
- Clientes y suplidores (contactos)
- Compras y órdenes de compra
- Contabilidad (gastos, reportes, cierres)
- Nóminas y préstamos a empleados
- Configuración (empresa, usuarios, bancos, vendedores)

**Proyecto hermano:** Atrio Business (`~/Documents/Compañias/Atrio Business/atrio-business`, repo `FerreteriaAP/atrio-business`) es la versión comercial de esta app. Nació como copia del código y tiene su propia marca y su propia base.
- Los arreglos que se hacen en una app suelen aplicar a la otra: hay que portarlos.
- Atrio tiene su propio `docs/ESTADO.md`.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.3 — App Router, RSC, Server Actions (ver `AGENTS.md`: hay cambios que rompen compatibilidad, consultar `node_modules/next/dist/docs/`) |
| ORM | Prisma 7 + PostgreSQL |
| Auth | Auth.js v5 (beta.32), login por credenciales |
| Package manager | pnpm |
| OS servidor | Windows Server (Task Scheduler) |
| Tunnel | Cloudflare Tunnel |

**Paleta dark-ops (tema principal):**
```
--background:        #111923
--card:              #1A2330
--border:            #29333D
--accent-hex:        #F47717  (naranja)
--foreground:        #F5F7FA
--muted-foreground:  #8A9BB0
```

**Logo / documentos impresos:** naranja `#f5821f`, negro `#000204`; octógono SVG con "AP" + "FERRETERÍA" (`src/components/print/logo.tsx`).

---

## Desarrollo local (Mac)

- El dev server lo mantiene **pm2** con `~/Documents/Compañias/ecosystem.config.cjs`:
  - app `ferreteria-ap` → `next dev --turbopack --port 3000`;
  - en el mismo archivo está `atrio-business` en el puerto 3001.
- `pm2 restart ferreteria-ap` · `pm2 logs ferreteria-ap`
- Base local: `postgresql://isaiabreu@localhost:5432/ferreteria_ap`.
  - Es una **copia vieja**: los datos llegan hasta septiembre de 2026.
  - Tiene datos sucios de prueba: `ET-0440` a `ET-0447` y `COT/2026/0036`.
- La base local se ha mantenido con `db push`, así que **va por delante de las migraciones** (ver Pendientes). **No ejecutes `prisma migrate dev` contra ella**: Prisma detectaría la diferencia y pediría resetearla, y se perderían los datos.
- Para probar migraciones, usa una base temporal:

  ```bash
  createdb fa_mig_tmp
  DATABASE_URL="postgresql://isaiabreu@localhost:5432/fa_mig_tmp?schema=public" ./node_modules/.bin/prisma migrate deploy
  dropdb fa_mig_tmp
  ```

- `pg_dump` de Homebrew (v17) no sirve con el servidor local (Postgres.app v18). Usa `/Applications/Postgres.app/Contents/Versions/18/bin/pg_dump`.
- Para revisar la app en el navegador del panel de Claude hay que iniciar sesión **en el panel**: la sesión de Safari no sirve.

---

## Infraestructura y despliegue

**URLs:**
- Producción: https://ferreteriaap.com
- SSH remoto: `ssh ssh.ferreteriaap.com` (Cloudflare Tunnel)
- Red local: http://10.0.0.117:3000

**Servidor Windows:**
- Usuario: `Administrator`
- Proyecto: `C:\Users\Administrator\ferreteria-ap`
- Base: PostgreSQL, base `ferreteria_ap`, usuario `postgres`. Columnas en camelCase: en psql van con comillas (`"clienteId"`, `"fechaEmision"`).

**Auto-deploy.** Lo montan `setup-autodeploy.ps1` y `scripts/setup-runner.ps1`, con dos tareas programadas:

| Tarea | Qué hace |
|---|---|
| `FerreteriaDeploy` | Corre `deploy.ps1` **cada minuto** |
| `FerreteriRun` | Corre la app (`next start`, puerto 3000) |

`deploy.ps1` hace dos cosas:
1. **Watchdog:** si nada escucha en el puerto 3000, levanta `FerreteriRun`.
2. **Deploy:** si `origin/main` tiene commits nuevos, hace `git pull` y `pnpm build`, y reinicia `FerreteriRun`.

Datos útiles:
- Log: `C:\deploy.log`.
- Pausar deploys: `New-Item C:\KILLSWITCH_ACTIVE`. Reanudar: `Remove-Item C:\KILLSWITCH_ACTIVE`.
- **Cada push a `main` se publica en ~1 minuto y reinicia la app**, aunque solo cambie documentación.
- **`deploy.ps1` NO corre migraciones ni `pnpm install`.** Si cambia el schema o las dependencias, hay que hacerlo a mano por SSH.
- `scripts/auto-deploy.ps1` es un despliegue **viejo y peligroso**: hace `taskkill /F /IM node.exe` y mata todos los procesos de Node del servidor. No se usa; no lo ejecutes. En Atrio ya se borró.

**Reiniciar la app a mano (por SSH):**
```powershell
cd C:\Users\Administrator\ferreteria-ap
schtasks /End /TN "FerreteriRun"
schtasks /Run /TN "FerreteriRun"
```

**Si el auto-deploy se traba:**
```powershell
cd C:\Users\Administrator\ferreteria-ap
git checkout -- <archivo-en-conflicto>
git pull origin main
pnpm prisma generate   # solo si cambió schema.prisma
pnpm build
schtasks /End /TN "FerreteriRun"
schtasks /Run /TN "FerreteriRun"
```

**Migraciones en producción (por SSH):**
```powershell
cd C:\Users\Administrator\ferreteria-ap
pnpm prisma migrate deploy
```

**SSH config Mac (`~/.ssh/config`):**
```
Host ssh.ferreteriaap.com
  ProxyCommand cloudflared access ssh --hostname %h
  User Administrator
```

---

## Qué se hizo el 20 nov 2026

### 1. e-CF (comprobantes fiscales electrónicos): commit `39726d2`, YA en `main` y desplegado
1. `prisma/schema.prisma`: `E31`, `E32`, `E34` en el enum `TipoComprobante`, y nuevo modelo `SecuenciaEcf` (tabla `secuencias_ecf`) con el contador de NCF por tipo.
2. `src/actions/ecf.ts` (nuevo): `siguienteNcf(tipo)` y `getSecuenciasEcf()`.
3. `src/components/ventas/avanzar-venta-buttons.tsx`:
   - selector E31/E32 al facturar;
   - E31 preseleccionado si el cliente tiene RNC;
   - opción "Sin comprobante";
   - campo NCF con la nota "Se asignará automáticamente al conectar GTI".
4. Ajustes en:
   - `src/actions/ventas.ts`, `pdv.ts` y `contactos.ts`;
   - la vista de venta (muestra el tipo de NCF);
   - el formulario de contactos (campo RNC);
   - el PDV, Caja y el header.

**⚠️ Ver Pendiente 1:** la base de producción puede no tener lo que e-CF necesita.

### 2. Fechas en hora de RD: commit `2dad6e7`, fusionado en `1f68d2c`, en `main`
Viene de Atrio Business. Había dos errores:
- **"Hoy" en UTC.** `new Date().toISOString().slice(0, 10)` da la fecha de mañana desde las 8 p. m. en RD. Pasaba en unos 20 formularios y reportes: gastos, pagos, cobros, compras, órdenes de compra, nómina, bancos, empleados, reportes y crédito en Caja. Ahora se usa `hoyRD()`, `mesRD()` y `sumarDiasRD()` de `src/lib/fechas.ts`.
- **Fechas sin hora guardadas como medianoche UTC.** `new Date("YYYY-MM-DD")` es el día anterior en RD, así que los listados mostraban un día antes y los filtros por mes dejaban fuera el día 1. Ahora todas las acciones usan `fechaInputRD()`, que guarda a mediodía UTC, igual que ya hacía `compras.ts`.
- **Los registros viejos siguen corridos** hasta correr el script (ver Pendiente 2).

---

## Pendientes

### 1. 🔴 Migraciones atrasadas respecto al schema (afecta e-CF en producción)
Aplicar las 28 migraciones de `prisma/migrations` sobre una base vacía no da el schema actual. Faltan:
- `E31`, `E32`, `E34` en `TipoComprobante`;
- la tabla `secuencias_ecf`;
- las tablas `gastos_fijos` y `solicitudes_sin_stock`;
- las columnas `ventas.codigoSeguridad` y `detalles_venta.costoAlVender`;
- `ON DELETE SET NULL` en `cuentas_por_cobrar.ventaId`;
- quitar el valor por defecto de `notas_credito.montoRestante`.

La base local sí lo tiene todo, por `db push`. **No se sabe cómo está la de producción.** Si le falta `E31`/`E32` o `secuencias_ecf`, facturar con e-CF falla. **`prisma migrate deploy` NO lo arregla, porque no hay migración que lo cree.**

Pasos:
1. Por SSH, en el servidor, ver qué tiene la base de producción:
   ```powershell
   cd C:\Users\Administrator\ferreteria-ap
   .\node_modules\.bin\prisma.cmd migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
   ```
   Si solo propone `DROP INDEX ..._trgm`, producción está al día y basta con el paso 3.
2. Si falta algo, aplicar solo eso con backup previo. **No** apliques los `DROP INDEX *_trgm`: borrarían los índices de búsqueda.
3. Crear en el repo una migración que sincronice, como la de Atrio (`20261120000001_sync_schema_servicio_gastos_fijos`, más lo de e-CF). Probarla en una base temporal y marcarla como aplicada en producción con `prisma migrate resolve --applied <nombre>`.
4. Crear las secuencias en producción: E31 (`hasta` = 150) y E32 (`hasta` = 500).

Además, falta verificar en localhost el flujo completo de e-CF (selector E31/E32, "Sin comprobante"). El código ya está en producción sin esa prueba.

### 2. 🟠 Corregir fechas viejas en producción
`scripts/corregir-fechas-medianoche-utc.sql` mueve a mediodía UTC los registros guardados a medianoche UTC, en 16 columnas.
- Es idempotente.
- Se probó en una copia de la base local: corrigió 30 ventas, 76 CxC, etc.

En el servidor:
```powershell
pg_dump -Fc ferreteria_ap > C:\backup-antes-fechas.dump
psql -d ferreteria_ap
ferreteria_ap=# \i scripts/corregir-fechas-medianoche-utc.sql
-- revisar los "UPDATE n" y escribir COMMIT;  (o ROLLBACK;)
```
No uses `psql -f`: al terminar el archivo descarta la transacción.

### 3. Zona horaria del servidor
Debe ser la de RD (`SA Western Standard Time`, UTC−4). `rangoFechas()` (`src/lib/rangos.ts`) arma los rangos de reportes con la hora de la máquina. Comprobar con `tzutil /g`.

### 4. GTI: integración e-CF (esperando info)
Ferretería AP está registrada con GTI como proveedor de facturación electrónica. Por ahora el NCF se escribe a mano al facturar. Cuando llegue la información de GTI (formato JSON/XML, certificado digital, endpoint), hay que:
- conectar `siguienteNcf()` con la API de GTI;
- manejar la firma digital del XML;
- enviar el e-CF a la DGII vía GTI al facturar.

### 5. Módulo 607/606 (exportación DGII)
Isai aún no ha dado los parámetros. Preguntarle qué período y qué formato necesita.

### 6. Limpieza
- Borrar el worktree de la rama de fechas, que ya no hace falta: `git worktree remove ../ferreteria-ap-fechas` (y luego `git branch -d fix/fechas-rd`).
- `.env` local tiene `NEXTAUTH_URL` repetido.
- `.env.example` no está en git: el `.gitignore` excluye `.env*`.

---

## Decisiones y preferencias de Isai

**Responder siempre en español.**

**Precios siempre con ITBIS incluido** cuando se muestran al cliente o en comparaciones. El precio sin ITBIS se usa internamente para calcular la ganancia, pero al cliente siempre se le comunica con ITBIS (18%). Nunca mostrar solo el precio neto sin aclararlo.

**Documentos impresos:** usar exactamente el template del sistema (ver `src/app/(dashboard)/ventas/[id]/imprimir/cotizacion/page.tsx` y `src/components/print/logo.tsx`). No inventar layouts nuevos para documentos con la marca FAP.

**Repositorio público:** nunca subir `.env`, contraseñas, tokens, datos de clientes ni secretos de ningún tipo.

**No tocar el trabajo sin commitear de Isai.** Si `main` tiene cambios locales que se cruzan con la tarea, trabajar en una rama o worktree aparte sacado de `origin/main`.

**Antes de hacer push a `main`** (que despliega):
- hacer `git fetch` y fusionar lo que haya entrado;
- revisar que compila;
- no pisar commits de otras sesiones.

**Colores:** nada de colores fijos en componentes. Todo va por variables CSS del tema (`var(--accent-hex)`, `var(--card)`, `color-mix(...)`).

**Fechas:**
- Nunca usar `new Date().toISOString().slice(0, 10)` para "hoy": usar `hoyRD()`.
- Nunca usar `new Date("YYYY-MM-DD")` para guardar: usar `fechaInputRD()`. Ambas están en `src/lib/fechas.ts`.

**Contraseñas:** nunca pedir ni escribir la contraseña real de un usuario. Si hace falta entrar, que Isai inicie sesión en el panel del navegador.

**Workflow local → producción:**
1. Cambios en la Mac con Claude Code.
2. `git push` a `main` (repo público, sin secretos).
3. Auto-deploy en ~1 minuto.
4. Si hay migraciones: SSH y `pnpm prisma migrate deploy`.

**e-CF:** no subir código de facturación sin probar el flujo completo en localhost.

**Datos de la empresa:**
- RNC: `1-31-91217-6`
- Tel.: `+1 829-584-9708` (WhatsApp)
- Email: `Isai.ferreteria@gmail.com`
- Dirección: Prol. 27 de Febrero No. 452, Santo Domingo, Rep. Dom.

**Formato del NCF electrónico (DGII):** `E31XXXXXXXXXX`, es decir, 3 caracteres de tipo + 10 dígitos = 13 caracteres.
- E31 = Crédito Fiscal Electrónico (clientes con RNC).
- E32 = Consumo Electrónico (consumidores finales).
- E34 = Nota de Crédito Electrónica.

---

## Comandos frecuentes

```bash
# Dev local (normalmente ya corre con pm2 en el puerto 3000)
pnpm dev

# Build
pnpm build

# Generar cliente Prisma (tras cambio de schema)
pnpm prisma generate

# Comparar una base con el schema (no cambia nada)
./node_modules/.bin/prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

# Migración en producción (desde el servidor)
pnpm prisma migrate deploy

# Ver la base local
pnpm prisma studio

# Push a producción (despliega en ~1 minuto)
git push origin main
```

---

## Rutas destacadas

| Ruta | Qué hace |
|------|---------|
| `/dashboard` | Home con módulos |
| `/ventas` | Lista de ventas (COT/OV/CON/FAC) |
| `/ventas/[id]` | Detalle + botones para avanzar (COT→OV→CON→FAC) |
| `/ventas/[id]/imprimir/cotizacion` | Plantilla de impresión: cotización |
| `/ventas/[id]/imprimir/factura` | Plantilla de impresión: factura |
| `/pdv` | Punto de venta |
| `/caja` | Gestión de turnos de caja |
| `/contactos` | Clientes y suplidores |
| `/productos` | Inventario |
| `/cxc` | Cuentas por cobrar |
| `/contabilidad` | Gastos y reportes |
| `/configuracion` | Empresa, usuarios, bancos |
