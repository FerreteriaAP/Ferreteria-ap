import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe: only authConfig (no Prisma, no bcrypt)
// The authorized() callback in authConfig handles all role-based routing
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
