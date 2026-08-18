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
