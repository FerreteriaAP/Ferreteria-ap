import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyDeviceToken } from "./device-token";

const loginSchema = z.object({
 email: z.string().email(),
 password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
 ...authConfig,
 // Sin PrismaAdapter — usamos JWT puro con nuestro propio modelo Usuario
 providers: [
 Credentials({
 name: "credentials",
 credentials: {
 email: { label: "Email", type: "email" },
 password: { label: "Contraseña", type: "password" },
 },
 async authorize(credentials) {
 const parsed = loginSchema.safeParse(credentials);
 if (!parsed.success) return null;

 const { email, password } = parsed.data;

 const usuario = await prisma.usuario.findUnique({
 where: { email },
 });

 if (!usuario || !usuario.password || !usuario.activo) return null;

 const passwordOk = await bcrypt.compare(password, usuario.password);
 if (!passwordOk) return null;

 return {
 id: usuario.id,
 email: usuario.email,
 name: `${usuario.nombre} ${usuario.apellido}`,
 rol: usuario.rol,
 };
 },
 }),
 // Provider para restaurar sesión en iOS desde localStorage
 Credentials({
 id: "device-token",
 credentials: { token: { type: "text" } },
 async authorize(credentials) {
   const token = credentials?.token as string | undefined;
   if (!token) return null;
   const userId = verifyDeviceToken(token);
   if (!userId) return null;
   const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
   if (!usuario || !usuario.activo) return null;
   return {
     id: usuario.id,
     email: usuario.email,
     name: `${usuario.nombre} ${usuario.apellido}`,
     rol: usuario.rol,
   };
 },
 }),
 ],
});
