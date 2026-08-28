"use server";

import { prisma } from "@/lib/prisma";

// Reporte 1: Cierres de Caja 

export async function getReporteCierres(desde: Date, hasta: Date) {
 const turnos = await prisma.turnoCaja.findMany({
 where: {
 estado: "CERRADO",
 fechaCierre: { gte: desde, lte: hasta },
 },
 include: {
 usuario: { select: { nombre: true, apellido: true } },
 },
 orderBy: { fechaCierre: "desc" },
 });

 if (!turnos.length) return { turnos: [], resumen: null };

 // Pagos por método agrupados por turno
 const turnoIds = turnos.map(t => t.id);

 const pagosRaw = await prisma.pagoVenta.findMany({
 where: { venta: { turnoId: { in: turnoIds }, tipo: "FACTURADA" } },
 select: { monto: true, metodo: true, venta: { select: { turnoId: true } } },
 });

 // Movimientos de caja por turno
 const movimientos = await prisma.movimientoCaja.findMany({
 where: { turnoId: { in: turnoIds } },
 select: { turnoId: true, tipo: true, subTipo: true, monto: true, confirmado: true },
 });

 // Construir mapa por turno
 const pagosPorTurno = new Map<string, Record<string, number>>();
 for (const p of pagosRaw) {
 const tid = p.venta.turnoId ?? "";
 if (!tid) continue;
 const m = pagosPorTurno.get(tid) ?? {};
 m[p.metodo] = (m[p.metodo] ?? 0) + Number(p.monto);
 pagosPorTurno.set(tid, m);
 }

 const movsPorTurno = new Map<string, typeof movimientos>();
 for (const m of movimientos) {
 const arr = movsPorTurno.get(m.turnoId) ?? [];
 arr.push(m);
 movsPorTurno.set(m.turnoId, arr);
 }

 const filas = turnos.map(t => {
 const pagos = pagosPorTurno.get(t.id) ?? {};
 const movs = movsPorTurno.get(t.id) ?? [];

 const totalVentas = Object.values(pagos).reduce((s, v) => s + v, 0);
 const entradas = movs.filter(m => m.tipo === "ENTRADA").reduce((s, m) => s + Number(m.monto), 0);
 const salidas = movs.filter(m => m.tipo === "SALIDA").reduce((s, m) => s + Number(m.monto), 0);

 return {
 id: t.id,
 numero: t.numero,
 cajero: `${t.usuario.nombre} ${t.usuario.apellido}`,
 fechaApertura: t.fechaApertura,
 fechaCierre: t.fechaCierre!,
 montoApertura: Number(t.montoApertura),
 montoEsperado: Number(t.montoEsperado ?? 0),
 montoCierre: Number(t.montoCierre ?? 0),
 diferencia: Number(t.diferencia ?? 0),
 totalVentas,
 entradas,
 salidas,
 pagos: {
 EFECTIVO: pagos["EFECTIVO"] ?? 0,
 TARJETA: pagos["TARJETA"] ?? 0,
 TRANSFERENCIA: pagos["TRANSFERENCIA"] ?? 0,
 CHEQUE: pagos["CHEQUE"] ?? 0,
 CREDITO: pagos["CREDITO"] ?? 0,
 },
 };
 });

 // Totales generales
 const resumen = {
 totalTurnos: filas.length,
 totalVentas: filas.reduce((s, f) => s + f.totalVentas, 0),
 totalEntradas: filas.reduce((s, f) => s + f.entradas, 0),
 totalSalidas: filas.reduce((s, f) => s + f.salidas, 0),
 diferencias: filas.reduce((s, f) => s + f.diferencia, 0),
 pagos: {
 EFECTIVO: filas.reduce((s, f) => s + f.pagos.EFECTIVO, 0),
 TARJETA: filas.reduce((s, f) => s + f.pagos.TARJETA, 0),
 TRANSFERENCIA: filas.reduce((s, f) => s + f.pagos.TRANSFERENCIA, 0),
 CHEQUE: filas.reduce((s, f) => s + f.pagos.CHEQUE, 0),
 CREDITO: filas.reduce((s, f) => s + f.pagos.CREDITO, 0),
 },
 };

 return { turnos: filas, resumen };
}

