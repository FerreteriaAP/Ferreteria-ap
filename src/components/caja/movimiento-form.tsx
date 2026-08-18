"use client";

import { useState, useActionState } from "react";
import { useEffect } from "react";
import { registrarMovimiento } from "@/actions/caja";

export function MovimientoForm({ turnoId }: { turnoId: string }) {
 const [open, setOpen] = useState(false);
 const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
 const [state, action, isPending] = useActionState(registrarMovimiento, null);

 useEffect(() => {
 if (state?.ok) setOpen(false);
 }, [state]);

 if (!open) {
 return (
 <button onClick={() => setOpen(true)}
 className="text-sm px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors"> + Movimiento
 </button> );
 }

 return (
 <form action={action} className="flex flex-wrap items-end gap-2 p-3 bg-muted/30 rounded-lg border"> <input type="hidden" name="turnoId" value={turnoId} /> <div className="flex gap-1"> {(["ENTRADA", "SALIDA"] as const).map(t => (
 <button key={t} type="button" onClick={() => setTipo(t)}
 className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors ${tipo === t ? (t === "ENTRADA" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600") : "bg-background hover:bg-accent"}`}> {t === "ENTRADA" ? " Entrada" : " Salida"}
 </button> ))}
 <input type="hidden" name="tipo" value={tipo} /> </div> <div> <input type="text" name="concepto" placeholder="Concepto" required
 className="h-8 w-40 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /> </div> <div> <input type="number" name="monto" placeholder="Monto" min="0.01" step="0.01" required
 className="h-8 w-28 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /> </div> <div> <input type="text" name="notas" placeholder="Notas (opc.)" className="h-8 w-32 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /> </div> <div className="flex gap-2 items-center"> <button type="submit" disabled={isPending}
 className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"> {isPending ? "…" : "Guardar"}
 </button> <button type="button" onClick={() => setOpen(false)}
 className="h-8 px-3 rounded-md border text-sm hover:bg-accent"> </button> </div> {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
 </form> );
}
