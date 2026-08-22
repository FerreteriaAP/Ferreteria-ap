"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { abrirTurno } from "@/actions/caja";

export function AbrirTurnoForm() {
 const router = useRouter();
 const [state, action, isPending] = useActionState(abrirTurno, null);

 useEffect(() => {
 if (state?.id) {
 router.push(`/caja/${state.id}`);
 router.refresh();
 }
 }, [state, router]);

 return (
 <form action={action} className="flex flex-col sm:flex-row gap-3 max-w-md"> <div className="flex-1"> <label className="text-xs text-muted-foreground font-medium block mb-1">Monto de apertura (RD$)</label> <input
 type="number" name="montoApertura" min="0" step="0.01" defaultValue="0" className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required
 /> </div> <div className="flex-1"> <label className="text-xs text-muted-foreground font-medium block mb-1">Notas (opcional)</label> <input
 type="text" name="notas" placeholder="Turno apertura..." className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </div> <div className="flex items-end"> <button
 type="submit" disabled={isPending}
 className="h-10 px-6 rounded-full text-sm font-bold text-white disabled:opacity-50 transition-all"
        style={{ backgroundColor: "var(--accent-hex)", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent-hex) 40%, transparent)" }}
        > {isPending ? "Abriendo…" : "⚡ Abrir turno"}
 </button> </div> {state?.error && (
 <p className="text-sm text-destructive col-span-full">{state.error}</p> )}
 </form> );
}
