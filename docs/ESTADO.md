# Estado del proyecto — Ferretería AP

> Actualizado: 2026-11-20. Leer esto al inicio de cada sesión.

---

## ¿Qué es esta app?

Sistema de gestión interno para **Ferretería AP**, Santo Domingo, República Dominicana.
Corre en un servidor Windows propio y es accesible solo para el equipo de la empresa.

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

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 — App Router, RSC, Server Actions |
| ORM | Prisma 7 + PostgreSQL 17 |
| Auth | Auth.js v5 (beta.32) |
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

**Logo / documentos impresos:** naranja `#f5821f`, negro `#000204`; octógono SVG con "AP" + "FERRETERÍA".

---

## Infraestructura y despliegue

**URLs:**
- Producción: https://ferreteriaap.com
- SSH remoto: `ssh ssh.ferreteriaap.com` (Cloudflare Tunnel)
- Local red: http://10.0.0.117:3000

**Servidor Windows:**
- Usuario: `Administrator`
- Proyecto: `C:\Users\Administrator\ferreteria-ap`
- Log deploy: `C:\Users\Administrator\deploy.log`

**Auto-deploy (activo desde 2026-08-20):**
El servidor tiene una tarea en Task Scheduler (`FerreteriRun`) que revisa GitHub cada ~5 minutos.
Si hay cambios: `git pull → pnpm build → reinicia la app`.
**Después de un `git push` NO hay que hacer nada manual — esperar ~5 min.**

**Arrancar/reiniciar app manualmente (por SSH):**
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

**Cuando hay migraciones nuevas → conectar por SSH y ejecutar:**
```bash
ssh ssh.ferreteriaap.com
```
```powershell
cd C:\Users\Administrator\ferreteria-ap
pnpm prisma migrate deploy
# El build/reinicio lo hace el auto-deploy solo
```

**SSH config Mac (`~/.ssh/config`):**
```
Host ssh.ferreteriaap.com
  ProxyCommand cloudflared access ssh --hostname %h
  User Administrator
```

**Base de datos:**
- PostgreSQL 17, base `ferreteria_ap`, usuario `postgres`
- Columnas con camelCase (Prisma) — en psql usar comillas: `"clienteId"`, `"fechaEmision"`

---

## Cambios en rama main sin deploy (commiteados pero pendientes de producción)

Los siguientes archivos tienen cambios commiteados en la sesión actual y **están en el branch main pero no en producción todavía** — el auto-deploy los subirá al hacer push, o pueden estar esperando verificación previa:

### e-CF (comprobantes fiscales electrónicos) — LISTO PARA PUSH, pendiente verificar

**Qué se hizo:**
1. `prisma/schema.prisma` — Añadidos `E31`, `E32`, `E34` al enum `TipoComprobante`; nuevo modelo `SecuenciaEcf` para llevar el contador de NCF electrónicos por tipo.
2. `src/actions/ecf.ts` *(nuevo)* — Server actions `siguienteNcf(tipo)` y `getSecuenciasEcf()` para consultar/incrementar atómicamente la secuencia.
3. `src/components/ventas/avanzar-venta-buttons.tsx` — Selector E31/E32 en el formulario de facturación; E31 se preselecciona cuando el cliente tiene RNC; opción "Sin comprobante" disponible; campo NCF con placeholder, nota "Se asignará automáticamente al conectar GTI".
4. `src/actions/ventas.ts`, `src/actions/pdv.ts`, `src/actions/contactos.ts` — Ajustes menores relacionados.
5. `src/app/(dashboard)/ventas/[id]/page.tsx` — Muestra tipo NCF en la vista de venta.
6. `src/components/contactos/contacto-form.tsx`, `src/app/(dashboard)/contactos/[id]/editar/page.tsx` — Campo RNC en formulario de contactos.
7. `src/components/pdv/pdv-terminal.tsx`, `src/components/pdv/cliente-rapido-modal.tsx` — Ajustes PDV relacionados con e-CF.
8. `src/components/caja/caja-dashboard.tsx`, `src/components/layout/app-header.tsx` — Ajustes de UI.

**Qué falta antes de hacer push:**
- [ ] Verificar en localhost que el selector E31/E32 y el campo "Sin comprobante" funcionen correctamente en la vista de ventas
- [ ] Después del push: conectar al servidor por SSH y ejecutar `pnpm prisma migrate deploy` (el schema tiene el nuevo modelo `SecuenciaEcf`)
- [ ] Crear las filas de secuencias en producción (INSERT manual o desde Configuración): E31 (hasta=150), E32 (hasta=500)

