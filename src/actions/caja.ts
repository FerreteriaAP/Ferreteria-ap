"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generarNumero } from "@/lib/numeracion";

// Helpers 

async function getUserId(): Promise<string | null> {
 const session = await auth();
 return session?.user ? (session.user as { id: string }).id : null;
}

async function getSession() {
 const session = await auth();
 if (!session?.user) return null;
 const user = session.user as { id: string; rol?: string };
 return { userId: user.id, rol: user.rol ?? "" };
}

async function siguienteNumeroFactura(): Promise<string> {
  return generarNumero("FACTURA", "FAC");
}

// Turno abierto (cualquier usuario) 
// La cajera abre el turno; vendedores y admin operan sobre el mismo turno abierto.

export async function getTurnoActivo() {
 return prisma.turnoCaja.findFirst({
 where: { estado: "ABIERTO" },
 orderBy: { fechaApertura: "desc" }, // el más reciente si hay más de uno
 include: {
 // Solo movimientos con subTipo (GASTO, COMPRA_MERCANCIA, PRESTAMO, COBRO_CXC)
 // Los pagos de facturas (subTipo: null) se ven en "Cobros del turno", no aquí
 movimientos: {
 where: { subTipo: { not: null } },
 orderBy: { fecha: "asc" },
 },
 ventas: {
 where: { tipo: "FACTURADA" },
 select: {
 id: true,
 numero: true,
 total: true,
 createdAt: true,
 pagosRecibidos: { select: { metodo: true, monto: true } },
 conduces: { select: { id: true, numero: true, clienteRecibio: true }, orderBy: { createdAt: "asc" } },
 },
 orderBy: { createdAt: "desc" },
 },
 },
 });
}

// Historial de turnos 

export async function getTurnos(page = 1, pageSize = 20) {
 const skip = (page - 1) * pageSize;
 const [items, total] = await Promise.all([
 prisma.turnoCaja.findMany({
 orderBy: { fechaApertura: "desc" },
 skip,
 take: pageSize,
 include: {
 usuario: { select: { nombre: true, apellido: true } },
 _count: { select: { ventas: true } },
 },
 }),
 prisma.turnoCaja.count(),
 ]);
 return { items, total, pages: Math.ceil(total / pageSize) };
}

// Detalle de un turno 

export async function getTurno(id: string) {
 return prisma.turnoCaja.findUnique({
 where: { id },
 include: {
 usuario: { select: { nombre: true, apellido: true } },
 // Solo movimientos con subTipo — pagos de facturas (null) van en Cobros del turno
 movimientos: {
 where: { subTipo: { not: null } },
 orderBy: { fecha: "asc" },
 },
 ventas: {
 where: { tipo: "FACTURADA" },
 select: {
 id: true,
 numero: true,
 total: true,
 createdAt: true,
 pagosRecibidos: { select: { metodo: true, monto: true } },
 conduces: { select: { id: true, numero: true, clienteRecibio: true }, orderBy: { createdAt: "asc" } },
 },
 orderBy: { createdAt: "asc" },
 },
 },
 });
}

// Resumen del turno 

export interface ResumenTurno {
 totalVentas: number;
 efectivo: number;
 tarjeta: number;
 transferencia: number;
 cheque: number;
 entradasMov: number;
 salidasMov: number;
 montoEsperado: number;
}

export async function getResumenTurno(id: string): Promise<ResumenTurno> {
 const turno = await getTurno(id);
 if (!turno) throw new Error("Turno no encontrado");

 const pagos = turno.ventas.flatMap(v => v.pagosRecibidos);
 const efectivo = pagos.filter(p => p.metodo === "EFECTIVO").reduce((s, p) => s + Number(p.monto), 0);
 const tarjeta = pagos.filter(p => p.metodo === "TARJETA").reduce((s, p) => s + Number(p.monto), 0);
 const transferencia = pagos.filter(p => p.metodo === "TRANSFERENCIA").reduce((s, p) => s + Number(p.monto), 0);
 const cheque = pagos.filter(p => p.metodo === "CHEQUE").reduce((s, p) => s + Number(p.monto), 0);
 const totalVentas = turno.ventas.reduce((s, v) => s + Number(v.total), 0);

 const entradasMov = turno.movimientos
 .filter(m => m.tipo === "ENTRADA" && m.subTipo !== "COBRO_CXC") // COBRO_CXC no confirmado no suma
 .reduce((s, m) => s + Number(m.monto), 0);
 const entradasCxC = turno.movimientos
 .filter(m => m.tipo === "ENTRADA" && m.subTipo === "COBRO_CXC" && m.confirmado)
 .reduce((s, m) => s + Number(m.monto), 0);
 const salidasMov = turno.movimientos
 .filter(m => m.tipo === "SALIDA")
 .reduce((s, m) => s + Number(m.monto), 0);

 const montoEsperado = Number(turno.montoApertura) + efectivo + entradasMov + entradasCxC - salidasMov;

 return { totalVentas, efectivo, tarjeta, transferencia, cheque, entradasMov, salidasMov, montoEsperado };
}

