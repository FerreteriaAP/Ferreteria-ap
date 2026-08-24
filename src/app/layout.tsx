import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ferretería AP",
  description: "Sistema de gestión Ferretería AP",
};

const TEMAS_VALIDOS = ["dark-ops", "gris-claro", "azul-metal", "dark-multicolor", "carbon"];

async function getTemaActivo(): Promise<string> {
  // Prioridad: cookie del usuario (por sesión/navegador) → DB global → default
  try {
    const jar = await cookies();
    const cookieTema = jar.get("ap-tema")?.value;
    if (cookieTema && TEMAS_VALIDOS.includes(cookieTema)) return cookieTema;

    const cfg = await prisma.configuracion.findUnique({
      where: { clave: "TEMA_ACTIVO" },
    });
    return cfg?.valor ?? "dark-ops";
  } catch {
    return "dark-ops";
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await getTemaActivo();

  return (
    <html
      lang="es"
      data-ap-theme={tema}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider tema={tema}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
