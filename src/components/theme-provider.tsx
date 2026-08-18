"use client";

import { useEffect } from "react";

/**
 * Aplica el data-ap-theme al <html> en el cliente.
 * El servidor ya lo pone en el SSR; este componente lo sincroniza
 * en navegaciones client-side para que nunca haya flash de tema incorrecto.
 */
export function ThemeProvider({
 tema,
 children,
}: {
 tema: string;
 children: React.ReactNode;
}) {
 useEffect(() => {
 document.documentElement.setAttribute("data-ap-theme", tema);
 }, [tema]);

 return <>{children}</>;
}