// Abrir turno 

export async function abrirTurno(_prev: { error?: string; id?: string } | null, formData: FormData) {
 const userId = await getUserId();
 if (!userId) return { error: "No autenticado" };

 const existing = await prisma.turnoCaja.findFirst({ where: { usuarioId: userId, estado: "ABIERTO" } });
 if (existing) return { error: "Ya tienes un turno abierto", id: existing.id };

 const monto = parseFloat(formData.get("montoApertura") as string) || 0;
 const notas = (formData.get("notas") as string) || null;

 const ultimo = await prisma.turnoCaja.findFirst({ orderBy: { numero: "desc" } });
 const numero = (ultimo?.numero ?? 0) + 1;

 const turno = await prisma.turnoCaja.create({
 data: { usuarioId: userId, numero, montoApertura: monto, notas },
 });

 revalidatePath("/caja");
 revalidatePath("/pdv");
 return { id: turno.id };
}

// Cerrar turno 

export async function cerrarTurno(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
 const sess = await getSession();
 if (!sess) return { error: "No autenticado" };
 const { userId, rol } = sess;

 const turnoId = formData.get("turnoId") as string;
 const montoCierre = parseFloat(formData.get("montoCierre") as string) || 0;
 const notas = (formData.get("notas") as string) || null;

 const turno = await prisma.turnoCaja.findUnique({ where: { id: turnoId } });
 if (!turno) return { error: "Turno no encontrado" };

 // El administrador puede cerrar cualquier turno; los demás solo el suyo
 const esAdmin = rol === "ADMINISTRADOR";
 if (!esAdmin && turno.usuarioId !== userId) return { error: "Solo puedes cerrar tu propio turno" };

 if (turno.estado === "CERRADO") return { error: "El turno ya está cerrado" };

 const resumen = await getResumenTurno(turnoId);
 const diferencia = montoCierre - resumen.montoEsperado;

 await prisma.turnoCaja.update({
 where: { id: turnoId },
 data: {
 estado: "CERRADO",
 fechaCierre: new Date(),
 montoCierre,
 montoEsperado: resumen.montoEsperado,
 diferencia,
 notas,
 },
 });

 revalidatePath("/caja");
 revalidatePath(`/caja/${turnoId}`);
 return { ok: true };
}

// Movimiento genérico (mantener compatibilidad) 

export async function registrarMovimiento(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
 const turnoId = formData.get("turnoId") as string;
 const tipo = formData.get("tipo") as "ENTRADA" | "SALIDA";
 const concepto = formData.get("concepto") as string;
 const monto = parseFloat(formData.get("monto") as string);
 const notas = (formData.get("notas") as string) || null;

 if (!turnoId || !concepto || isNaN(monto) || monto <= 0) return { error: "Datos inválidos" };

 const turno = await prisma.turnoCaja.findUnique({ where: { id: turnoId } });
 if (!turno || turno.estado !== "ABIERTO") return { error: "Turno no disponible" };

 await prisma.movimientoCaja.create({ data: { turnoId, tipo, concepto, monto, notas } });
 revalidatePath("/caja");
 revalidatePath(`/caja/${turnoId}`);
 return { ok: true };
}

// 
// NUEVAS FUNCIONES PDV / CAJA
// 

// Facturas pendientes del PDV en caja 

export async function getFacturasPendientesCaja() {
 return prisma.venta.findMany({
 where: { tipo: "PDV_PENDIENTE" },
 include: {
 cliente: { select: { id: true, nombre: true, rnc: true, tipoComprobante: true } },
 detalles: { include: { producto: { select: { id: true, codigo: true, nombre: true, stockActual: true, costoPromedio: true } } } },
 creador: { select: { nombre: true, apellido: true } },
 },
 orderBy: { createdAt: "asc" },
 });
}

// Tipos de pago 

export interface PagoInput {
 metodo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CHEQUE" | "CREDITO";
 monto: number;
 referencia?: string;
 notas?: string;
}

// Procesar pago en caja (convierte PDV_PENDIENTE  FACTURADA) 

