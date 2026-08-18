"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Empleado {
 id: string;
 nombre: string;
 apellido: string;
 cargo: string;
}

interface Props {
 empleados: Empleado[];
 empleadoIdActual: string;
 desdeActual: string;
 hastaActual: string;
}

export function ReportePrestamosClient({
 empleados,
 empleadoIdActual,
 desdeActual,
 hastaActual,
}: Props) {
 const router = useRouter();
 const [empleadoId, setEmpleadoId] = useState(empleadoIdActual);
 const [desde, setDesde] = useState(desdeActual);
 const [hasta, setHasta] = useState(hastaActual);

 function aplicar() {
 const params = new URLSearchParams({ empleadoId, desde, hasta });
 router.push(`/nominas/prestamos?${params}`);
 }

 return (
 <div
 className="rounded-xl border bg-card px-5 py-4" style={{ backgroundColor: "var(--card-bg-hex, var(--card))" }}
 > <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"> Filtros del reporte
 </p> <div className="flex flex-col sm:flex-row gap-3 items-end"> {/* Empleado */}
 <div className="flex-1 space-y-1"> <label className="text-xs font-medium text-muted-foreground">Empleado</label> <select
 value={empleadoId}
 onChange={e => setEmpleadoId(e.target.value)}
 className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" > <option value="todos">Todos los empleados</option> {empleados.map(e => (
 <option key={e.id} value={e.id}> {e.nombre} {e.apellido} — {e.cargo}
 </option> ))}
 </select> </div> {/* Desde */}
 <div className="space-y-1"> <label className="text-xs font-medium text-muted-foreground">Desde</label> <input
 type="date" value={desde}
 onChange={e => setDesde(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /> </div> {/* Hasta */}
 <div className="space-y-1"> <label className="text-xs font-medium text-muted-foreground">Hasta</label> <input
 type="date" value={hasta}
 onChange={e => setHasta(e.target.value)}
 className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /> </div> {/* Botón */}
 <button
 onClick={aplicar}
 className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors" > Generar
 </button> </div> </div> );
}
