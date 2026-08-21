import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json(null);

  const c = await prisma.contacto.findUnique({
    where: { id },
    select: {
      id: true, nombre: true, telefono: true, rnc: true, email: true,
      direcciones: {
        select: { id: true, etiqueta: true, direccion: true },
        orderBy: { esPrincipal: "desc" },
      },
    },
  });

  return NextResponse.json(c);
}