export async function procesarPagoCaja(
 ventaId: string,
 pagos: PagoInput[],
 turnoId: string,
 opciones?: { ncf?: string; ncAplicacion?: { ncId: string; montoAplicar: number }; vencimientoCredito?: string }
) {
 const userId = await getUserId();
 if (!userId) return { error: "No autenticado" };

 const venta = await prisma.venta.findUnique({
 where: { id: ventaId },
 include: { detalles: true },
 });

 if (!venta) return { error: "Venta no encontrada" };
 if (venta.tipo !== "PDV_PENDIENTE") return { error: "Esta venta ya fue procesada" };

 const totalVenta = Number(venta.total);
 const totalPagado = pagos.filter(p => p.metodo !== "CREDITO").reduce((s, p) => s + p.monto, 0);
 const montoCredito = pagos.find(p => p.metodo === "CREDITO")?.monto ?? 0;
 const montoNC = opciones?.ncAplicacion?.montoAplicar ?? 0;

 if (Math.abs(totalPagado + montoCredito + montoNC - totalVenta) > 0.01) {
 return { error: `El total pagado (${(totalPagado + montoCredito + montoNC).toFixed(2)}) no coincide con el total de la venta (${totalVenta.toFixed(2)})` };
 }

 // Determinar estado de pago
 let estadoPago: "PAGADO" | "PAGADO_PARCIAL" | "PENDIENTE" = "PAGADO";
 if (montoCredito > 0 && totalPagado < totalVenta) {
 estadoPago = montoCredito >= totalVenta ? "PENDIENTE" : "PAGADO_PARCIAL";
 }

 // Número de factura
 const numFactura = await siguienteNumeroFactura();

 // Fecha de vencimiento para crédito
 // Prioridad: (1) fecha enviada por caja, (2) días en condición de crédito de la venta, (3) 30 días por defecto
 let fechaVencimiento: Date | undefined;
 let diasCredito: number | undefined;
 if (montoCredito > 0) {
   if (opciones?.vencimientoCredito) {
     fechaVencimiento = new Date(opciones.vencimientoCredito);
   } else {
     diasCredito = venta.credito === "DIAS_10" ? 10 : venta.credito === "DIAS_15" ? 15 : venta.credito === "DIAS_30" ? 30 : venta.credito === "DIAS_45" ? 45 : venta.credito === "DIAS_60" ? 60 : venta.credito === "DIAS_90" ? 90 : 30;
     fechaVencimiento = new Date();
     fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);
   }
 }
 if (montoCredito > 0 && !venta.clienteId) {
   return { error: "El cliente debe estar registrado para ventas a crédito" };
 }

 try {
 await prisma.$transaction(async (tx) => {
 // 1. Actualizar la venta a FACTURADA
 await tx.venta.update({
 where: { id: ventaId },
 data: {
 numero: numFactura,
 tipo: "FACTURADA",
 estadoPago,
 turnoId,
 ncf: opciones?.ncf ?? null,
 fechaVencimiento: fechaVencimiento ?? null,
 diasCredito: diasCredito ?? null,
 },
 });

 // 2. Registrar pagos (excepto CREDITO)
 const pagosEfectivos = pagos.filter(p => p.metodo !== "CREDITO");
 for (const pago of pagosEfectivos) {
 await tx.pagoVenta.create({
 data: {
 ventaId,
 monto: pago.monto,
 metodo: pago.metodo,
 referencia: pago.referencia ?? null,
 notas: pago.notas ?? null,
 },
 });
 }

 // 3. Deducir stock por cada línea
 for (const detalle of venta.detalles) {
 const producto = await tx.producto.findUnique({ where: { id: detalle.productoId } });
 if (!producto) continue;

 // Productos fraccionables: la cantidad en detalles_venta está en unidades de
 // fracción (ej. pies), pero el stock se lleva en unidades enteras (ej. barras).
 // Convertir igual que lo hace crearConduce.
 const cantidadDetalle = Number(detalle.cantidad);
 const cantidadReal =
 producto.esFraccionable && producto.factorFraccion && Number(producto.factorFraccion) > 0
 ? cantidadDetalle / Number(producto.factorFraccion)
 : cantidadDetalle;

 const stockAntes = Number(producto.stockActual);
 const stockDespues = stockAntes - cantidadReal;

 await tx.producto.update({
 where: { id: detalle.productoId },
 data: { stockActual: stockDespues },
 });

 // TODO: activar tras migrar servidor (pnpm prisma db push)
 // costoAlVender snapshot pendiente de columna en servidor

 await tx.movimientoInventario.create({
 data: {
 productoId: detalle.productoId,
 tipo: "SALIDA_VENTA",
 cantidad: cantidadReal,   // unidades reales del producto
 stockAntes,
 stockDespues,
 costo: Number(producto.costoPromedio), // snapshot del costo al vender
 referencia: numFactura,
 tipoRef: "VENTA",
 usuarioId: userId,
 },
 });
 }

 // 4. Crear CxC si hay crédito (fechaVencimiento siempre definida cuando montoCredito > 0)
 if (montoCredito > 0 && fechaVencimiento) {
 await tx.cuentaPorCobrar.create({
 data: {
 ventaId,
 clienteId: venta.clienteId!,
 monto: montoCredito,
 montoPagado: 0,
 saldo: montoCredito,
 fechaEmision: new Date(),
 fechaVencimiento,
 estado: "PENDIENTE",
 },
 });
 }

 // 5. Registrar movimiento de caja para efectivo (si aplica)
 const efectivoPagado = pagos.filter(p => p.metodo === "EFECTIVO").reduce((s, p) => s + p.monto, 0);
 if (efectivoPagado > 0) {
 await tx.movimientoCaja.create({
 data: {
 turnoId,
 tipo: "ENTRADA",
 subTipo: null,
 concepto: `Venta ${numFactura}`,
 monto: efectivoPagado,
 },
 });
 }

 // 6. Aplicar nota de crédito si se indicó
 if (opciones?.ncAplicacion && montoNC > 0) {
 const { ncId, montoAplicar } = opciones.ncAplicacion;
 const nc = await tx.notaCredito.findUnique({ where: { id: ncId } });
 if (!nc) throw new Error("NC no encontrada");
 const restanteActual = Number(nc.montoRestante);
 if (restanteActual < montoAplicar - 0.01) throw new Error("Saldo insuficiente en la NC");
 const nuevoRestante = Math.max(0, restanteActual - montoAplicar);
 await tx.notaCredito.update({
 where: { id: ncId },
 data: {
 montoRestante: nuevoRestante,
 estado: nuevoRestante < 0.01 ? "APLICADA" : "PENDIENTE",
 },
 });
 // Rebajar saldoFavor del cliente (fue acreditado al crear la NC)
 await tx.contacto.update({
 where: { id: venta.clienteId },
 data: { saldoFavor: { decrement: montoAplicar } },
 });
 }
 });

 revalidatePath("/caja");
 revalidatePath("/pdv");
 revalidatePath("/ventas");
 revalidatePath("/contabilidad/cxc");
 return { ok: true, numero: numFactura };

 } catch (err) {
 console.error("procesarPagoCaja:", err);
 return { error: "Error al procesar el pago. Intenta de nuevo." };
 }
}