// Reporte 2: Movimientos de Caja 

export async function getReporteMovimientos(desde: Date, hasta: Date) {
 const movimientos = await prisma.movimientoCaja.findMany({
 where: {
 fecha: { gte: desde, lte: hasta },
 subTipo: { in: ["GASTO", "COMPRA_MERCANCIA", "PRESTAMO", "COBRO_CXC"] },
 },
 include: {
 turno: { include: { usuario: { select: { nombre: true, apellido: true } } } },
 },
 orderBy: { fecha: "desc" },
 });

 if (!movimientos.length) return { movimientos: [], resumen: null };

 // Enriquecer con empleado y CxC
 const empleadoIds = [...new Set(movimientos.filter(m => m.empleadoId).map(m => m.empleadoId!))];
 const cxcIds = [...new Set(movimientos.filter(m => m.cxcId).map(m => m.cxcId!))];

 const [empleados, cxcs] = await Promise.all([
 empleadoIds.length
 ? prisma.empleado.findMany({ where: { id: { in: empleadoIds } }, select: { id: true, nombre: true, apellido: true } })
 : Promise.resolve([]),
 cxcIds.length
 ? prisma.cuentaPorCobrar.findMany({
 where: { id: { in: cxcIds } },
 include: { venta: { select: { numero: true } }, cliente: { select: { nombre: true } } },
 })
 : Promise.resolve([]),
 ]);

 const empMap = new Map(empleados.map(e => [e.id, `${e.nombre} ${e.apellido}`]));
 const cxcMap = new Map(cxcs.map(c => [c.id, { factura: c.venta.numero, cliente: c.cliente.nombre }]));

 const filas = movimientos.map(m => ({
 id: m.id,
 fecha: m.fecha,
 subTipo: m.subTipo as "GASTO" | "COMPRA_MERCANCIA" | "PRESTAMO" | "COBRO_CXC",
 concepto: m.concepto,
 monto: Number(m.monto),
 notas: m.notas,
 confirmado: m.confirmado,
 cajero: `${m.turno.usuario.nombre} ${m.turno.usuario.apellido}`,
 turnoNumero: m.turno.numero,
 empleado: m.empleadoId ? empMap.get(m.empleadoId) ?? null : null,
 cxcInfo: m.cxcId ? cxcMap.get(m.cxcId) ?? null : null,
 }));

 // Totales por tipo
 const sum = (tipo: string) => filas.filter(f => f.subTipo === tipo).reduce((s, f) => s + f.monto, 0);

 const resumen = {
 totalGastos: sum("GASTO"),
 totalCompras: sum("COMPRA_MERCANCIA"),
 totalPrests: sum("PRESTAMO"),
 totalCobros: sum("COBRO_CXC"),
 totalSalidas: sum("GASTO") + sum("COMPRA_MERCANCIA") + sum("PRESTAMO"),
 totalEntradas: sum("COBRO_CXC"),
 };

 return { movimientos: filas, resumen };
}

// ── Reporte 3: Dinero Recibido ────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Devuelve todos los turnos CERRADOS en el rango con su registro de dinero recibido.
 *  También calcula montoApertura del turno siguiente (para efectivoEsperado).
 */
