import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

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