// Eliminar (cancelar) factura pendiente desde caja 

export async function eliminarFacturaPendiente(ventaId: string) {
 const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
 if (!venta || venta.tipo !== "PDV_PENDIENTE") return { error: "Venta no encontrada o ya procesada" };

 await prisma.venta.update({
 where: { id: ventaId },
 data: { tipo: "CANCELADA" },
 });

 revalidatePath("/caja");
 revalidatePath("/pdv");
 return { ok: true };
}

// Registrar gasto en caja 

export interface GastoInput {
 turnoId: string;
 concepto: string;
 monto: number;
 notas?: string;
}

export async function registrarGasto(input: GastoInput) {
 if (!input.concepto || input.monto <= 0) return { error: "Datos inválidos" };

 const turno = await prisma.turnoCaja.findUnique({ where: { id: input.turnoId } });
 if (!turno || turno.estado !== "ABIERTO") return { error: "Turno no disponible" };

 await prisma.movimientoCaja.create({
 data: {
 turnoId: input.turnoId,
 tipo: "SALIDA",
 subTipo: "GASTO",
 concepto: input.concepto,
 monto: input.monto,
 notas: input.notas ?? null,
 },
 });

 revalidatePath("/caja");
 revalidatePath(`/caja/${input.turnoId}`);
 return { ok: true };
}

// Registrar compra de mercancía pagada en caja 

export interface CompraInput {
 turnoId: string;
 concepto: string; // nombre del suplidor o descripción
 monto: number;
 notas?: string;
}

export async function registrarCompraEnCaja(input: CompraInput) {
 if (!input.concepto || input.monto <= 0) return { error: "Datos inválidos" };

 const turno = await prisma.turnoCaja.findUnique({ where: { id: input.turnoId } });
 if (!turno || turno.estado !== "ABIERTO") return { error: "Turno no disponible" };

 await prisma.movimientoCaja.create({
 data: {
 turnoId: input.turnoId,
 tipo: "SALIDA",
 subTipo: "COMPRA_MERCANCIA",
 concepto: input.concepto,
 monto: input.monto,
 notas: input.notas ?? null,
 },
 });

 revalidatePath("/caja");
 revalidatePath(`/caja/${input.turnoId}`);
 return { ok: true };
}

// Registrar préstamo a empleado 

export interface PrestamoInput {
 turnoId: string;
 empleadoId: string;
 monto: number;
 notas?: string;
}

export async function registrarPrestamo(input: PrestamoInput) {
 if (!input.empleadoId || input.monto <= 0) return { error: "Datos inválidos" };

 const turno = await prisma.turnoCaja.findUnique({ where: { id: input.turnoId } });
 if (!turno || turno.estado !== "ABIERTO") return { error: "Turno no disponible" };

 const empleado = await prisma.empleado.findUnique({
 where: { id: input.empleadoId },
 select: { nombre: true, apellido: true },
 });
 if (!empleado) return { error: "Empleado no encontrado" };

 await prisma.movimientoCaja.create({
 data: {
 turnoId: input.turnoId,
 tipo: "SALIDA",
 subTipo: "PRESTAMO",
 concepto: `Préstamo a ${empleado.nombre} ${empleado.apellido}`,
 monto: input.monto,
 notas: input.notas ?? null,
 empleadoId: input.empleadoId,
 },
 });

 revalidatePath("/caja");
 revalidatePath(`/caja/${input.turnoId}`);
 return { ok: true };
}

