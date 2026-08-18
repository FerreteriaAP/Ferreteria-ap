"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { crearGasto } from "@/actions/gastos";
import { cn } from "@/lib/utils";

type Categoria = { id: string; nombre: string; tipo: string };

interface GastoFormProps {
 categorias: Categoria[];
}

const hoy = new Date().toISOString().split("T")[0];

export function GastoForm({ categorias }: GastoFormProps) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [categoriaId, setCategoriaId] = useState("");
 const [metodo, setMetodo] = useState("EFECTIVO");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);

 if (!categoriaId) { setError("Selecciona una categoría"); setLoading(false); return; }

 const result = await crearGasto({
 categoriaId,
 descripcion: fd.get("descripcion") as string,
 monto: Number(fd.get("monto")),
 fecha: fd.get("fecha") as string,
 metodo: metodo || undefined,
 notas: fd.get("notas") as string || undefined,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }

 // Reset form
 (e.target as HTMLFormElement).reset();
 setCategoriaId("");
 setMetodo("EFECTIVO");
 router.refresh();
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-3"> {error && <p className="text-xs text-destructive">{error}</p>}

 <div className="space-y-1.5"> <Label>Categoría *</Label> <select
 value={categoriaId}
 onChange={(e) => setCategoriaId(e.target.value)}
 className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" > <option value="">— Seleccionar categoría —</option> {categorias.map((c) => (
 <option key={c.id} value={c.id}> {c.nombre} ({c.tipo === "FIJO" ? "Fijo" : "Variable"})
 </option> ))}
 </select> </div> <div className="space-y-1.5"> <Label>Descripción *</Label> <Input name="descripcion" required placeholder="Descripción del gasto" /> </div> <div className="space-y-1.5"> <Label>Monto (RD$) *</Label> <Input name="monto" type="number" step="0.01" min="0.01" required /> </div> <div className="space-y-1.5"> <Label>Fecha *</Label> <Input name="fecha" type="date" defaultValue={hoy} required /> </div> <div className="space-y-1.5"> <Label>Método de pago</Label> <Select value={metodo} onValueChange={(v) => setMetodo((v ?? "EFECTIVO") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="EFECTIVO">Efectivo</SelectItem> <SelectItem value="CHEQUE">Cheque</SelectItem> <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem> <SelectItem value="TARJETA">Tarjeta</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Notas</Label> <Textarea name="notas" rows={2} placeholder="Observaciones opcionales" /> </div> <Separator /> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants(), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Guardando..." : "Registrar gasto"}
 </button> </form> );
}
