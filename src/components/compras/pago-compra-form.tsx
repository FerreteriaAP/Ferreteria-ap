"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { registrarPago } from "@/actions/compras";
import { cn } from "@/lib/utils";

interface PagoCompraFormProps {
 compraId: string;
 saldo: number;
}

const hoy = new Date().toISOString().split("T")[0];

export function PagoCompraForm({ compraId, saldo }: PagoCompraFormProps) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [metodo, setMetodo] = useState("TRANSFERENCIA");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 const fd = new FormData(e.currentTarget);
 const result = await registrarPago(compraId, {
 monto: Number(fd.get("monto")),
 fecha: fd.get("fecha") as string,
 metodo: metodo as "EFECTIVO" | "CHEQUE" | "TRANSFERENCIA",
 referencia: fd.get("referencia") as string || undefined,
 notas: fd.get("notas") as string || undefined,
 });

 if ("error" in result && result.error) {
 const errs = result.error as Record<string, string[]>;
 setError(Object.values(errs).flat()[0] ?? "Error");
 setLoading(false);
 return;
 }

 router.refresh();
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-3"> {error && <p className="text-xs text-destructive">{error}</p>}

 <div className="space-y-1.5"> <Label>Monto (RD$)</Label> <Input
 name="monto" type="number" step="0.01" min="0.01" max={saldo}
 defaultValue={saldo.toFixed(2)}
 required
 /> <p className="text-xs text-muted-foreground">Saldo pendiente: RD$ {saldo.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</p> </div> <div className="space-y-1.5"> <Label>Fecha</Label> <Input name="fecha" type="date" defaultValue={hoy} required /> </div> <div className="space-y-1.5"> <Label>Método de pago</Label> <Select value={metodo} onValueChange={(v) => setMetodo((v ?? "TRANSFERENCIA") as string)}> <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="EFECTIVO">Efectivo</SelectItem> <SelectItem value="CHEQUE">Cheque</SelectItem> <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Referencia / N° Cheque</Label> <Input name="referencia" placeholder="Número de cheque o transferencia" /> </div> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Registrando..." : "Registrar pago"}
 </button> </form> );
}