// Registrar cobro CxC en caja (pendiente de confirmación admin) 

export interface CoboCxCInput {
 turnoId: string;
 cxcId: string;
 monto: number;
 metodo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CHEQUE";
 notas?: string;
}

// Registrar múltiples cobros CxC en un solo pago de caja 

export interface CobroCxCLineaInput {
 cxcId: string;
 monto: number;
}

export async function registrarCobrosMultiplesCxC(input: {
 turnoId: string;
 lineas: CobroCxCLineaInput[];
 metodo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CHEQUE";
 notas?: string;
 ncAplicacion?: { ncId: string; montoAplicar: number };
}) {
 if (!input.lineas.length) return { error: "Agrega al menos una factura" };
 if (input.lineas.some(l => l.monto <= 0)) return { error: "Todos los montos deben ser mayores a cero" };

 const turno = await prisma.turnoCaja.findUnique({ where: { id: input.turnoId } });
 if (!turno || turno.estado !== "ABIERTO") return { error: "Turno no disponible" };

 const metodoLabel: Record<string, string> = {
 EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CHEQUE: "Cheque",
 };

 // Validar y cargar todas las CxC
 const cxcIds = input.lineas.map(l => l.cxcId);
 const cxcs = await prisma.cuentaPorCobrar.findMany({
 where: { id: { in: cxcIds } },
 include: { cliente: { select: { id: true, nombre: true } }, venta: { select: { id: true, numero: true } } },
 });
 const cxcMap = new Map(cxcs.map(c => [c.id, c]));

 for (const linea of input.lineas) {
 const cxc = cxcMap.get(linea.cxcId);
 if (!cxc) return { error: `CxC no encontrada: ${linea.cxcId}` };
 if (cxc.estado === "PAGADO") return { error: `Factura ${cxc.venta.numero} ya está pagada` };
 if (linea.monto > Number(cxc.saldo)) {
 return { error: `El monto de ${cxc.venta.numero} supera el saldo pendiente (${Number(cxc.saldo).toFixed(2)})` };
 }
 }

 // Validar NC si fue indicada
 let nc: Awaited<ReturnType<typeof prisma.notaCredito.findUnique>> | null = null;
 if (input.ncAplicacion) {
 nc = await prisma.notaCredito.findUnique({
 where: { id: input.ncAplicacion.ncId },
 include: { venta: { select: { numero: true } } },
 });
 if (!nc || nc.estado !== "PENDIENTE") return { error: "Nota de crédito no válida o ya fue aplicada" };
 if (Number(nc.montoRestante) < input.ncAplicacion.montoAplicar - 0.01) return { error: "Saldo insuficiente en la nota de crédito" };
 }

 const userId = await getUserId();
 const movimientoIds: string[] = [];

 await prisma.$transaction(async (tx) => {
 // Si hay NC: aplicarla directamente (confirmada inmediatamente, distribuye por orden de líneas)
 if (nc && input.ncAplicacion) {
 let ncRestante = input.ncAplicacion.montoAplicar;
 const ncNumero = nc.numero;
 const clienteId = nc.clienteId;

 for (const linea of input.lineas) {
 if (ncRestante <= 0.01) break;
 const cxc = cxcMap.get(linea.cxcId)!;
 const saldoCxC = Number(cxc.saldo);
 const montoNcEstaLinea = Math.min(ncRestante, saldoCxC);
 if (montoNcEstaLinea < 0.01) continue;

 // Movimiento NC confirmado inmediatamente
 await tx.movimientoCaja.create({
 data: {
 turnoId: input.turnoId,
 tipo: "ENTRADA",
 subTipo: "COBRO_CXC",
 concepto: `Cobro CxC [NC] – ${cxc.cliente.nombre} / Fact. ${cxc.venta.numero}`,
 monto: montoNcEstaLinea,
 metodo: "NC",
 notas: `Pagado con NC ${ncNumero}`,
 cxcId: linea.cxcId,
 confirmado: true,
 confirmadoPor: userId,
 fechaConfirmacion: new Date(),
 },
 });

 // Actualizar CxC directamente
 const nuevoPagado = Number(cxc.montoPagado) + montoNcEstaLinea;
 const nuevoSaldo = Math.max(0, Number(cxc.monto) - nuevoPagado);
 const nuevoEstado = nuevoSaldo <= 0.01 ? "PAGADO" : "PAGADO_PARCIAL";
 await tx.cuentaPorCobrar.update({
 where: { id: linea.cxcId },
 data: { montoPagado: nuevoPagado, saldo: nuevoSaldo, estado: nuevoEstado },
 });

 // Registrar en PagoVenta
 await tx.pagoVenta.create({
 data: {
 ventaId: cxc.ventaId,
 monto: montoNcEstaLinea,
 metodo: "NC",
 referencia: `NC ${ncNumero}`,
 notas: null,
 },
 });

 if (nuevoEstado === "PAGADO") {
 await tx.venta.update({ where: { id: cxc.ventaId }, data: { estadoPago: "PAGADO" } });
 }
 ncRestante -= montoNcEstaLinea;
 }

 // Reducir montoRestante de la NC
 const ncUsado = input.ncAplicacion.montoAplicar - ncRestante;
 const nuevoMontoRestante = Math.max(0, Number(nc.montoRestante) - ncUsado);
 await tx.notaCredito.update({
 where: { id: nc.id },
 data: {
 montoRestante: nuevoMontoRestante,
 estado: nuevoMontoRestante < 0.01 ? "APLICADA" : "PENDIENTE",
 },
 });
 // Rebajar saldoFavor del cliente
 await tx.contacto.update({
 where: { id: clienteId },
 data: { saldoFavor: { decrement: ncUsado } },
 });
 }

 // Crear movimientos pendientes para la parte en efectivo/tarjeta
 for (const linea of input.lineas) {
 if (linea.monto <= 0.01) continue;
 const cxc = cxcMap.get(linea.cxcId)!;
 // Recalcular saldo real después de la NC (si fue actualizado arriba)
 const cxcActual = await tx.cuentaPorCobrar.findUnique({ where: { id: linea.cxcId }, select: { saldo: true, estado: true } });
 if (!cxcActual || cxcActual.estado === "PAGADO") continue;
 const saldoReal = Number(cxcActual.saldo);
 const montoEfectivo = Math.min(linea.monto, saldoReal);
 if (montoEfectivo < 0.01) continue;

 const mov = await tx.movimientoCaja.create({
 data: {
 turnoId: input.turnoId,
 tipo: "ENTRADA",
 subTipo: "COBRO_CXC",
 concepto: `Cobro CxC [${metodoLabel[input.metodo]}] – ${cxc.cliente.nombre} / Fact. ${cxc.venta.numero}`,
 monto: montoEfectivo,
 metodo: input.metodo,
 notas: input.notas ?? null,
 cxcId: linea.cxcId,
 confirmado: false,
 },
 });
 movimientoIds.push(mov.id);
 }
 });

 revalidatePath("/caja");
 revalidatePath("/contabilidad/cxc");
 return { ok: true, movimientoIds };
}

