"use server";

import { prisma } from "@/lib/prisma";

export interface PrecioPorSuplidor {
  suplidorId: string;
  suplidorNombre: string;
  costo: number;
  fechaCompra: Date;
  numeroCompra: string;
  cantidad: number;
}

export interface ProductoParaTabla {
  id: string;
  codigo: string;
  nombre: string;
}

/** Lista todos los productos activos (para el selector) */
export async function getProductosParaTabla(): Promise<ProductoParaTabla[]> {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, nombre: true },
    orderBy: [{ codigo: "asc" }],
  });
  return productos;
}

/**
 * Para cada suplidor que haya comprado el producto, devuelve
 * solo la compra más reciente (último precio).
 */
export async function getPreciosPorSuplidor(
  productoId: string
): Promise<PrecioPorSuplidor[]> {
  // Traer todos los detalles de compra para este producto,
  // ordenados por fecha descendente, con datos del suplidor
  const detalles = await prisma.detalleCompra.findMany({
    where: { productoId },
    include: {
      compra: {
        include: {
          suplidor: { select: { id: true, nombre: true } },
        },
      },
    },
    orderBy: { compra: { fechaFactura: "desc" } },
  });

  // Deduplicar por suplidor — quedarse con el primero (más reciente)
  const seen = new Set<string>();
  const result: PrecioPorSuplidor[] = [];

  for (const d of detalles) {
    const sid = d.compra.suplidorId;
    if (!seen.has(sid)) {
      seen.add(sid);
      result.push({
        suplidorId: sid,
        suplidorNombre: d.compra.suplidor.nombre,
        costo: Number(d.costo),
        fechaCompra: d.compra.fechaFactura,
        numeroCompra: d.compra.numero,
        cantidad: Number(d.cantidad),
      });
    }
  }

  // Ordenar por costo ascendente para presentación
  result.sort((a, b) => a.costo - b.costo);
  return result;
}
