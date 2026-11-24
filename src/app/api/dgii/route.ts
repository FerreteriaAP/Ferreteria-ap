import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aHojas, aTxt, nombreArchivo, reporte606, reporte607 } from "@/lib/dgii-reportes";
import { crearXlsx } from "@/lib/xlsx";

/**
 * Descarga de los formatos de la DGII.
 *   GET /api/dgii?formato=606|607&periodo=AAAAMM&tipo=txt|xlsx
 * Solo administrador y asistente administrativo.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const rol = ((session?.user) as { rol?: string })?.rol ?? "";
  if (rol !== "ADMINISTRADOR" && rol !== "ASISTENTE_ADMINISTRATIVO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const formato = sp.get("formato");
  const periodo = sp.get("periodo") ?? "";
  const tipo = sp.get("tipo") === "xlsx" ? "xlsx" : "txt";
  if (formato !== "606" && formato !== "607") return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  if (!/^\d{6}$/.test(periodo)) return NextResponse.json({ error: "Período inválido (AAAAMM)" }, { status: 400 });

  const reporte = formato === "606" ? await reporte606(periodo) : await reporte607(periodo);

  if (tipo === "txt") {
    return new NextResponse(aTxt(reporte), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo(reporte, "TXT")}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const xlsx = crearXlsx(aHojas(reporte));
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo(reporte, "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
