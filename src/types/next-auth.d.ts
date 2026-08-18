import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
 interface User {
 rol?: string;
 id?: string;
 }
 interface Session {
 user: User & {
 rol?: string;
 id?: string;
 };
 }
}

declare module "next-auth/jwt" {
 interface JWT {
 rol?: string;
 id?: string;
 }
}
