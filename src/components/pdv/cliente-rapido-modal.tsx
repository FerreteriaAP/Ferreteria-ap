"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { crearClienteRapido } from "@/actions/pdv";
import { cn } from "@/lib/utils";

export interface ClienteRapidoResult {
 id: string;
 nombre: string;
 rnc: string | null;
 tipoComprobante: string;
 telefono: string | null;
 direcciones: { id: string; etiqueta: string; direccion: string }[];
}

interface Props {
 onClose: () => void;
 onCreado: (cliente: ClienteRapidoResult) => void;
}

function capitalizarPalabras(s: string): string {
 return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function ClienteRapidoModal({ onClose, onCreado }: Props) {
 const [isPending, startTransition] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [nombre, setNombre] = useState("");
 const [telefono, setTelefono] = useState("");
 const [rnc, setRnc] = useState("");
 const [tipoNcf, setTipoNcf] = useState<"B01" | "B02" | "B14" | "B15">("B02");
 const [direccion, setDireccion] = useState("");
 const [sector, setSector] = useState("");
 const nombreRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 nombreRef.current?.focus();
 }, []);

 // Cerrar con Escape
 useEffect(() => {
 const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
 window.addEventListener("keydown", handler);
 return () => window.removeEventListener("keydown", handler);
 }, [onClose]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!nombre.trim()) { setError("El nombre es requerido"); return; }
 setError(null);

 startTransition(async () => {
 const res = await crearClienteRapido({
 nombre: nombre.trim(),
 telefono: telefono.trim() || undefined,
 rnc: rnc.trim() || undefined,
 tipoComprobante: tipoNcf,
 direccion: direccion.trim() || undefined,
 sector: sector.trim() || undefined,
 });

 if ("error" in res && res.error) {
 setError(res.error);
 return;
 }

 if (res.cliente) {
 onCreado({
 id: res.cliente.id,
 nombre: res.cliente.nombre,
 rnc: res.cliente.rnc ?? null,
 tipoComprobante: String(res.cliente.tipoComprobante),
 telefono: res.cliente.telefono ?? null,
 direcciones: res.cliente.direcciones.map(d => ({
 id: d.id,
 etiqueta: d.etiqueta,
 direccion: d.direccion,
 })),
 });
 }
 });
 };

 return (
 /* Overlay */
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}> <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-5"> {/* Encabezado */}
 <div className="flex items-center justify-between"> <h2 className="text-lg font-bold"> Nuevo cliente</h2> <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none"></button> </div> <form onSubmit={handleSubmit} className="space-y-4"> {/* Nombre */}
 <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre *</label> <input
 ref={nombreRef}
 type="text" required
 value={nombre}
 onChange={e => setNombre(e.target.value)}
 onBlur={e => setNombre(capitalizarPalabras(e.target.value))}
 placeholder="Nombre completo o razón social" className="mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </div> {/* Teléfono */}
 <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teléfono</label> <input
 type="tel" value={telefono}
 onChange={e => setTelefono(e.target.value)}
 placeholder="809-000-0000" className="mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </div> {/* RNC / Cédula */}
 <div className="grid grid-cols-2 gap-3"> <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">RNC / Cédula</label> <input
 type="text" value={rnc}
 onChange={e => setRnc(e.target.value)}
 placeholder="000-00000-0" className="mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </div> <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo comprobante</label> <select
 value={tipoNcf}
 onChange={e => setTipoNcf(e.target.value as "B01" | "B02" | "B14" | "B15")}
 className="mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" > <option value="B02">B02 – Consumidor Final</option> <option value="B01">B01 – Crédito Fiscal</option> <option value="B14">B14 – Régimen Especial</option> <option value="B15">B15 – Gubernamental</option> </select> </div> </div> {/* Dirección de entrega */}
 <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dirección de entrega (opcional)</label> <input
 type="text" value={direccion}
 onChange={e => setDireccion(e.target.value)}
 placeholder="Calle, número, edificio..." className="mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </div> {/* Sector */}
 {direccion && (
 <div> <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sector</label> <input
 type="text" value={sector}
 onChange={e => setSector(e.target.value)}
 placeholder="Los Alcarrizos, Piantini..." className="mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /> </div> )}

 {/* Error */}
 {error && (
 <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"> {error}
 </div> )}

 {/* Acciones */}
 <div className="flex gap-3 pt-1"> <button type="button" onClick={onClose}
 className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"> Cancelar
 </button> <button type="submit" disabled={isPending || !nombre.trim()}
 className={cn("flex-1 h-10 rounded-lg text-sm font-bold transition-colors",
 !isPending && nombre.trim()
 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed" )}> {isPending ? "Guardando…" : "Crear cliente"}
 </button> </div> </form> </div> </div> );
}
