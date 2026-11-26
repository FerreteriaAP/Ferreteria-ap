# Plan de corte: facturación electrónica (e-CF) en producción

> Acordado con Isai el 2026-11-24. Arranque previsto: **1 de diciembre de 2026** (corte el domingo 30 de noviembre por la tarde o noche).
> Rama: `feat/ecf-krp`. Detalles técnicos en `docs/ESTADO.md` y en `CORTE.md` / `INSTALACION.md` del paquete del conector KRP.

## 1. Pruebas que faltan (en la Mac, ambiente de pruebas)
- [ ] Escanear los QR del **E31** y del **E32**: la DGII debe decir **Aceptado**.
- [ ] **Nota de crédito E34** sobre la factura de Consultora Kolmen (FAC/2026/0362, E310000000002).
- [ ] Descargar el **606 y el 607** de noviembre (TXT y Excel) y validar el TXT del 606 con la **herramienta de pre-validación de la DGII**.
- [ ] Reimprimir la factura carta (QR compacto a la izquierda) y una factura con 15 a 20 artículos.

Ya probado: E32 y E31 aceptados en TesteCF, "Sin comprobante", impresión carta y ticket, recuperación con "Emitir e-CF" cuando el conector no responde.

## 2. Datos que Isai busca en la OFV
- [ ] **Rangos de producción autorizados** E31, E32 y E34: número de autorización, desde, hasta y vencimiento.
  - ⚠️ Según las notas, **E32 solo llega a 500**: se acaba rápido. Pedir un rango más grande antes del corte.
- [ ] Confirmar con GTI o en la OFV si **ya se usó algún número**. Si sí, el conector arranca desde el siguiente (`--siguiente`).

## 3. Día del corte (en orden)
1. **Backup** de la base de producción (`pg_dump -U postgres -Fc ferreteria_ap > C:\backup-antes-ecf.dump`).
2. **Aplicar las 2 migraciones** en producción, **antes** de publicar el código. Solo agregan columnas:
   - `prisma/migrations/20261124000000_ecf_conector/migration.sql`
   - `prisma/migrations/20261124000001_fiscal_gastos/migration.sql`
3. **Publicar el código:** fusionar `feat/ecf-krp` en `main` con el e-CF **apagado** (`ECF_ACTIVO=false`). Comprobar que la app sigue igual.
4. **Servidor:**
   - en el `.env` de la app: `ECF_URL=http://127.0.0.1:8085` y `ECF_API_KEY` (clave de `C:\KRP_ECF\config\config.toml`);
   - en el conector: registrar los **rangos reales** (`secuencia-agregar --ambiente produccion ...`) y cambiar `ambiente = "produccion"` en `config.toml`;
   - correr `verificar` y reiniciar el servicio.
5. ✅ *(hecho el 2026-11-26)* **Cloudflare:** publicar `fe.ferreteriaap.com` → `localhost:8086`, con reglas para que no bloquee a la DGII (INSTALACION.md §6). Comprobar desde fuera:
   - `/fe/autenticacion/api/semilla` debe dar 200;
   - `/fe/recepcion/api/ecf` debe dar 405.
6. **OFV → Mantenimiento Directorio FE:** cambiar las 3 URLs (Autenticación, Recepción, Aprobación Comercial) de GTI a `https://fe.ferreteriaap.com/...`.
7. **Encender:** `ECF_ACTIVO=true` en el `.env` y reiniciar la app (`schtasks /End` y `/Run` de `FerreteriRun`).
8. **Primera venta real pequeña de consumo (E32):** debe quedar `aceptado`, y el QR debe decir **Aceptado** en la DGII.
9. Con eso funcionando:
   - activar la seguridad del receptor (`exigir_token = true`, `exigir_firma_valida = true`);
   - dar de baja GTI.

**Túnel de Cloudflare (2026-11-26):**
- `C:\Users\Administrator\.cloudflared\config.yml` ahora incluye `fe.ferreteriaap.com → http://localhost:8086`. Backup en `config.yml.bak-20261126`.
- Se creó el DNS de `fe` con `cloudflared tunnel route dns`.
- El túnel ahora arranca solo con la tarea **"Cloudflared Tunnel"** (SYSTEM, al iniciar el servidor, se reinicia si falla). Antes no arrancaba solo tras un reinicio.
- Comprobado desde fuera: semilla 200; recepción y aprobación comercial 405 (correcto: solo aceptan POST); ferreteriaap.com sigue arriba.
- Pendiente: en el panel de Cloudflare, regla para no desafiar a la DGII en `fe.ferreteriaap.com` (Bot Fight Mode / WAF).

**Vuelta atrás:** `ECF_ACTIVO=false` y reiniciar la app. La app sigue facturando como antes.
