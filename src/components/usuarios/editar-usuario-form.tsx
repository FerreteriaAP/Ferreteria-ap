"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { editarUsuario, cambiarPassword, toggleUsuario } from "@/actions/usuarios";
import { cn } from "@/lib/utils";

const ROLES = [
 { value: "ADMINISTRADOR", label: "Administrador" },
 { value: "ASISTENTE_ADMINISTRATIVO", label: "Asistente Administrativo" },
 { value: "VENDEDOR", label: "Vendedor" },
 { value: "CAJA", label: "Caja" },
];

type Usuario = {
 id: string;
 nombre: string;
 apellido: string;
 email: string;
 rol: string;
 activo: boolean;
};

export function EditarUsuarioForm({ usuario }: { usuario: Usuario }) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [loadingPwd, setLoadingPwd] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [errorPwd, setErrorPwd] = useState<string | null>(null);
 const [ok, setOk] = useState(false);
 const [okPwd, setOkPwd] = useState(false);
 const [rol, setRol] = useState(usuario.rol);
 const [activo, setActivo] = useState(usuario.activo);

 const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true); setError(null); setOk(false);
 const fd = new FormData(e.currentTarget);

 const result = await editarUsuario(usuario.id, {
 nombre: fd.get("nombre") as string,
 apellido: fd.get("apellido") as string,
 rol,
 activo,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }
 setOk(true);
 router.refresh();
 };

 const handlePassword = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoadingPwd(true); setErrorPwd(null); setOkPwd(false);
 const fd = new FormData(e.currentTarget);
 const result = await cambiarPassword(usuario.id, fd.get("password") as string);
 setLoadingPwd(false);
 if ("error" in result) { setErrorPwd(result.error as string); return; }
 (e.target as HTMLFormElement).reset();
 setOkPwd(true);
 };

 const handleToggle = async () => {
 const result = await toggleUsuario(usuario.id);
 if ("error" in result) return;
 setActivo(!activo);
 router.refresh();
 };

 return (
 <div className="space-y-6"> {/* Datos básicos */}
 <form onSubmit={handleEdit} className="space-y-3"> <h3 className="font-medium text-sm">Datos del usuario</h3> {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{error}</p>}
 {ok && <p className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">Guardado correctamente</p>}

 <div className="grid grid-cols-2 gap-3"> <div className="space-y-1.5"> <Label>Nombre</Label> <Input name="nombre" defaultValue={usuario.nombre} required /> </div> <div className="space-y-1.5"> <Label>Apellido</Label> <Input name="apellido" defaultValue={usuario.apellido} /> </div> </div> <div className="space-y-1.5"> <Label>Correo (solo lectura)</Label> <Input value={usuario.email} disabled className="opacity-60" /> </div> <div className="space-y-1.5"> <Label>Rol</Label> <Select value={rol} onValueChange={(v) => setRol(v ?? usuario.rol)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> {ROLES.map((r) => (
 <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem> ))}
 </SelectContent> </Select> </div> <div className="flex items-center justify-between"> <div> <p className="text-sm font-medium">Estado</p> <p className="text-xs text-muted-foreground">{activo ? "Usuario activo" : "Usuario desactivado"}</p> </div> <button
 type="button" onClick={handleToggle}
 className={cn(
 buttonVariants({ variant: activo ? "outline" : "default", size: "sm" }),
 )}
 > {activo ? "Desactivar" : "Activar"}
 </button> </div> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Guardando..." : "Guardar cambios"}
 </button> </form> <Separator /> {/* Cambiar contraseña */}
 <form onSubmit={handlePassword} className="space-y-3"> <h3 className="font-medium text-sm">Cambiar contraseña</h3> {errorPwd && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{errorPwd}</p>}
 {okPwd && <p className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">Contraseña actualizada</p>}
 <div className="space-y-1.5"> <Label>Nueva contraseña</Label> <Input name="password" type="password" required placeholder="Mínimo 6 caracteres" /> </div> <button
 type="submit" disabled={loadingPwd}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full", loadingPwd && "opacity-50 pointer-events-none")}
 > {loadingPwd ? "Actualizando..." : "Cambiar contraseña"}
 </button> </form> </div> );
}