export async function registrarCobroEnCaja(input: CoboCxCInput) {
 if (!input.cxcId || input.monto <= 0) return { error: "Datos inválidos" };
 if (!input.metodo) return { error: "Selecciona la forma de pago" };

 const turno = await prisma.turnoCaja.findUnique({ where: { id: input.turnoId } });
 if (!turno || turno.estado !== "ABIERTO") return { error: "Turno no disponible" };

 const cxc = await prisma.cuentaPorCobrar.findUnique({
 where: { id: input.cxcId },
 include: { cliente: { select: { nombre: true } }, venta: { select: { numero: true } } },
 });
 if (!cxc) return { error: "CxC no encontrada" };
 if (cxc.estado === "PAGADO") return { error: "Esta cuenta ya está pagada" };
 if (input.monto > Number(cxc.saldo)) {
 return { error: `El monto (${input.monto}) supera el saldo pendiente (${Number(cxc.saldo).toFixed(2)})` };
 }

 const metodoLabel: Record<string, string> = {
 EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CHEQUE: "Cheque",
 };

 const mov = await prisma.movimientoCaja.create({
 data: {
 turnoId: input.turnoId,
 tipo: "ENTRADA",
 subTipo: "COBRO_CXC",
 concepto: `Cobro CxC [${metodoLabel[input.metodo]}] – ${cxc.cliente.nombre} / Fact. ${cxc.venta.numero}`,
 monto: input.monto,
 metodo: input.metodo,
 notas: input.notas ?? null,
 cxcId: input.cxcId,
 confirmado: false,
 },
 });

 revalidatePath("/caja");
 revalidatePath("/contabilidad/cxc");
 return { ok: true, movimientoId: mov.id };
}

// Confirmar cobro CxC (solo ADMINISTRADOR) 

