-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'ASISTENTE_ADMINISTRATIVO', 'VENDEDOR', 'CAJA');

-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('CLIENTE', 'SUPLIDOR', 'AMBOS');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('B01', 'B02', 'B14', 'B15');

-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('COTIZACION', 'ORDEN_VENTA', 'CONDUCE', 'FACTURADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoCredito" AS ENUM ('DIAS_30', 'DIAS_45', 'DIAS_60', 'CONTADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "CategoriaInventario" AS ENUM ('CTC', 'FT', 'ET', 'PL');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA_COMPRA', 'ENTRADA_AJUSTE', 'SALIDA_VENTA', 'SALIDA_AJUSTE', 'SALIDA_DEVOLUCION', 'ENTRADA_DEVOLUCION');

-- CreateEnum
CREATE TYPE "EstadoEmpleado" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('FIJO', 'VARIABLE');

-- CreateEnum
CREATE TYPE "TipoCuentaBancaria" AS ENUM ('CORRIENTE', 'AHORROS');

-- CreateEnum
CREATE TYPE "TipoTransaccionBancaria" AS ENUM ('DEPOSITO', 'RETIRO', 'TRANSFERENCIA', 'CHEQUE', 'DEBITO_AUTOMATICO');

-- CreateEnum
CREATE TYPE "PeriodoNomina" AS ENUM ('PRIMERA_QUINCENA', 'SEGUNDA_QUINCENA');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'VENDEDOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empleadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "cargo" TEXT NOT NULL,
    "departamento" TEXT,
    "salarioBase" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoEmpleado" NOT NULL DEFAULT 'ACTIVO',
    "nss" TEXT,
    "afp" TEXT,
    "sfs" TEXT,
    "cuentaBancaria" TEXT,
    "bancoCuenta" TEXT,
    "tipoCuenta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoContacto" NOT NULL DEFAULT 'CLIENTE',
    "nombre" TEXT NOT NULL,
    "nombreLegal" TEXT,
    "rnc" TEXT,
    "tipoComprobante" "TipoComprobante" NOT NULL DEFAULT 'B02',
    "email" TEXT,
    "telefono" TEXT,
    "telefonoAlt" TEXT,
    "credito" "TipoCredito" NOT NULL DEFAULT 'CONTADO',
    "limiteCredito" DECIMAL(12,2),
    "descuentoFijo" DECIMAL(5,2),
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direcciones_entrega" (
    "id" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "sector" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Santo Domingo',
    "provincia" TEXT,
    "referencia" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direcciones_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "codigo" "CategoriaInventario" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoriaId" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL DEFAULT 'UND',
    "esFraccionable" BOOLEAN NOT NULL DEFAULT false,
    "unidadFraccion" TEXT,
    "factorFraccion" DECIMAL(10,4),
    "costoPromedio" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "costoUltimo" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "porcentajeGanancia" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "precioVenta" DECIMAL(12,2) NOT NULL,
    "precioMayoreo" DECIMAL(12,2),
    "stockActual" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "stockMaximo" DECIMAL(12,4),
    "imagen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "TipoMovimientoInventario" NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "stockAntes" DECIMAL(12,4) NOT NULL,
    "stockDespues" DECIMAL(12,4) NOT NULL,
    "costo" DECIMAL(12,4),
    "referencia" TEXT,
    "tipoRef" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_inventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_especiales" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(5,2),
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precios_especiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "suplidorId" TEXT NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "notas" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_orden_compra" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "cantRecibida" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "costo" DECIMAL(12,4) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalles_orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "suplidorId" TEXT NOT NULL,
    "ordenCompraId" TEXT,
    "noFacturaSuplidor" TEXT,
    "fechaFactura" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_compra" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "costo" DECIMAL(12,4) NOT NULL,
    "costoAnterior" DECIMAL(12,4),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "detalles_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_compra" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "adjunto" TEXT,
    "notas" TEXT,
    "cuentaId" TEXT,

    CONSTRAINT "pagos_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "EstadoVenta" NOT NULL DEFAULT 'COTIZACION',
    "clienteId" TEXT NOT NULL,
    "direccionId" TEXT,
    "vendedorId" TEXT,
    "creadorId" TEXT NOT NULL,
    "cotizacionId" TEXT,
    "ordenVentaId" TEXT,
    "conduceId" TEXT,
    "ncf" TEXT,
    "tipoNcf" "TipoComprobante",
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "credito" "TipoCredito" NOT NULL DEFAULT 'CONTADO',
    "diasCredito" INTEGER,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "precio" DECIMAL(12,4) NOT NULL,
    "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conduces" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'OUT',
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firmaEntregado" TEXT,
    "firmaRecibido" TEXT,
    "firmaChofer" TEXT,
    "observaciones" TEXT,
    "impreso" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conduces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_venta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "notas" TEXT,
    "cuentaId" TEXT,

    CONSTRAINT "pagos_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_por_cobrar" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(12,2) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_por_cobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_por_pagar" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "suplidorId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(12,2) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_por_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_bancarias" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoCuentaBancaria" NOT NULL DEFAULT 'CORRIENTE',
    "saldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones_bancarias" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "tipo" "TipoTransaccionBancaria" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "saldoAntes" DECIMAL(12,2) NOT NULL,
    "saldoDespues" DECIMAL(12,2) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjunto" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacciones_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_gasto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoGasto" NOT NULL DEFAULT 'VARIABLE',
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT,
    "cuentaId" TEXT,
    "adjunto" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "periodo" "PeriodoNomina" NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "totalBruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDescuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNeto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomina_empleados" (
    "id" TEXT NOT NULL,
    "nominaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "salarioBase" DECIMAL(12,2) NOT NULL,
    "horasExtra" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "montoHorasExtra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bono" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sam" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otrosIngresos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalBruto" DECIMAL(12,2) NOT NULL,
    "afpEmpleado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sfsEmpleado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "afpEmpleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sfsEmpleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otrosDescuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDescuentos" DECIMAL(12,2) NOT NULL,
    "totalNeto" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "nomina_empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secuencias_documento" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prefijo" TEXT NOT NULL,
    "siguiente" INTEGER NOT NULL DEFAULT 1,
    "digitos" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secuencias_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empleadoId_key" ON "usuarios"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_cedula_key" ON "empleados"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "contactos_rnc_key" ON "contactos"("rnc");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigoBarras_key" ON "productos"("codigoBarras");

-- CreateIndex
CREATE INDEX "productos_nombre_idx" ON "productos"("nombre");

-- CreateIndex
CREATE INDEX "productos_codigoBarras_idx" ON "productos"("codigoBarras");

-- CreateIndex
CREATE INDEX "movimientos_inventario_productoId_createdAt_idx" ON "movimientos_inventario"("productoId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "precios_especiales_productoId_contactoId_key" ON "precios_especiales"("productoId", "contactoId");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_numero_key" ON "ordenes_compra"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "compras_numero_key" ON "compras"("numero");

-- CreateIndex
CREATE INDEX "compras_suplidorId_createdAt_idx" ON "compras"("suplidorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_numero_key" ON "ventas"("numero");

-- CreateIndex
CREATE INDEX "ventas_clienteId_createdAt_idx" ON "ventas"("clienteId", "createdAt");

-- CreateIndex
CREATE INDEX "ventas_tipo_createdAt_idx" ON "ventas"("tipo", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conduces_numero_key" ON "conduces"("numero");

-- CreateIndex
CREATE INDEX "cuentas_por_cobrar_clienteId_estado_idx" ON "cuentas_por_cobrar"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "cuentas_por_cobrar_fechaVencimiento_idx" ON "cuentas_por_cobrar"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "cuentas_por_pagar_suplidorId_estado_idx" ON "cuentas_por_pagar"("suplidorId", "estado");

-- CreateIndex
CREATE INDEX "cuentas_por_pagar_fechaVencimiento_idx" ON "cuentas_por_pagar"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "transacciones_bancarias_cuentaId_fecha_idx" ON "transacciones_bancarias"("cuentaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_gasto_nombre_key" ON "categorias_gasto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "gastos_numero_key" ON "gastos"("numero");

-- CreateIndex
CREATE INDEX "gastos_fecha_idx" ON "gastos"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_numero_key" ON "nominas"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_periodo_mes_anio_key" ON "nominas"("periodo", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "nomina_empleados_nominaId_empleadoId_key" ON "nomina_empleados"("nominaId", "empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_clave_key" ON "configuracion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "secuencias_documento_tipo_key" ON "secuencias_documento"("tipo");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones_entrega" ADD CONSTRAINT "direcciones_entrega_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_inventario" ADD CONSTRAINT "alertas_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_especiales" ADD CONSTRAINT "precios_especiales_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_especiales" ADD CONSTRAINT "precios_especiales_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_suplidorId_fkey" FOREIGN KEY ("suplidorId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_orden_compra" ADD CONSTRAINT "detalles_orden_compra_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_suplidorId_fkey" FOREIGN KEY ("suplidorId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "ordenes_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_compra" ADD CONSTRAINT "pagos_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_compra" ADD CONSTRAINT "pagos_compra_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conduces" ADD CONSTRAINT "conduces_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_suplidorId_fkey" FOREIGN KEY ("suplidorId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_bancarias" ADD CONSTRAINT "transacciones_bancarias_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomina_empleados" ADD CONSTRAINT "nomina_empleados_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomina_empleados" ADD CONSTRAINT "nomina_empleados_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
