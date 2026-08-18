import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Layout mínimo para páginas de impresión/PDF.
 * Sin sidebar, sin header — solo el contenido limpio.
 */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
 const session = await auth();
 if (!session?.user) redirect("/login");

 return <>{children}</>;
}
