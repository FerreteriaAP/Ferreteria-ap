import type { NextAuthConfig } from "next-auth";

// Configuración edge-safe (sin PrismaAdapter, sin pg)
// Usada en el middleware para validar sesión JWT
export const authConfig: NextAuthConfig = {
 pages: {
 signIn: "/login",
 },
 session: { strategy: "jwt" },
 callbacks: {
 authorized({ auth, request: { nextUrl } }) {
 const isLoggedIn = !!auth?.user;
 const isOnLogin = nextUrl.pathname.startsWith("/login");

 if (isOnLogin) {
 if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
 return true;
 }

 if (!isLoggedIn) return false;

 const path = nextUrl.pathname;
 const rol = (auth?.user as { rol?: string })?.rol ?? "";

 // CAJA: /caja/** + páginas de impresión de documentos
 if (rol === "CAJA") {
 if (path === "/dashboard") return Response.redirect(new URL("/caja", nextUrl));
 const cajaPermitido =
  path.startsWith("/caja") ||
  path.startsWith("/recibo-cobro") ||
  path.startsWith("/nota-credito") ||
  path.startsWith("/comprobante-cxc");
 if (!cajaPermitido) return Response.redirect(new URL("/caja", nextUrl));
 return true;
 }

 // VENDEDOR: módulos permitidos 
 if (rol === "VENDEDOR") {
 const bloqueadas = [
 "/configuracion", "/usuarios",
 "/contabilidad", "/gastos",
 "/nominas", "/empleados",
 "/caja",
 ];
 if (bloqueadas.some(b => path === b || path.startsWith(b + "/"))) {
 return Response.redirect(new URL("/dashboard", nextUrl));
 }
 return true;
 }

 // ASISTENTE_ADMINISTRATIVO: sin caja, configuración ni usuarios 
 if (rol === "ASISTENTE_ADMINISTRATIVO") {
 const bloqueadas = ["/configuracion", "/usuarios", "/caja"];
 if (bloqueadas.some(b => path === b || path.startsWith(b + "/"))) {
 return Response.redirect(new URL("/dashboard", nextUrl));
 }
 return true;
 }

 // ADMINISTRADOR  acceso total
 return true;
 },
 async jwt({ token, user }) {
 if (user) {
 token.rol = (user as { rol?: string }).rol;
 token.id = user.id;
 }
 return token;
 },
 async session({ session, token }) {
 if (session.user) {
 (session.user as { rol?: string; id?: string }).rol = token.rol as string;
 (session.user as { rol?: string; id?: string }).id = token.id as string;
 }
 return session;
 },
 },
 providers: [], // Los providers completos están en auth.ts
};