export async function getReporteDineroRecibido(desde: Date, hasta: Date) {
  // Turnos cerrados en el rango, ordenados ASC para poder parear con el siguiente
  const turnosCerrados = await prisma.turnoCaja.findMany({
    where: { estado: "CERRADO", fechaCierre: { gte: desde, lte: hasta } },
    include: {
      usuario: { select: { nombre: true, apellido: true } },
      registroDinero: true,
    },
    orderBy: { fechaCierre: "asc" },
  });

  if (!turnosCerrados.length) return { filas: [], resumen: null };

  // Para cada turno cerrado, necesitamos el montoApertura del turno que abrió DESPUÉS
  const ids = turnosCerrados.map(t => t.id);

  // Fetch all turnos (cerrados + el abierto actual) para encontrar el siguiente por fecha
  const todosTurnos = await prisma.turnoCaja.findMany({
    select: { id: true, numero: true, fechaApertura: true, montoApertura: true },
    orderBy: { fechaApertura: "asc" },
  });

  // Mapa: turnoId → montoApertura del turno siguiente
  const siguienteApertura = new Map<string, number>();
  for (let i = 0; i < todosTurnos.length; i++) {
    const current = todosTurnos[i];
    const next = todosTurnos[i + 1];
    if (ids.includes(current.id) && next) {
      siguienteApertura.set(current.id, Number(next.montoApertura));
    }
  }

  const filas = turnosCerrados.map(t => {
    const montoCierre = Number(t.montoCierre ?? 0);
    const montoAperturaSig = siguienteApertura.get(t.id) ?? null;
    const efectivoEsperado = montoAperturaSig !== null ? montoCierre - montoAperturaSig : montoCierre;
    const montoRecibido = t.registroDinero?.montoRecibido ? Number(t.registroDinero.montoRecibido) : null;
    const diferencia = montoRecibido !== null ? montoRecibido - efectivoEsperado : null;

    return {
      turnoId: t.id,
      numero: t.numero,
      cajero: `${t.usuario.nombre} ${t.usuario.apellido}`,
      fechaCierre: t.fechaCierre!,
      fechaApertura: t.fechaApertura,
      montoCierre,
      montoAperturaSig,
      efectivoEsperado,
      montoRecibido,
      diferencia,
      notas: t.registroDinero?.notas ?? null,
      registrado: !!t.registroDinero,
      registroId: t.registroDinero?.id ?? null,
    };
  });

  // Resumen global
  const conRegistro = filas.filter(f => f.montoRecibido !== null);
  const resumen = {
    totalTurnos: filas.length,
    totalEsperado: filas.reduce((s, f) => s + f.efectivoEsperado, 0),
    totalRecibido: conRegistro.reduce((s, f) => s + (f.montoRecibido ?? 0), 0),
    diferenciaNeta: conRegistro.reduce((s, f) => s + (f.diferencia ?? 0), 0),
    pendientes: filas.filter(f => !f.registrado).length,
  };

  return { filas, resumen };
}

