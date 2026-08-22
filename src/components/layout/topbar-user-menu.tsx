"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

interface Props {
 name: string;
 email: string;
 rol: string;
 initials: string;
}

export function TopbarUserMenu({ name, email, rol, initials }: Props) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 // Cerrar al hacer clic fuera
 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, []);

 return (
 <div className="relative" ref={ref}> <button
 onClick={() => setOpen(v => !v)}
 className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors" > {/* Avatar */}
 <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0"> <span className="text-[11px] font-bold text-primary-foreground">{initials}</span> </div> {/* Info */}
 <div className="text-left hidden sm:block"> <p className="text-xs font-semibold text-foreground leading-none">{name}</p> <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{rol}</p> </div> {/* Chevron */}
 <svg viewBox="0 0 16 16" fill="none" className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}> <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg> </button> {open && (
 <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border bg-popover shadow-lg overflow-hidden z-50"> {/* Info */}
 <div className="px-3 py-2.5 border-b bg-muted/30"> <p className="text-xs font-semibold text-foreground truncate">{name}</p> <p className="text-[11px] text-muted-foreground truncate">{email}</p> </div> {/* Acciones */}
 <div className="p-1"> <button
 onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
 className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium" > <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"> <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l3-3-3-3M16 11H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/> </svg> Cerrar sesión
 </button> </div> </div> )}
 </div> );
}
