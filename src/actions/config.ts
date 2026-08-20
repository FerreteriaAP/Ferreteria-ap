"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const TEMAS_VALIDOS = ["dark-ops", "gris-claro", "azul-metal", "dark-multicolor", "carbon"];

export async function setTemaActivo(tema: string): Promise<{ ok: boolean; error?: string }> {
 try {
 const session = await auth();
 if (!session?.user) {
 return { ok: false, error: "No autorizado" };
 }

 if (!TEMAS_VALIDOS.includes(tema)) {
 return { ok: false, error: "Tema no válido" };
 }

 await prisma.configuracion.upsert({
 where: { clave: "TEMA_ACTIVO" },
 update: { valor: tema },
 create: {
 clave: "TEMA_ACTIVO",
 valor: tema,
 descripcion: "Tema visual del sistema (afecta a todos los usuarios)",
 },
 });

 // Invalida toda la jerarquía de layouts para que el nuevo tema
 // se aplique en el próximo render del servidor
 revalidatePath("/", "layout");

 return { ok: true };
 } catch (e) {
 console.error("[setTemaActivo]", e);
 return { ok: false, error: "Error al guardar el tema" };
 }
}