/** Registra o actualiza el dinero recibido de un cierre de caja */
export async function registrarDineroRecibido(data: {
  turnoId: string;
  montoCierre: number;
  montoAperturaSig: number | null;
  efectivoEsperado: number;
  montoRecibido: number;
  notas?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const diferencia = data.montoRecibido - data.efectivoEsperado;

  await prisma.registroDineroRecibido.upsert({
    where: { turnoId: data.turnoId },
    update: {
      montoRecibido: data.montoRecibido,
      diferencia,
      notas: data.notas ?? null,
      usuarioId: session.user.id,
    },
    create: {
      turnoId: data.turnoId,
      montoCierre: data.montoCierre,
      montoAperturaSig: data.montoAperturaSig,
      efectivoEsperado: data.efectivoEsperado,
      montoRecibido: data.montoRecibido,
      diferencia,
      notas: data.notas ?? null,
      usuarioId: session.user.id,
    },
  });

  revalidatePath("/contabilidad/reportes");
  return { ok: true };
}

// ── Reporte de cierre detallado (para impresión) ──────────────────────────────

async function buildDetalleTurno(turnoId: string) {
  const turno = await prisma.turnoCaja.findUnique({
    where: { id: turnoId },
    include: {
      usuario: { select: { nombre: true, apellido: true } },
      registroDinero: true,
      notasCredito: {
        where: { estado: { not: "ANULADA" } },
        include: {
          venta:   { select: { numero: true } },
          cliente: { select: { nombre: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!turno) return null;

  // Pagos de ventas del turno
  const pagosRaw = await prisma.pagoVenta.findMany({
    where: { venta: { turnoId, tipo: "FACTURADA" } },
    select: { monto: true, metodo: true },
  });

  // Conteo de facturas
  const cantidadFacturas = await prisma.venta.count({
    where: { turnoId, tipo: "FACTURADA" },
  });

  // Movimientos de caja del turno (todos los clasificados)
  const movs = await prisma.movimientoCaja.findMany({
    where: {
      turnoId,
      subTipo: { in: ["GASTO", "COMPRA_MERCANCIA", "PRESTAMO", "COBRO_CXC"] },
    },
    orderBy: { fecha: "asc" },
  });

  // Enriquecer empleados y CxCs
  const empleadoIds = [...new Set(movs.filter(m => m.empleadoId).map(m => m.empleadoId!))];
  const cxcIds      = [...new Set(movs.filter(m => m.cxcId).map(m => m.cxcId!))];

  const [empleados, cxcs] = await Promise.all([
    empleadoIds.length
      ? prisma.empleado.findMany({
          where: { id: { in: empleadoIds } },
          select: { id: true, nombre: true, apellido: true },
        })
      : Promise.resolve([] as Array<{ id: string; nombre: string; apellido: string }>),
    cxcIds.length
      ? prisma.cuentaPorCobrar.findMany({
          where: { id: { in: cxcIds } },
          include: {
            venta:   { select: { numero: true, id: true } },
            cliente: { select: { nombre: true } },
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          venta: { numero: string; id: string };
          cliente: { nombre: string };
        }>),
  ]);

  // NCs aplicadas a las ventas de esas CxCs
  const ventaIds = cxcs.map(c => c.venta.id);
  const ncsAplicadasRaw = ventaIds.length
    ? await prisma.notaCredito.findMany({
        where: { ventaId: { in: ventaIds }, estado: "APLICADA" },
        select: { numero: true, monto: true, ventaId: true },
      })
    : [];

  const ncsPorVenta = new Map<string, Array<{ numero: string; monto: number }>>();
  for (const nc of ncsAplicadasRaw) {
    const arr = ncsPorVenta.get(nc.ventaId) ?? [];
    arr.push({ numero: nc.numero, monto: Number(nc.monto) });
    ncsPorVenta.set(nc.ventaId, arr);
  }

  const empMap = new Map(empleados.map(e => [e.id, `${e.nombre} ${e.apellido}`]));
  const cxcMap = new Map(cxcs.map(c => [c.id, {
    factura:    c.venta.numero,
    cliente:    c.cliente.nombre,
    ncsAplicadas: ncsPorVenta.get(c.venta.id) ?? [],
  }]));

  // Pagos por método
  const porMetodo: Record<string, number> = {};
  for (const p of pagosRaw) {
    porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + Number(p.monto);
  }
  const totalVentas = Object.values(porMetodo).reduce((s, v) => s + v, 0);

  // Clasificar movimientos
  type MovRow = { concepto: string; monto: number; notas: string | null };
  const gastos:   MovRow[] = [];
  const compras:  MovRow[] = [];
  const prestamos: Array<MovRow & { empleado: string | null }> = [];
  const cobros: Array<{
    factura: string; cliente: string; monto: number; metodo: string | null;
    confirmado: boolean;
    ncsAplicadas: Array<{ numero: string; monto: number }>;
  }> = [];

  for (const m of movs) {
    const base = { concepto: m.concepto, monto: Number(m.monto), notas: m.notas };
    if (m.subTipo === "GASTO")            gastos.push(base);
    else if (m.subTipo === "COMPRA_MERCANCIA") compras.push(base);
    else if (m.subTipo === "PRESTAMO")    prestamos.push({ ...base, empleado: m.empleadoId ? empMap.get(m.empleadoId) ?? null : null });
    else if (m.subTipo === "COBRO_CXC") {
      const info = m.cxcId ? cxcMap.get(m.cxcId) : null;
      cobros.push({
        factura:      info?.factura ?? "—",
        cliente:      info?.cliente ?? "—",
        monto:        Number(m.monto),
        metodo:       m.metodo,
        confirmado:   m.confirmado,
        ncsAplicadas: info?.ncsAplicadas ?? [],
      });
    }
  }

  // Totales movimientos
  const sum = (arr: Array<{ monto: number }>) => arr.reduce((s, r) => s + r.monto, 0);

  // NC emitidas en este turno
  const ncsEmitidas = turno.notasCredito.map(nc => ({
    numero:          nc.numero,
    facturaOriginal: nc.venta.numero,
    cliente:         nc.cliente.nombre,
    monto:           Number(nc.monto),
    motivo:          nc.motivo,
  }));

  // Dinero recibido
  const dr = turno.registroDinero;
  const dineroRecibido = dr
    ? {
        efectivoEsperado: Number(dr.efectivoEsperado),
        montoRecibido:    Number(dr.montoRecibido),
        diferencia:       Number(dr.diferencia),
      }
    : null;

  return {
    turno: {
      id:            turno.id,
      numero:        turno.numero,
      cajero:        `${turno.usuario.nombre} ${turno.usuario.apellido}`,
      fechaApertura: turno.fechaApertura,
      fechaCierre:   turno.fechaCierre!,
      montoApertura: Number(turno.montoApertura),
      montoEsperado: Number(turno.montoEsperado ?? 0),
      montoCierre:   Number(turno.montoCierre ?? 0),
      diferencia:    Number(turno.diferencia ?? 0),
      notas:         turno.notas,
    },
    ventas: {
      total:           totalVentas,
      cantidad:        cantidadFacturas,
      porMetodo: {
        EFECTIVO:      porMetodo["EFECTIVO"]      ?? 0,
        TARJETA:       porMetodo["TARJETA"]       ?? 0,
        TRANSFERENCIA: porMetodo["TRANSFERENCIA"] ?? 0,
        CHEQUE:        porMetodo["CHEQUE"]        ?? 0,
        CREDITO:       porMetodo["CREDITO"]       ?? 0,
      },
    },
    gastos,
    compras,
    prestamos,
    cobros,
    ncsEmitidas,
    totales: {
      gastos:   sum(gastos),
      compras:  sum(compras),
      prestamos: sum(prestamos),
      cobros:   sum(cobros),
      ncs:      ncsEmitidas.reduce((s, n) => s + n.monto, 0),
    },
    dineroRecibido,
  };
}

/** Reporte detallado de un turno específico para impresión */
export async function getReporteCierrePrint(turnoId: string) {
  return buildDetalleTurno(turnoId);
}

/** Reporte de período para impresión — resumen por turno + totales consolidados */
export async function getReportePeriodoPrint(desde: Date, hasta: Date) {
  const turnos = await prisma.turnoCaja.findMany({
    where: { estado: "CERRADO", fechaCierre: { gte: desde, lte: hasta } },
    select: { id: true },
    orderBy: { fechaCierre: "asc" },
  });

  if (!turnos.length) return null;

  const detalles = await Promise.all(turnos.map(t => buildDetalleTurno(t.id)));
  const filas = detalles.filter((d): d is NonNullable<typeof d> => d !== null);

  const consolidado = {
    totalVentas:   filas.reduce((s, f) => s + f.ventas.total, 0),
    totalGastos:   filas.reduce((s, f) => s + f.totales.gastos, 0),
    totalCompras:  filas.reduce((s, f) => s + f.totales.compras, 0),
    totalPrestamos: filas.reduce((s, f) => s + f.totales.prestamos, 0),
    totalCobros:   filas.reduce((s, f) => s + f.totales.cobros, 0),
    totalNCs:      filas.reduce((s, f) => s + f.totales.ncs, 0),
    porMetodo: {
      EFECTIVO:      filas.reduce((s, f) => s + f.ventas.porMetodo.EFECTIVO, 0),
      TARJETA:       filas.reduce((s, f) => s + f.ventas.porMetodo.TARJETA, 0),
      TRANSFERENCIA: filas.reduce((s, f) => s + f.ventas.porMetodo.TRANSFERENCIA, 0),
      CHEQUE:        filas.reduce((s, f) => s + f.ventas.porMetodo.CHEQUE, 0),
      CREDITO:       filas.reduce((s, f) => s + f.ventas.porMetodo.CREDITO, 0),
    },
    turnos: filas.length,
    cantidadFacturas: filas.reduce((s, f) => s + f.ventas.cantidad, 0),
  };

  return { filas, consolidado, desde, hasta };
}
