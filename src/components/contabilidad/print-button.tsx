"use client";

interface Props {
 className?: string;
}

export function PrintButton({ className }: Props) {
 return (
 <button
 type="button" onClick={() => window.print()}
 className={
 className ??
 "text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors print:hidden" }
 > Imprimir
 </button> );
}