export async function confirmarCobro(movimientoId: string) {
 const userId = await getUserId();
 if (!userId) return { error: "No autenticado" };

 // Verificar rol administrador
 const usuario = await prisma.usuario.findUnique({
 where: { id: userId },
 select: { rol: true },
 });
 if (!usuario || !["ADMINISTRADOR", "ASISTENTE_ADMINISTRATIVO"].includes(usuario.rol)) {
 return { error: "Solo administradores pueden confirmar cobros CxC" };
 }

 const movimiento = await prisma.movimientoCaja.findUnique({ where: { id: movimientoId } });
 if (!movimiento) return { error: "Movimiento no encontrado" };
 if (movimiento.subTipo !== "COBRO_CXC") return { error: "No es un cobro CxC" };
 if (movimiento.confirmado) return { error: "Este cobro ya fue confirmado" };
 if (!movimiento.cxcId) return { error: "Sin referencia CxC" };

 const cxc = await prisma.cuentaPorCobrar.findUnique({ where: { id: movimiento.cxcId } });
 if (!cxc) return { error: "CxC no encontrada" };

 const nuevoPagado = Number(cxc.montoPagado) + Number(movimiento.monto);
 const nuevoSaldo = Number(cxc.monto) - nuevoPagado;
 const nuevoEstado = nuevoSaldo <= 0.01 ? "PAGADO" : "PAGADO_PARCIAL";

 await prisma.$transaction(async (tx) => {
 // Confirmar el movimiento
 await tx.movimientoCaja.update({
 where: { id: movimientoId },
 data: {
 confirmado: true,
 confirmadoPor: userId,
 fechaConfirmacion: new Date(),
 },
 });

 // Actualizar la CxC
 await tx.cuentaPorCobrar.update({
 where: { id: movimiento.cxcId! },
 data: {
 montoPagado: nuevoPagado,
 saldo: Math.max(0, nuevoSaldo),
 estado: nuevoEstado,
 },
 });

 // Registrar el pago en la venta
 await tx.pagoVenta.create({
 data: {
 ventaId: cxc.ventaId,
 monto: movimiento.monto,
 metodo: "EFECTIVO",
 referencia: `Cobro CxC confirmado por admin`,
 notas: movimiento.notas,
 },
 });

 // Actualizar estado de pago de la venta
 if (nuevoEstado === "PAGADO") {
 await tx.venta.update({
 where: { id: cxc.ventaId },
 data: { estadoPago: "PAGADO" },
 });
 }
 });

 revalidatePath("/contabilidad/cxc");
 revalidatePath("/caja");
 return { ok: true };
}

// Confirmar múltiples cobros CxC a la vez (confirmación masiva por cliente) 

export async function confirmarCobrosCliente(movimientoIds: string[]) {
 if (!movimientoIds.length) return { error: "Sin movimientos" };

 const userId = await getUserId();
 if (!userId) return { error: "No autenticado" };

 const usuario = await prisma.usuario.findUnique({
 where: { id: userId },
 select: { rol: true },
 });
 if (!usuario || !["ADMINISTRADOR", "ASISTENTE_ADMINISTRATIVO"].includes(usuario.rol)) {
 return { error: "Solo administradores pueden confirmar cobros CxC" };
 }

 const movimientos = await prisma.movimientoCaja.findMany({
 where: { id: { in: movimientoIds }, subTipo: "COBRO_CXC", confirmado: false },
 });
 if (!movimientos.length) return { error: "No hay cobros pendientes para confirmar" };

 const cxcIds = [...new Set(movimientos.filter(m => m.cxcId).map(m => m.cxcId!))];
 const cxcs = await prisma.cuentaPorCobrar.findMany({ where: { id: { in: cxcIds } } });
 const cxcMap = new Map(cxcs.map(c => [c.id, c]));

 await prisma.$transaction(async (tx) => {
 for (const mov of movimientos) {
 if (!mov.cxcId) continue;
 const cxc = cxcMap.get(mov.cxcId);
 if (!cxc) continue;

 const nuevoPagado = Number(cxc.montoPagado) + Number(mov.monto);
 const nuevoSaldo = Number(cxc.monto) - nuevoPagado;
 const nuevoEstado = nuevoSaldo <= 0.01 ? "PAGADO" : "PAGADO_PARCIAL";

 // Confirmar movimiento
 await tx.movimientoCaja.update({
 where: { id: mov.id },
 data: { confirmado: true, confirmadoPor: userId, fechaConfirmacion: new Date() },
 });

 // Actualizar CxC
 await tx.cuentaPorCobrar.update({
 where: { id: mov.cxcId },
 data: { montoPagado: nuevoPagado, saldo: Math.max(0, nuevoSaldo), estado: nuevoEstado },
 });

 // Registrar pago en la venta
 await tx.pagoVenta.create({
 data: {
 ventaId: cxc.ventaId,
 monto: mov.monto,
 metodo: mov.metodo ?? "EFECTIVO",
 referencia: "Cobro CxC confirmado (masivo)",
 notas: mov.notas,
 },
 });

 // Actualizar estado de pago de la venta si quedó en cero
 if (nuevoEstado === "PAGADO") {
 await tx.venta.update({
 where: { id: cxc.ventaId },
 data: { estadoPago: "PAGADO" },
 });
 }

 // Actualizar el saldo acumulado en el mapa para el próximo movimiento de la misma CxC
 // (usamos unknown para forzar el cast — los valores Decimal se sobreescriben con number en memoria)
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 cxcMap.set(mov.cxcId, { ...cxc, montoPagado: nuevoPagado, saldo: Math.max(0, nuevoSaldo), estado: nuevoEstado } as any);
 }
 });

 revalidatePath("/contabilidad/cxc");
 revalidatePath("/caja");
 return { ok: true, confirmados: movimientos.length };
}

