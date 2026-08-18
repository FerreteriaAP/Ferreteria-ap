"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

 <Button type="submit" className="w-full" disabled={loading}> {loading ? "Entrando..." : "Entrar"}
 </Button> </form> </CardContent> </Card> );
}
