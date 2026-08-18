"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { actualizarEmpleado } from "@/actions/empleados";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Empleado = any;

export function EmpleadoEditForm({ empleado }: { empleado: Empleado }) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO" | "SUSPENDIDO">(empleado.estado);
 const [afp, setAfp] = useState<string>(empleado.afp ?? "POPULAR");
 const [sfs, setSfs] = useState<string>(empleado.sfs ?? "SENASA");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);

 const result = await actualizarEmpleado(empleado.id, {
 nombre: fd.get("nombre") as string,
 apellido: fd.get("apellido") as string,
 telefono: fd.get("telefono") as string || undefined,
 email: fd.get("email") as string || undefined,
 cargo: fd.get("cargo") as string,
 departamento: fd.get("departamento") as string || undefined,
 salarioBase: Number(fd.get("salarioBase")),
 valorHoraExtra: Number(fd.get("valorHoraExtra")) || 0,
 descuentoSan: Number(fd.get("descuentoSan")) || 0,
 fechaIngreso: fd.get("fechaIngreso") as string || undefined,
 estado,
 afp,
 sfs,
 nss: fd.get("nss") as string || undefined,
 cuentaBancaria: fd.get("cuentaBancaria") as string || undefined,
 bancoCuenta: fd.get("bancoCuenta") as string || undefined,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }
 router.push(`/empleados/${empleado.id}`);
 };

 const fmt = (date: string | null) => date ? new Date(date).toISOString().split("T")[0] : "";

 return (
 <form onSubmit={handleSubmit} className="space-y-6"> {error && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"> {error}
 </div> )}

 <Card> <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Cédula</Label> <Input name="cedula" defaultValue={empleado.cedula} disabled className="opacity-60" /> </div> <div className="space-y-1.5"> <Label>Nombre *</Label> <Input name="nombre" defaultValue={empleado.nombre} required /> </div> <div className="space-y-1.5"> <Label>Apellido *</Label> <Input name="apellido" defaultValue={empleado.apellido} required /> </div> <div className="space-y-1.5"> <Label>Teléfono</Label> <Input name="telefono" defaultValue={empleado.telefono ?? ""} /> </div> <div className="space-y-1.5"> <Label>Email</Label> <Input name="email" type="email" defaultValue={empleado.email ?? ""} /> </div> <div className="space-y-1.5"> <Label>Estado</Label> <Select value={estado} onValueChange={(v) => setEstado((v ?? "ACTIVO") as typeof estado)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="ACTIVO">Activo</SelectItem> <SelectItem value="INACTIVO">Inactivo</SelectItem> <SelectItem value="SUSPENDIDO">Suspendido</SelectItem> </SelectContent> </Select> </div> </CardContent> </Card> <Card> <CardHeader><CardTitle className="text-base">Datos laborales</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Cargo *</Label> <Input name="cargo" defaultValue={empleado.cargo} required /> </div> <div className="space-y-1.5"> <Label>Departamento</Label> <Input name="departamento" defaultValue={empleado.departamento ?? ""} /> </div> <div className="space-y-1.5"> <Label>Salario base mensual (RD$) *</Label> <Input name="salarioBase" type="number" step="0.01" defaultValue={Number(empleado.salarioBase)} required /> </div> <div className="space-y-1.5"> <Label>Valor hora extra (RD$)</Label> <Input name="valorHoraExtra" type="number" step="0.01" defaultValue={Number(empleado.valorHoraExtra ?? 0)} /> <p className="text-xs text-muted-foreground">Cuánto vale cada hora extra trabajada</p> </div> <div className="space-y-1.5"> <Label>Descuento SAN quincenal (RD$)</Label> <Input name="descuentoSan" type="number" step="0.01" defaultValue={Number(empleado.descuentoSan ?? 0)} /> <p className="text-xs text-muted-foreground">Monto fijo descontado cada quincena</p> </div> <div className="space-y-1.5"> <Label>Fecha de ingreso</Label> <Input name="fechaIngreso" type="date" defaultValue={fmt(empleado.fechaIngreso)} /> </div> <div className="space-y-1.5"> <Label>NSS</Label> <Input name="nss" defaultValue={empleado.nss ?? ""} /> </div> <div className="space-y-1.5"> <Label>AFP</Label> <Select value={afp} onValueChange={(v) => setAfp((v ?? "POPULAR") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="POPULAR">AFP Popular</SelectItem> <SelectItem value="SIAPEN">Siapen</SelectItem> <SelectItem value="RESERVAS">AFP Reservas</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>SFS</Label> <Select value={sfs} onValueChange={(v) => setSfs((v ?? "SENASA") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="SENASA">Senasa</SelectItem> <SelectItem value="SEMMA">Semma</SelectItem> <SelectItem value="ARS_HUMANO">ARS Humano</SelectItem> <SelectItem value="MAPFRE">Mapfre Salud</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Banco nómina</Label> <Input name="bancoCuenta" defaultValue={empleado.bancoCuenta ?? ""} /> </div> <div className="space-y-1.5"> <Label>N° Cuenta</Label> <Input name="cuentaBancaria" defaultValue={empleado.cuentaBancaria ?? ""} /> </div> </CardContent> </Card> <Separator /> <div className="flex gap-3"> <button type="submit" disabled={loading}
 className={cn(buttonVariants(), loading && "opacity-50 pointer-events-none")}> {loading ? "Guardando..." : "Guardar cambios"}
 </button> <button type="button" onClick={() => router.back()}
 className={cn(buttonVariants({ variant: "outline" }))}> Cancelar
 </button> </div> </form> );
}
