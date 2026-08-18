"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { crearEmpleado } from "@/actions/empleados";
import { cn } from "@/lib/utils";

const hoy = new Date().toISOString().split("T")[0];

export function EmpleadoForm() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [afp, setAfp] = useState("POPULAR");
 const [sfs, setSfs] = useState("SENASA");
 const [tipoCuenta, setTipoCuenta] = useState("CORRIENTE");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);

 const result = await crearEmpleado({
 cedula: fd.get("cedula") as string,
 nombre: fd.get("nombre") as string,
 apellido: fd.get("apellido") as string,
 telefono: fd.get("telefono") as string || undefined,
 email: fd.get("email") as string || undefined,
 fechaNacimiento: fd.get("fechaNacimiento") as string || undefined,
 fechaIngreso: fd.get("fechaIngreso") as string,
 cargo: fd.get("cargo") as string,
 departamento: fd.get("departamento") as string || undefined,
 salarioBase: Number(fd.get("salarioBase")),
 valorHoraExtra: Number(fd.get("valorHoraExtra")) || 0,
 descuentoSan: Number(fd.get("descuentoSan")) || 0,
 nss: fd.get("nss") as string || undefined,
 afp,
 sfs,
 cuentaBancaria: fd.get("cuentaBancaria") as string || undefined,
 bancoCuenta: fd.get("bancoCuenta") as string || undefined,
 tipoCuenta: tipoCuenta || undefined,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }
 router.push(`/empleados/${result.id}`);
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-6"> {error && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"> {error}
 </div> )}

 {/* Datos personales */}
 <Card> <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Cédula *</Label> <Input name="cedula" required placeholder="000-0000000-0" /> </div> <div className="space-y-1.5"> <Label>Nombre *</Label> <Input name="nombre" required /> </div> <div className="space-y-1.5"> <Label>Apellido *</Label> <Input name="apellido" required /> </div> <div className="space-y-1.5"> <Label>Teléfono</Label> <Input name="telefono" placeholder="809-000-0000" /> </div> <div className="space-y-1.5"> <Label>Email</Label> <Input name="email" type="email" /> </div> <div className="space-y-1.5"> <Label>Fecha nacimiento</Label> <Input name="fechaNacimiento" type="date" /> </div> </CardContent> </Card> {/* Datos laborales */}
 <Card> <CardHeader><CardTitle className="text-base">Datos laborales</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Cargo *</Label> <Input name="cargo" required placeholder="Vendedor, Almacenista, etc." /> </div> <div className="space-y-1.5"> <Label>Departamento</Label> <Input name="departamento" placeholder="Ventas, Almacén..." /> </div> <div className="space-y-1.5"> <Label>Fecha de ingreso *</Label> <Input name="fechaIngreso" type="date" defaultValue={hoy} required /> </div> <div className="space-y-1.5"> <Label>Salario base mensual (RD$) *</Label> <Input name="salarioBase" type="number" step="0.01" min="0" required /> </div> <div className="space-y-1.5"> <Label>Valor hora extra (RD$)</Label> <Input name="valorHoraExtra" type="number" step="0.01" min="0" defaultValue="0" /> <p className="text-xs text-muted-foreground">Cuánto vale cada hora extra trabajada</p> </div> <div className="space-y-1.5"> <Label>Descuento SAN quincenal (RD$)</Label> <Input name="descuentoSan" type="number" step="0.01" min="0" defaultValue="0" /> <p className="text-xs text-muted-foreground">Monto fijo descontado cada quincena</p> </div> </CardContent> </Card> {/* TSS */}
 <Card> <CardHeader><CardTitle className="text-base">TSS — Seguridad Social</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>NSS (Seguridad Social)</Label> <Input name="nss" placeholder="000-0000000-0" /> </div> <div className="space-y-1.5"> <Label>AFP</Label> <Select value={afp} onValueChange={(v) => setAfp((v ?? "POPULAR") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="POPULAR">AFP Popular</SelectItem> <SelectItem value="SIAPEN">Siapen</SelectItem> <SelectItem value="RESERVAS">AFP Reservas</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>SFS (Seguro médico)</Label> <Select value={sfs} onValueChange={(v) => setSfs((v ?? "SENASA") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="SENASA">Senasa</SelectItem> <SelectItem value="SEMMA">Semma</SelectItem> <SelectItem value="ARS_HUMANO">ARS Humano</SelectItem> <SelectItem value="MAPFRE">Mapfre Salud</SelectItem> </SelectContent> </Select> </div> </CardContent> </Card> {/* Cuenta bancaria */}
 <Card> <CardHeader><CardTitle className="text-base">Datos bancarios (pago nómina)</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Banco</Label> <Input name="bancoCuenta" placeholder="Banco Popular, BHD León..." /> </div> <div className="space-y-1.5"> <Label>Número de cuenta</Label> <Input name="cuentaBancaria" placeholder="000-000000-0" /> </div> <div className="space-y-1.5"> <Label>Tipo de cuenta</Label> <Select value={tipoCuenta} onValueChange={(v) => setTipoCuenta((v ?? "CORRIENTE") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="CORRIENTE">Corriente</SelectItem> <SelectItem value="AHORROS">Ahorros</SelectItem> </SelectContent> </Select> </div> </CardContent> </Card> <Separator /> <div className="flex gap-3"> <button type="submit" disabled={loading}
 className={cn(buttonVariants(), loading && "opacity-50 pointer-events-none")}> {loading ? "Guardando..." : "Registrar empleado"}
 </button> <button type="button" onClick={() => router.back()}
 className={cn(buttonVariants({ variant: "outline" }))}> Cancelar
 </button> </div> </form> );
}
