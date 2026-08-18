"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { registrarPagoVenta } from "@/actions/ventas";
import { cn } from "@/lib/utils";

interface Props {
 ventaId: string;
 saldo: number;
}

const hoy = new Date().toISOString().split("T")[0];

export function PagoVentaForm({ ventaId, saldo }: Props) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [metodo, setMetodo] = useState("EFECTIVO");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);
 const result = await registrarPagoVenta(ventaId, {
 monto: Number(fd.get("monto")),
 fecha: fd.get("fecha") as string,
 metodo,
 referencia: fd.get("referencia") as string || undefined,
 });
 setLoading(false);
 if ("error" in result) {
 setError(result.error as string);
 return;
 }
 router.refresh();
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-3"> {error && <p className="text-xs text-destructive">{error}</p>}

 <div className="space-y-1.5"> <Label>Monto (RD$)</Label> <Input name="monto" type="number" step="0.01" min="0.01" max={saldo} defaultValue={saldo.toFixed(2)} required /> <p className="text-xs text-muted-foreground"> Saldo: RD$ {saldo.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
 </p> </div> <div className="space-y-1.5"> <Label>Fecha</Label> <Input name="fecha" type="date" defaultValue={hoy} required /> </div> <div className="space-y-1.5"> <Label>Método</Label> <Select value={metodo} onValueChange={(v) => setMetodo((v ?? "EFECTIVO") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="EFECTIVO">Efectivo</SelectItem> <SelectItem value="CHEQUE">Cheque</SelectItem> <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem> <SelectItem value="TARJETA">Tarjeta</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Referencia</Label> <Input name="referencia" placeholder="N° cheque o confirmación" /> </div> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Registrando..." : "Registrar cobro"}
 </button> </form> );
}
