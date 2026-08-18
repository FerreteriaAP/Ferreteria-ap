"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVendedorActivo } from "@/actions/vendedor-activo";

type Vendedor = {
 id: string;
 nombre: string;
 apellido: string;
 rol: string;
 stats: {
 ventasHoy: number;
 ventasMes: number;
 ordenesHoy: number;
 ordenesMes: number;
 comprasHoy: number;
 comprasMes: number;
 };
};

const ROL_LABEL: Record<string, string> = {
 ADMINISTRADOR: "Administrador",
 ASISTENTE_ADMINISTRATIVO: "Asistente Admin.",
 VENDEDOR: "Vendedor",
 CAJA: "Cajero",
};

function iniciales(nombre: string, apellido: string) {
 return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

const GRAD: string[] = [
 "from-violet-500 to-violet-700",
 "from-blue-500 to-blue-700",
 "from-teal-500 to-teal-700",
 "from-rose-500 to-rose-700",
 "from-amber-500 to-amber-700",
 "from-indigo-500 to-indigo-700",
];

export function VendedorSelector({
 vendedores,
 titulo = "¿Quién va a operar?",
 descripcion = "Selecciona tu perfil para continuar",
}: {
 vendedores: Vendedor[];
 titulo?: string;
 descripcion?: string;
}) {
 const router = useRouter();
 const [pending, start] = useTransition();

 function seleccionar(id: string) {
 start(async () => {
 await setVendedorActivo(id);
 router.refresh();
 });
 }

 return (
 <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 py-10 px-4"> {/* Título */}
 <div className="text-center space-y-1"> <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2> <p className="text-sm text-muted-foreground">{descripcion}</p> </div> {/* Tarjetas de vendedores */}
 <div className="flex flex-wrap justify-center gap-5 max-w-3xl"> {vendedores.map((v, i) => (
 <button
 key={v.id}
 disabled={pending}
 onClick={() => seleccionar(v.id)}
 className="group w-52 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-lg
 transition-all duration-150 text-left overflow-hidden active:scale-95 disabled:opacity-50" > {/* Avatar header */}
 <div className={`bg-gradient-to-br ${GRAD[i % GRAD.length]} h-28 flex items-center justify-center`}> <span className="text-4xl font-bold text-white tracking-tight select-none"> {iniciales(v.nombre, v.apellido)}
 </span> </div> {/* Info */}
 <div className="p-4 space-y-3"> <div> <p className="font-semibold text-sm leading-tight">{v.nombre} {v.apellido}</p> <p className="text-xs text-muted-foreground mt-0.5">{ROL_LABEL[v.rol] ?? v.rol}</p> </div> {/* Stats de hoy */}
 <div className="grid grid-cols-3 gap-1.5 text-center"> <StatCell label="Ventas" hoy={v.stats.ventasHoy} mes={v.stats.ventasMes} /> <StatCell label="O.Compra" hoy={v.stats.ordenesHoy} mes={v.stats.ordenesMes} /> <StatCell label="Compras" hoy={v.stats.comprasHoy} mes={v.stats.comprasMes} /> </div> <div className="pt-1 border-t flex items-center justify-center gap-1.5 text-xs font-semibold
 text-primary group-hover:text-primary transition-colors"> Seleccionar 
 </div> </div> </button> ))}
 </div> </div> );
}

function StatCell({ label, hoy, mes }: { label: string; hoy: number; mes: number }) {
 return (
 <div className="rounded-lg bg-muted/50 py-1.5 px-1"> <p className="text-[10px] text-muted-foreground leading-none mb-1">{label}</p> <p className="text-sm font-bold leading-none">{hoy}</p> <p className="text-[9px] text-muted-foreground leading-none mt-0.5">{mes} mes</p> </div> );
}
