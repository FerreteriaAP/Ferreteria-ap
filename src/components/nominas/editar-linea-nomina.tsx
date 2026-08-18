"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { actualizarLineaNomina } from "@/actions/nominas";
import { cn } from "@/lib/utils";

interface Props {
 lineaId: string;
 horasExtra: number;
 montoHorasExtra:number;
 bono: number;
 otrosIngresos: number;
 otrosDescuentos:number;
 notas: string | null;
 disabled?: boolean; // true si la nómina está PROCESADA/PAGADA
}

export function EditarLineaNomina({
 lineaId, horasExtra, montoHorasExtra, bono,
 otrosIngresos, otrosDescuentos, notas, disabled,
}: Props) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const [values, setValues] = useState({
 horasExtra, montoHorasExtra, bono, otrosIngresos, otrosDescuentos,
 notas: notas ?? "",
 });

 const handleSave = async () => {
 setLoading(true);
 await actualizarLineaNomina(lineaId, values);
 setLoading(false);
 setOpen(false);
 router.refresh();
 };

 if (disabled) return null;

 return (
 <div> {!open ? (
 <button
 type="button" onClick={() => setOpen(true)}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")}
 > Editar
 </button> ) : (
 <div className="mt-2 space-y-2 rounded-md border p-3 bg-muted/30"> <div className="grid grid-cols-2 gap-2 text-xs"> <div> <label className="text-muted-foreground">Horas extra</label> <Input type="number" step="0.5" min="0" className="h-7 mt-0.5" value={values.horasExtra}
 onChange={(e) => setValues(v => ({ ...v, horasExtra: Number(e.target.value) }))}
 /> </div> <div> <label className="text-muted-foreground">Monto h/extra (RD$)</label> <Input type="number" step="0.01" min="0" className="h-7 mt-0.5" value={values.montoHorasExtra}
 onChange={(e) => setValues(v => ({ ...v, montoHorasExtra: Number(e.target.value) }))}
 /> </div> <div> <label className="text-muted-foreground">Bono (RD$)</label> <Input type="number" step="0.01" min="0" className="h-7 mt-0.5" value={values.bono}
 onChange={(e) => setValues(v => ({ ...v, bono: Number(e.target.value) }))}
 /> </div> <div> <label className="text-muted-foreground">Otros ingresos (RD$)</label> <Input type="number" step="0.01" min="0" className="h-7 mt-0.5" value={values.otrosIngresos}
 onChange={(e) => setValues(v => ({ ...v, otrosIngresos: Number(e.target.value) }))}
 /> </div> <div className="col-span-2"> <label className="text-muted-foreground">Otros descuentos (RD$)</label> <Input type="number" step="0.01" min="0" className="h-7 mt-0.5" value={values.otrosDescuentos}
 onChange={(e) => setValues(v => ({ ...v, otrosDescuentos: Number(e.target.value) }))}
 /> </div> <div className="col-span-2"> <label className="text-muted-foreground">Notas</label> <Textarea rows={1} className="mt-0.5 text-xs" value={values.notas}
 onChange={(e) => setValues(v => ({ ...v, notas: e.target.value }))}
 /> </div> </div> <div className="flex gap-2"> <button
 type="button" onClick={handleSave}
 disabled={loading}
 className={cn(buttonVariants({ size: "sm" }), "text-xs h-7", loading && "opacity-50 pointer-events-none")}
 > {loading ? "Guardando..." : "Guardar"}
 </button> <button
 type="button" onClick={() => setOpen(false)}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs h-7")}
 > Cancelar
 </button> </div> </div> )}
 </div> );
}
