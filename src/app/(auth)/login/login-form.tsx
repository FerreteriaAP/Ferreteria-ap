"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
 email: z.string().email("Email inválido"),
 password: z.string().min(1, "Contraseña requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [restoring, setRestoring] = useState(true);

 // Al abrir la app en iOS, intentar restaurar sesión desde device token guardado
 useEffect(() => {
   const tryRestore = async () => {
     try {
       const token = localStorage.getItem("ap_dt");
       if (!token) { setRestoring(false); return; }
       const res = await signIn("device-token", { token, redirect: false });
       if (res?.ok) {
         router.push(callbackUrl);
         router.refresh();
         return;
       }
       // Token inválido o expirado — limpiar
       localStorage.removeItem("ap_dt");
     } catch {
       // localStorage no disponible (modo privado)
     }
     setRestoring(false);
   };
   tryRestore();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
 resolver: zodResolver(loginSchema),
 });

 const onSubmit = async (data: LoginForm) => {
 setLoading(true);
 setError(null);

 const res = await signIn("credentials", {
 email: data.email,
 password: data.password,
 redirect: false,
 });

 if (res?.error) {
 setError("Email o contraseña incorrectos");
 setLoading(false);
 return;
 }

 router.push(callbackUrl);
 router.refresh();
 };

 if (restoring) {
   return (
     <div style={{
       position: "fixed", inset: 0, zIndex: 9999,
       background: "var(--background, #0d0d0d)",
       display: "flex", flexDirection: "column",
       alignItems: "center", justifyContent: "center", gap: 28,
     }}>
       {/* Octágono AP */}
       <svg width="110" height="110" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
         <polygon points="133.7,10 181.3,57.6 181.3,142.4 133.7,190 66.3,190 18.7,142.4 18.7,57.6 66.3,10"
           style={{ fill: "var(--card-bg-hex, #111923)", stroke: "var(--foreground, #fff)", strokeWidth: 7, strokeLinejoin: "round" }} />
         <polygon points="127,23 170,66 170,134 127,177 73,177 30,134 30,66 73,23"
           style={{ fill: "none", stroke: "var(--foreground, #fff)", strokeWidth: 3, strokeLinejoin: "round" }} />
         <text x="100" y="100" dominantBaseline="central" textAnchor="middle"
           fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="84" letterSpacing="-3"
           style={{ fill: "var(--accent-hex, #f97316)" }}>AP</text>
       </svg>
       {/* Wordmark */}
       <div style={{ display: "flex", alignItems: "baseline", gap: 2, userSelect: "none" }}>
         <span style={{ color: "var(--accent-hex, #f97316)", fontWeight: 900, fontSize: 30, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>F</span>
         <span style={{ color: "var(--foreground, #fff)", fontWeight: 900, fontSize: 30, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>ERRETERÍA</span>
       </div>
       {/* Spinner */}
       <div style={{ width: 28, height: 28, borderRadius: "50%",
         border: "2.5px solid rgba(249,115,22,0.25)", borderTopColor: "#f97316",
         animation: "spin 0.75s linear infinite" }} />
       <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
     </div>
   );
 }

 return (
 <Card> <CardHeader className="space-y-1 pb-4"> <CardTitle className="text-xl">Iniciar sesión</CardTitle> <CardDescription>Ingresa tus credenciales para continuar</CardDescription> </CardHeader> <CardContent> <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"> <div className="space-y-2"> <Label htmlFor="email">Email</Label> <Input
 id="email" type="email" placeholder="usuario@ferreteria-ap.com" autoComplete="email" {...register("email")}
 /> {errors.email && (
 <p className="text-xs text-destructive">{errors.email.message}</p> )}
 </div> <div className="space-y-2"> <Label htmlFor="password">Contraseña</Label> <Input
 id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...register("password")}
 /> {errors.password && (
 <p className="text-xs text-destructive">{errors.password.message}</p> )}
 </div> {error && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2"> <p className="text-sm text-destructive">{error}</p> </div> )}

 <button
 type="submit"
 disabled={loading}
 className="w-full h-10 rounded-lg border-2 text-sm font-semibold transition-colors hover:bg-orange-500/10 disabled:opacity-50"
 style={{ borderColor: "#f97316", color: "#f97316" }}
 >
 {loading ? "Entrando..." : "Entrar"}
 </button> </form> </CardContent> </Card> );
}
