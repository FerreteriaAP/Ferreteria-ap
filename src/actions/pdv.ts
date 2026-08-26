"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TipoComprobante } from "@/generated/prisma";

// Select compartido para productos PDV
const PRODUCTO_SELECT = {
  id: true, codigo: true, nombre: true,
  precioVenta: true, unidadMedida: true,
  esFraccionable: true, unidadFraccion: true, factorFraccion: true, precioFraccion: true,
  exentoItbis: true, esServicio: true, stockActual: true, stockMinimo: true,
  costoUltimo: true,
  categoria: { select: { nombre: true, codigo: true } },
} as const;

// Top productos (los más vendidos en todo el historial)

export async function getTopProductosPDV(limit = 50) {
  type Row = { productoId: string; totalVendido: string };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT dv."productoId", SUM(dv.cantidad)::text AS "totalVendido"
    FROM detalles_venta dv
    JOIN ventas v ON v.id = dv."ventaId"
    WHERE v.tipo = 'FACTURADA'
    GROUP BY dv."productoId"
    ORDER BY SUM(dv.cantidad) DESC
    LIMIT ${limit}
  `;

  if (!rows.length) {
    return prisma.producto.findMany({
      where: { activo: true },
      select: PRODUCTO_SELECT,
      orderBy: { nombre: "asc" },
      take: limit,
    });
  }

  const ids = rows.map(r => r.productoId);
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, activo: true },
    select: PRODUCTO_SELECT,
  });

  return ids
    .map(id => productos.find(p => p.id === id))
    .filter(Boolean) as typeof productos;
}

// Búsqueda de productos

export async function buscarProductosPDV(q: string) {
  if (!q || q.trim().length < 1) return [];

  return prisma.producto.findMany({
    where: {
      activo: true,
      OR: [
        { codigo: { contains: q, mode: "insensitive" } },
        { codigoBarras: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { ...PRODUCTO_SELECT, codigoBarras: true },
    take: 12,
    orderBy: { nombre: "asc" },
  });
}

// Búsqueda de clientes

export async function buscarClientesPDV(q: string) {
  if (!q || q.trim().length < 1) return [];

  return prisma.contacto.findMany({
    where: {
      activo: true,
      tipo: { in: ["CLIENTE", "AMBOS"] },
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { rnc: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, nombre: true, rnc: true,
      tipoComprobante: true, telefono: true,
      direcciones: { select: { id: true, etiqueta: true, direccion: true } },
    },
    take: 8,
  });
}

// Consumidor final

export async function getConsumidorFinal() {
  let cf = await prisma.contacto.findFirst({ where: { nombre: "Consumidor Final" } });
  if (!cf) {
    cf = await prisma.contacto.create({
      data: { tipo: "CLIENTE", nombre: "Consumidor Final", tipoComprobante: "B02" },
    });
  }
  return cf;
}

// Crear cliente rápido desde el PDV

export interface ClienteRapidoInput {
  nombre: string;
  telefono?: string;
  rnc?: string;
  tipoComprobante: "B01" | "B02" | "B14" | "B15";
  direccion?: string;
  sector?: string;
}

function capitalizarNombre(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export async function crearClienteRapido(input: ClienteRapidoInput) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };

  const nombre = capitalizarNombre(input.nombre);

  const existeNombre = await prisma.contacto.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });
  if (existeNombre) return { error: `Ya existe un cliente con el nombre "${existeNombre.nombre}"` };

  if (input.rnc?.trim()) {
    const existeRnc = await prisma.contacto.findFirst({ where: { rnc: input.rnc.trim() } });
    if (existeRnc) return { error: `Ya existe un cliente con ese RNC/Cédula: ${existeRnc.nombre}` };
  }

  const cliente = await prisma.contacto.create({
    data: {
      tipo: "CLIENTE",
      nombre,
      telefono: input.telefono?.trim() || null,
      rnc: input.rnc?.trim() || null,
      tipoComprobante: input.tipoComprobante as TipoComprobante,
      ...(input.direccion?.trim() && {
        direcciones: {
          create: {
            etiqueta: "Principal",
            direccion: input.direccion.trim(),
            sector: input.sector?.trim() || null,
            esPrincipal: true,
          },
        },
      }),
    },
    include: { direcciones: true },
  });

  revalidatePath("/contactos");
  return { cliente };
}

// Guardar dirección de entrega

export async function guardarDireccionEntrega(contactoId: string, data: {
  direccion: string;
  sector?: string;
  etiqueta?: string;
}) {
  if (!data.direccion?.trim()) return { error: "Dirección requerida" };

  const dir = await prisma.direccionEntrega.create({
    data: {
      contactoId,
      etiqueta: data.etiqueta?.trim() || "Entrega",
      direccion: data.direccion.trim(),
      sector: data.sector?.trim() || null,
    },
  });
  return { direccion: dir };
}

// Tipos para el carrito PDV

export interface LineaPDV {
  productoId: string;
  nombre: string;
  codigo: string;
  unidad: string;
  cantidad: number;
  precioFinal: number;
  precio: number;
  exentoItbis: boolean;
  itbis: number;
  subtotal: number;
}

// Crear venta pendiente

export interface VentaPDVInput {
  clienteId: string;
  turnoId?: string;
  tipoNcf: "B01" | "B02" | "B14" | "B15";
  lineas: LineaPDV[];
  direccionId?: string;
  notas?: string;
}

async function siguienteNumeroPDV(): Promise<string> {
  await prisma.secuenciaDocumento.upsert({
    where: { tipo: "PDV" },
    create: { tipo: "PDV", prefijo: "PDV-", siguiente: 2, digitos: 5 },
    update: { siguiente: { increment: 1 } },
  });
  const seq = await prisma.secuenciaDocumento.findUniqueOrThrow({ where: { tipo: "PDV" } });
  const num = String(seq.siguiente - 1).padStart(seq.digitos, "0");
  return `${seq.prefijo}${num}`;
}

export async function crearVentaPendiente(input: VentaPDVInput) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };
  const userId = (session.user as { id: string }).id;

  if (!input.lineas.length) return { error: "La venta no tiene productos" };

  try {
    const numero = await siguienteNumeroPDV();
    const subtotal = input.lineas.reduce((s, l) => s + l.subtotal, 0);
    const itbis = input.lineas.reduce((s, l) => s + l.itbis, 0);
    const total = subtotal + itbis;

    const venta = await prisma.venta.create({
      data: {
        numero,
        tipo: "PDV_PENDIENTE",
        clienteId: input.clienteId,
        creadorId: userId,
        vendedorId: userId,
        turnoId: input.turnoId ?? null,
        direccionId: input.direccionId ?? null,
        tipoNcf: input.tipoNcf as TipoComprobante,
        credito: "CONTADO",
        subtotal,
        itbis,
        total,
        estadoPago: "PENDIENTE",
        notas: input.notas ?? null,
        detalles: {
          create: input.lineas.map((l) => ({
            productoId: l.productoId,
            descripcion: l.nombre,
            unidad: l.unidad,
            cantidad: l.cantidad,
            precio: l.precio,
            precioFinal: l.precioFinal,
            exentoItbis: l.exentoItbis,
            descuento: 0,
            itbis: l.itbis,
            subtotal: l.subtotal,
          })),
        },
      },
    });

    revalidatePath("/caja");
    return { id: venta.id, numero: venta.numero };
  } catch (err) {
    console.error("crearVentaPendiente:", err);
    return { error: "Error al guardar la venta. Intenta de nuevo." };
  }
}

// Cancelar venta pendiente

export async function cancelarVentaPendiente(ventaId: string) {
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta || venta.tipo !== "PDV_PENDIENTE") return { error: "Venta no encontrada" };

  await prisma.venta.update({
    where: { id: ventaId },
    data: { tipo: "CANCELADA" },
  });

  revalidatePath("/pdv");
  revalidatePath("/caja");
  return { ok: true };
}