**Archivos sin commit (no pushear):**
- `.claude/settings.local.json` — config local de Claude Code, no va al repo
- `Ferretería AP_files/` — archivos de sesión/PDFs, no van al repo
- `scripts/merge-ovn-0029-en-0028.cjs` — script one-off de migración, puede ignorarse

---

## Pendientes importantes

### 1. GTI — Integración e-CF (esperando info)
Ferretería AP está registrada con GTI como proveedor de facturación electrónica.
Por ahora el NCF se ingresa manualmente en el formulario de facturación.
Cuando llegue la info de GTI (formato JSON/XML, certificado digital, endpoint), hay que:
- Conectar `siguienteNcf()` con la API de GTI
- Manejar firma digital del XML del comprobante
- Enviar el e-CF a la DGII vía GTI al facturar

### 2. Módulo 607/606 (exportación DGII)
El usuario aún no ha dado los parámetros para generarlo. Preguntarle qué período y formato necesita.

### 3. DB local desincronizada
En localhost hay registros fantasma: `ET-0440` a `ET-0447` (insertados por error) y `COT/2026/0036`.
No son bloqueantes; solo recordar que la DB local tiene datos sucios de prueba.

---

## Decisiones y preferencias del usuario

**Precios siempre con ITBIS incluido** cuando se muestran al cliente o en comparaciones.
El precio s/ITBIS se usa internamente para cálculos de ganancia, pero la comunicación al cliente es siempre c/ITBIS (18%). Nunca mostrar solo el precio neto sin aclararlo.

**Documentos impresos:** usar exactamente el template del sistema (ver `src/app/(dashboard)/ventas/[id]/imprimir/cotizacion/page.tsx` y `src/components/print/logo.tsx`). No inventar layouts nuevos para documentos que salen con la marca FAP.

**Repositorio público:** nunca pushear `.env`, passwords, tokens, datos de clientes ni secretos de ningún tipo.

**Workflow local → producción:**
1. Cambios en Mac con Claude Code
2. `git push` al repo público (sin secrets)
3. Auto-deploy en ~5 min
4. Si hay migraciones: SSH + `pnpm prisma migrate deploy`

**e-CF en producción:** antes de hacer push de cambios de e-CF, verificar en localhost que los selectores y flujo funcionen. No pushear código de facturación sin probar el flujo completo.

**Números:**
- RNC empresa: `1-31-91217-6`
- Tel: `+1 829-584-9708` (WhatsApp)
- Email: `Isai.ferreteria@gmail.com`
- Dirección: Prol. 27 de Febrero No. 452, Santo Domingo, Rep. Dom.

**Formato NCF electrónico (DGII):** `E31XXXXXXXXXX` — tipo 3 chars + 10 dígitos = 13 chars total.
E31 = Crédito Fiscal Electrónico (clientes con RNC).
E32 = Consumo Electrónico (consumidores finales).
E34 = Nota de Crédito Electrónica.

---

## Comandos frecuentes

```bash
# Dev local
pnpm dev

# Build
pnpm build

# Generar cliente Prisma (tras cambio de schema)
pnpm prisma generate

# Migración local
pnpm prisma migrate dev --name nombre_migracion

# Migración producción (desde servidor)
pnpm prisma migrate deploy

# Ver DB local
pnpm prisma studio

# Push a producción
git push origin main
# (auto-deploy hace el resto en ~5 min)
```

---

## Rutas destacadas

| Ruta | Qué hace |
|------|---------|
| `/dashboard` | Home con módulos |
| `/ventas` | Lista de ventas (COT/OV/CON/FAC) |
| `/ventas/[id]` | Detalle + botones avanzar (COT→OV→CON→FAC) |
| `/ventas/[id]/imprimir/cotizacion` | Print template cotización |
| `/ventas/[id]/imprimir/factura` | Print template factura |
| `/pdv` | Punto de venta |
| `/caja` | Gestión de turnos de caja |
| `/contactos` | Clientes y suplidores |
| `/productos` | Inventario |
| `/cxc` | Cuentas por cobrar |
| `/contabilidad` | Gastos y reportes |
| `/configuracion` | Empresa, usuarios, bancos |
