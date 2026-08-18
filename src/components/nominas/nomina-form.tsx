"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { crearNomina } from "@/actions/nominas";
import { cn } from "@/lib/utils";

const hoy = new Date();
const mesAct = hoy.getMonth() + 1;
const anioAct = hoy.getFullYear();

export function NominaForm() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [periodo, setPeriodo] = useState<"PRIMERA_QUINCENA" | "SEGUNDA_QUINCENA">("PRIMERA_QUINCENA");
 const [mes, setMes] = useState(String(mesAct));
 const [anio, setAnio] = useState(String(anioAct));

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);

 const result = await crearNomina({
 periodo,
 mes: Number(mes),
 anio: Number(anio),
 fechaPago: fd.get("fechaPago") as string || undefined,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }
 router.push(`/nominas/${result.id}`);
 };

 const meses = [
 { v: "1", l: "Enero" }, { v: "2", l: "Febrero" },
 { v: "3", l: "Marzo" }, { v: "4", l: "Abril" },
 { v: "5", l: "Mayo" }, { v: "6", l: "Junio" },
 { v: "7", l: "Julio" }, { v: "8", l: "Agosto" },
 { v: "9", l: "Septiembre" }, { v: "10", l: "Octubre" },
 { v: "11", l: "Noviembre" }, { v: "12", l: "Diciembre" },
 ];

 return (
 <form onSubmit={handleSubmit} className="space-y-3"> {error && <p className="text-xs text-destructive">{error}</p>}

 <div className="space-y-1.5"> <Label>Período</Label> <Select value={periodo} onValueChange={(v) => setPeriodo((v ?? "PRIMERA_QUINCENA") as typeof periodo)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="PRIMERA_QUINCENA">1ra Quincena (1-15)</SelectItem> <SelectItem value="SEGUNDA_QUINCENA">2da Quincena (16-fin)</SelectItem> </SelectContent> </Select> </div> <div className="grid grid-cols-2 gap-2"> <div className="space-y-1.5"> <Label>Mes</Label> <Select value={mes} onValueChange={(v) => setMes((v ?? "1") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> {meses.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
 </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Año</Label> <Input
 type="number" value={anio}
 onChange={(e) => setAnio(e.target.value)}
 min="2020" max="2035" /> </div> </div> <div className="space-y-1.5"> <Label>Fecha de pago</Label> <Input name="fechaPago" type="date" /> <p className="text-xs text-muted-foreground">Opcional; se puede actualizar después</p> </div> <Separator /> <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1"> <p className="font-medium text-foreground">Cálculos automáticos:</p> <p>• AFP empleado: 2.87% del salario</p> <p>• SFS empleado: 3.04% del salario</p> <p>• SAM (subsidio alimentación): RD$ 1,000 por quincena</p> <p>• Se incluyen todos los empleados activos</p> </div> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants(), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Creando..." : "Crear nómina"}
 </button> </form> );
}
