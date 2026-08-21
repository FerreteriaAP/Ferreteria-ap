"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { crearUsuario } from "@/actions/usuarios";
import { cn } from "@/lib/utils";

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

const ROLES = [
 { value: "ADMINISTRADOR", label: "Administrador" },
 { value: "ASISTENTE_ADMINISTRATIVO", label: "Asistente Administrativo" },
 { value: "VENDEDOR", label: "Vendedor" },
 { value: "CAJA", label: "Caja" },
];

export function UsuarioForm({ onSuccess }: { onSuccess?: () => void } = {}) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [rol, setRol] = useState("VENDEDOR");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);

 const result = await crearUsuario({
 email: fd.get("email") as string,
 password: fd.get("password") as string,
 nombre: fd.get("nombre") as string,
 apellido: fd.get("apellido") as string,
 rol,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }
 (e.target as HTMLFormElement).reset();
 setRol("VENDEDOR");
 router.refresh();
 onSuccess?.();
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-3"> {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{error}</p>}

 <div className="grid grid-cols-2 gap-3"> <div className="space-y-1.5"> <Label>Nombre *</Label> <Input name="nombre" required placeholder="Juan" onBlur={e => { e.target.value = toTitleCase(e.target.value); }} /> </div> <div className="space-y-1.5"> <Label>Apellido</Label> <Input name="apellido" placeholder="Pérez (opcional)" onBlur={e => { e.target.value = toTitleCase(e.target.value); }} /> </div> </div> <div className="space-y-1.5"> <Label>Correo electrónico *</Label> <Input name="email" type="email" required placeholder="juan@ferreteriaap.com" /> </div> <div className="space-y-1.5"> <Label>Contraseña *</Label> <Input name="password" type="password" required placeholder="Mínimo 6 caracteres" /> </div> <div className="space-y-1.5"> <Label>Rol *</Label> <Select value={rol} onValueChange={(v) => setRol(v ?? "VENDEDOR")}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> {ROLES.map((r) => (
 <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem> ))}
 </SelectContent> </Select> </div> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants(), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Creando..." : "Crear usuario"}
 </button> </form> );
}
