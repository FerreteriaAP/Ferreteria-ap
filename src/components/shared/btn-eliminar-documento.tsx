"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
 AlertDialog,
 AlertDialogContent,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogCancel,
 AlertDialogAction,
 AlertDialogTrigger,
 AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
 /** Texto del botón disparador */
 label?: string;
 /** Número/identificador del documento (ej. "NOM-2025-08-2Q") */
 documento: string;
 /** Acción server que recibe el id y devuelve {error?} | void (puede redirigir) */
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 accion: (id: string) => Promise<any>;
 id: string;
 /** Si no redirige sola, ruta a la que navegar tras eliminar */
 redirectTo?: string;
 /** Clase adicional para el botón disparador */
 className?: string;
 /** Variante del botón disparador */
 variant?: "outline" | "ghost" | "destructive";
 /** Tamaño del botón */
 size?: "sm" | "default";
}

export function BtnEliminarDocumento({
 label = " Eliminar",
 documento,
 accion,
 id,
 redirectTo,
 className,
 variant = "outline",
 size = "sm",
}: Props) {
 const router = useRouter();
 const [isPending, start] = useTransition();
 const [error, setError] = useState<string | null>(null);
 const [open, setOpen] = useState(false);

 const handleConfirm = () => {
 setError(null);
 start(async () => {
 const res = await accion(id);
 // Si la acción hizo redirect(), res === undefined (Next captura el throw internamente)
 // Si devolvió {error}, mostramos el error
 if (res && "error" in res && res.error) {
 setError(res.error as string);
 return;
 }
 setOpen(false);
 if (redirectTo) router.push(redirectTo);
 else router.refresh();
 });
 };

 return (
 <AlertDialog open={open} onOpenChange={setOpen}> <AlertDialogTrigger
 className={cn(
 buttonVariants({ variant, size }),
 "text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
 className
 )}
 > {label}
 </AlertDialogTrigger> <AlertDialogContent size="sm"> <AlertDialogHeader> <AlertDialogMedia> <span className="text-xl"></span> </AlertDialogMedia> <AlertDialogTitle>Eliminar documento</AlertDialogTitle> <AlertDialogDescription> ¿Seguro que quieres eliminar <strong>{documento}</strong>?
 Esta acción no se puede deshacer.
 </AlertDialogDescription> </AlertDialogHeader> {error && (
 <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2"> {error}
 </p> )}

 <AlertDialogFooter> <AlertDialogCancel onClick={() => setError(null)}> Cancelar
 </AlertDialogCancel> <AlertDialogAction
 variant="destructive" onClick={handleConfirm}
 disabled={isPending}
 > {isPending ? "Eliminando…" : "Sí, eliminar"}
 </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> );
}
