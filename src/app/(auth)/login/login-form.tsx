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
     <Card>
       <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
         <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#f97316", borderTopColor: "transparent" }} />
         <p className="text-sm text-muted-foreground">Restableciendo sesión...</p>
       </CardContent>
     </Card>
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
