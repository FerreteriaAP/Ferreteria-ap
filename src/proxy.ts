import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/api/auth"];

export default async function proxy(request: NextRequest) {
 const { pathname } = request.nextUrl;

 // Rutas públicas pasan directo
 if (publicPaths.some((p) => pathname.startsWith(p))) {
 return NextResponse.next();
 }

 // Rutas de assets no se protegen
 if (
 pathname.startsWith("/_next") ||
 pathname.startsWith("/favicon.ico") ||
 pathname.includes(".")
 ) {
 return NextResponse.next();
 }

 // Validar token JWT
 const token = await getToken({
 req: request,
 secret: process.env.AUTH_SECRET,
 });

 if (!token) {
 const loginUrl = new URL("/login", request.url);
 loginUrl.searchParams.set("callbackUrl", pathname);
 return NextResponse.redirect(loginUrl);
 }

 // Si ya está logueado y va al login, redirigir al dashboard
 if (pathname === "/login") {
 return NextResponse.redirect(new URL("/dashboard", request.url));
 }

 const rol = (token.rol as string) ?? "";

 // CAJA: solo puede acceder a /caja/** 
 if (rol === "CAJA") {
 if (pathname === "/dashboard") {
 return NextResponse.redirect(new URL("/caja", request.url));
 }
 if (!pathname.startsWith("/caja")) {
 return NextResponse.redirect(new URL("/caja", request.url));
 }
 return NextResponse.next();
 }

 // VENDEDOR: módulos habilitados solamente 
 if (rol === "VENDEDOR") {
 const bloqueadas = [
 "/configuracion", "/usuarios",
 "/contabilidad", "/gastos",
 "/nominas", "/empleados",
 "/caja",
 ];
 if (bloqueadas.some(b => pathname === b || pathname.startsWith(b + "/"))) {
 return NextResponse.redirect(new URL("/dashboard", request.url));
 }
 return NextResponse.next();
 }

 // ASISTENTE_ADMINISTRATIVO: sin caja, configuración ni usuarios 
 if (rol === "ASISTENTE_ADMINISTRATIVO") {
 const bloqueadas = ["/configuracion", "/usuarios", "/caja"];
 if (bloqueadas.some(b => pathname === b || pathname.startsWith(b + "/"))) {
 return NextResponse.redirect(new URL("/dashboard", request.url));
 }
 return NextResponse.next();
 }

 // ADMINISTRADOR  acceso total
 return NextResponse.next();
}

export const config = {
 matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
