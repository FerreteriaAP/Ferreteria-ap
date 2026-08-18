"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setVendedorActivo, clearVendedorActivo } from "@/actions/vendedor-activo";

type V = { id: string; nombre: string; apellido: string; rol: string };

export function BannerVendedor({
 vendedor,
 vendedores,
}: {
 vendedor: V;
 vendedores: V[];
}) {
 const router = useRouter();
 const [pending, start] = useTransition();
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 // Cerrar dropdown al hacer clic fuera
 useEffect(() => {
 const fn = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
 };
 document.addEventListener("mousedown", fn);
 return () => document.removeEventListener("mousedown", fn);
 }, []);

 function cambiar(id: string) {
 setOpen(false);
 start(async () => {
 await setVendedorActivo(id);
 router.refresh();
 });
 }

 function salir() {
 setOpen(false);
 start(async () => {
 await clearVendedorActivo();
 router.refresh();
 });
 }

 const otros = vendedores.filter((v) => v.id !== vendedor.id);
 const iniciales = `${vendedor.nombre[0] ?? ""}${vendedor.apellido[0] ?? ""}`.toUpperCase();

 return (
 <div className="flex items-center justify-between rounded-xl border bg-primary/5 border-primary/20 px-4 py-2.5"> <div className="flex items-center gap-2.5"> <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0"> <span className="text-[11px] font-bold text-primary-foreground">{iniciales}</span> </div> <div className="text-sm"> <span className="text-muted-foreground">Operando como </span> <span className="font-semibold">{vendedor.nombre} {vendedor.apellido}</span> </div> </div> {/* Botón cambiar */}
 <div className="relative" ref={ref}> <button
 disabled={pending}
 onClick={() => setOpen((v) => !v)}
 className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1" > Cambiar
 <svg viewBox="0 0 16 16" fill="none" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}> <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg> </button> {open && (
 <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border bg-popover shadow-lg overflow-hidden z-50"> {otros.length > 0 && (
 <> <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"> Cambiar a
 </div> {otros.map((v) => (
 <button
 key={v.id}
 onClick={() => cambiar(v.id)}
 className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors" > {v.nombre} {v.apellido}
 </button> ))}
 <div className="border-t" /> </> )}
 <button
 onClick={salir}
 className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium" > Cerrar sesión de vendedor
 </button> </div> )}
 </div> </div> );
}
