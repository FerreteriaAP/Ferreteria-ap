"use client";

interface Props {
 href: string; // URL de la página de impresión
 label?: string;
 className?: string;
}

/** Abre la vista de impresión en una nueva pestaña para guardar/imprimir como PDF */
export function PdfButton({ href, label = " Descargar PDF", className }: Props) {
 return (
 <button
 type="button" onClick={() => window.open(href, "_blank")}
 className={
 className ??
 "text-xs px-3 py-1.5 rounded-md border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium" }
 > {label}
 </button> );
}
