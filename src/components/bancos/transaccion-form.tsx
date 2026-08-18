"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { registrarTransaccion } from "@/actions/bancos";
import { cn } from "@/lib/utils";

type Cuenta = { id: string; banco: string; nombre: string; tipo: string; saldo: unknown };

interface TransaccionFormProps {
 cuentas: Cuenta[];
}

const hoy = new Date().toISOString().split("T")[0];

export function TransaccionForm({ cuentas }: TransaccionFormProps) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? "");
 const [tipo, setTipo] = useState<"DEPOSITO" | "RETIRO" | "TRANSFERENCIA" | "CHEQUE" | "CHEQUE_RECIBIDO" | "DEBITO_AUTOMATICO">("DEPOSITO");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 const fd = new FormData(e.currentTarget);

 const result = await registrarTransaccion({
 cuentaId,
 tipo,
 monto: Number(fd.get("monto")),
 descripcion: fd.get("descripcion") as string,
 referencia: fd.get("referencia") as string || undefined,
 fecha: fd.get("fecha") as string,
 notas: fd.get("notas") as string || undefined,
 });

 setLoading(false);
 if ("error" in result) { setError(result.error as string); return; }
 (e.target as HTMLFormElement).reset();
 setCuentaId(cuentas[0]?.id ?? "");
 setTipo("DEPOSITO");
 router.refresh();
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-3"> {error && <p className="text-xs text-destructive">{error}</p>}

 <div className="space-y-1.5"> <Label>Cuenta *</Label> <select
 value={cuentaId}
 onChange={(e) => setCuentaId(e.target.value)}
 className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" > {cuentas.map((c) => (
 <option key={c.id} value={c.id}> {c.banco} — {c.nombre}
 </option> ))}
 </select> </div> <div className="space-y-1.5"> <Label>Tipo *</Label> <select
 value={tipo}
 onChange={(e) => setTipo(e.target.value as typeof tipo)}
 className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" > <optgroup label="Entradas (+)"> <option value="DEPOSITO">Depósito (+)</option> <option value="TRANSFERENCIA">Transferencia recibida (+)</option> <option value="CHEQUE_RECIBIDO">Cheque recibido (+)</option> </optgroup> <optgroup label="Salidas (−)"> <option value="RETIRO">Retiro (−)</option> <option value="CHEQUE">Cheque emitido (−)</option> <option value="DEBITO_AUTOMATICO">Débito automático (−)</option> </optgroup> </select> </div> <div className="space-y-1.5"> <Label>Monto (RD$) *</Label> <Input name="monto" type="number" step="0.01" min="0.01" required /> </div> <div className="space-y-1.5"> <Label>Descripción *</Label> <Input name="descripcion" required placeholder="Concepto del movimiento" /> </div> <div className="space-y-1.5"> <Label>Fecha *</Label> <Input name="fecha" type="date" defaultValue={hoy} required /> </div> <div className="space-y-1.5"> <Label>Referencia</Label> <Input name="referencia" placeholder="N° cheque, transferencia..." /> </div> <div className="space-y-1.5"> <Label>Notas</Label> <Textarea name="notas" rows={2} /> </div> <Separator /> <button
 type="submit" disabled={loading}
 className={cn(buttonVariants(), "w-full", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Registrando..." : "Registrar movimiento"}
 </button> </form> );
}