// Cobros CxC pendientes de confirmación (para pantalla admin) 

export async function getCobrosPendientesConfirmacion() {
 const movs = await prisma.movimientoCaja.findMany({
 where: { subTipo: "COBRO_CXC", confirmado: false },
 include: {
 turno: { include: { usuario: { select: { nombre: true, apellido: true } } } },
 },
 orderBy: { fecha: "asc" },
 });

 // Enriquecer con datos de CxC  venta + cliente
 const cxcIds = [...new Set(movs.filter(m => m.cxcId).map(m => m.cxcId!))];
 const cxcs = cxcIds.length
 ? await prisma.cuentaPorCobrar.findMany({
 where: { id: { in: cxcIds } },
 include: {
 venta: { select: { numero: true } },
 cliente: { select: { nombre: true, rnc: true } },
 },
 })
 : [];

 const cxcMap = new Map(cxcs.map(c => [c.id, c]));

 return movs.map(m => ({
 ...m,
 monto: Number(m.monto),
 cxcInfo: m.cxcId ? cxcMap.get(m.cxcId) ?? null : null,
 }));
}

// Suma de préstamos por empleado en un período (para nómina) 

export async function getSumaPrestamosPorEmpleado(
 empleadoId: string,
 fechaDesde: Date,
 fechaHasta: Date
): Promise<number> {
 const movimientos = await prisma.movimientoCaja.findMany({
 where: {
 empleadoId,
 subTipo: "PRESTAMO",
 fecha: { gte: fechaDesde, lte: fechaHasta },
 },
 select: { monto: true },
 });
 return movimientos.reduce((s, m) => s + Number(m.monto), 0);
}

// Buscar CxC por número de factura O nombre de cliente (para cobro en caja) 

export async function buscarCxCPorFactura(q: string) {
 if (!q || q.trim().length < 1) return [];
 const term = q.trim();

 return prisma.cuentaPorCobrar.findMany({
 where: {
 estado: { in: ["PENDIENTE", "PAGADO_PARCIAL"] },
 OR: [
 { venta: { numero: { contains: term, mode: "insensitive" } } },
 { cliente: { nombre: { contains: term, mode: "insensitive" } } },
 ],
 },
 select: {
 id: true,
 clienteId: true,
 monto: true,
 saldo: true,
 fechaVencimiento: true,
 estado: true,
 venta: { select: { numero: true } },
 cliente: { select: { nombre: true, rnc: true } },
 },
 orderBy: { fechaVencimiento: "asc" },
 take: 10,
 });
}

// Empleados activos (para el selector de préstamos) 

export async function getEmpleadosActivos() {
 return prisma.empleado.findMany({
 where: { estado: "ACTIVO" },
 select: { id: true, nombre: true, apellido: true, cargo: true },
 orderBy: { nombre: "asc" },
 });
}

// Reporte de préstamos por empleado y rango de fechas 

export async function getReportePrestamos(input: {
 empleadoId?: string;
 desde: string; // ISO date string YYYY-MM-DD
 hasta: string;
}) {
 const desde = new Date(input.desde + "T00:00:00");
 const hasta = new Date(input.hasta + "T23:59:59");

 const movs = await prisma.movimientoCaja.findMany({
 where: {
 subTipo: "PRESTAMO",
 fecha: { gte: desde, lte: hasta },
 ...(input.empleadoId && input.empleadoId !== "todos" ? { empleadoId: input.empleadoId }
 : {}),
 },
 orderBy: [{ empleadoId: "asc" }, { fecha: "asc" }],
 });

 if (!movs.length) return { empleados: [], totalGeneral: 0 };

 // Agrupar por empleado
 const empleadoIds = [...new Set(movs.filter(m => m.empleadoId).map(m => m.empleadoId!))];
 const empleados = await prisma.empleado.findMany({
 where: { id: { in: empleadoIds } },
 select: { id: true, nombre: true, apellido: true, cargo: true, cedula: true },
 });
 const empleadoMap = new Map(empleados.map(e => [e.id, e]));

 const grupos = empleadoIds.map(eid => {
 const emp = empleadoMap.get(eid);
 const prestamos = movs.filter(m => m.empleadoId === eid).map(m => ({
 id: m.id,
 fecha: m.fecha,
 monto: Number(m.monto),
 concepto: m.notas ?? m.concepto,
 }));
 const total = prestamos.reduce((s, p) => s + p.monto, 0);
 return { empleado: emp, prestamos, total };
 });

 const totalGeneral = grupos.reduce((s, g) => s + g.total, 0);

 return { empleados: grupos, totalGeneral };
}
