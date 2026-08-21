"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const TEMAS_VALIDOS = ["dark-ops", "gris-claro", "azul-metal", "dark-multicolor", "carbon"];
const COOKIE_TEMA = "ap-tema";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/**
 * Guarda el tema preferido del usuario en una cookie propia (no en DB global).
 * Cada usuario/navegador tiene su propio tema independiente.
 */
export async function setTemaActivo(tema: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "No autorizado" };

    if (!TEMAS_VALIDOS.includes(tema)) return { ok: false, error: "Tema no válido" };

    const jar = await cookies();
    jar.set(COOKIE_TEMA, tema, {
      maxAge:   COOKIE_MAX_AGE,
      path:     "/",
      sameSite: "lax",
      httpOnly: false, // necesario para que el cliente lo lea si aplica
    });

    return { ok: true };
  } catch (e) {
    console.error("[setTemaActivo]", e);
    return { ok: false, error: "Error al guardar el tema" };
  }
}
