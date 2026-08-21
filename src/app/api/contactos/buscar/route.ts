import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tipo = req.nextUrl.searchParams.get("tipo") ?? "todos";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8), 12);

  if (q.length < 2) return NextResponse.json([]);

  const tipoFilter = tipo === "todos" ? undefined : { in: [tipo] as ("CLIENTE" | "SUPLIDOR" | "AMBOS")[] };

  const contactos = await prisma.contacto.findMany({
    where: {
      activo: true,
      ...(tipoFilter && { tipo: tipoFilter }),
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { nombreLegal: { contains: q, mode: "insensitive" } },
        { rnc: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
        { telefonoAlt: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, nombre: true, tipo: true, rnc: true, telefono: true },
    orderBy: { nombre: "asc" },
    take: limit,
  });

  return NextResponse.json(contactos);
}
