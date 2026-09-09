import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const rol = ((session?.user) as { rol?: string })?.rol ?? "";
  if (rol !== "ADMINISTRADOR") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const codigo = req.nextUrl.searchParams.get("codigo")?.trim();
  if (!codigo) return NextResponse.json(null);

  const producto = await prisma.producto.findFirst({
    where: {
      OR: [
        { codigo: { equals: codigo, mode: "insensitive" } },
        { codigoBarras: { equals: codigo, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      precioVenta: true,
      unidadMedida: true,
      exentoItbis: true,
      costoUltimo: true,
    },
  });

  if (!producto) return NextResponse.json(null);
  return NextResponse.json(producto);
}
