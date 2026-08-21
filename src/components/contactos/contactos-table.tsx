"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Contacto = {
 id: string;
 tipo: "CLIENTE" | "SUPLIDOR" | "AMBOS";
 nombre: string;
 rnc: string | null;
 telefono: string | null;
 credito: string;
 tipoComprobante: string;
 activo: boolean;
 direcciones: { etiqueta: string; ciudad: string; esPrincipal: boolean }[];
};

const tipoVariant: Record<string, "default" | "secondary" | "outline"> = {
 CLIENTE: "default",
 SUPLIDOR: "secondary",
 AMBOS: "outline",
};

const tipoLabel: Record<string, string> = {
 CLIENTE: "Cliente",
 SUPLIDOR: "Suplidor",
 AMBOS: "Ambos",
};

const creditoLabel: Record<string, string> = {
 CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
 DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

export function ContactosTable({ contactos }: { contactos: Contacto[] }) {
 if (contactos.length === 0) {
 return (
 <div className="text-center py-12 text-muted-foreground"> <div className="text-4xl mb-2"></div> <p className="font-medium">Sin contactos</p> <p className="text-sm">Crea el primer cliente o suplidor</p> </div> );
 }

 return (
 <Table> <TableHeader> <TableRow> <TableHead>Nombre</TableHead> <TableHead>Tipo</TableHead> <TableHead>RNC / Cédula</TableHead> <TableHead>Teléfono</TableHead> <TableHead>Comprobante</TableHead> <TableHead>Crédito</TableHead> <TableHead>Ciudad</TableHead> <TableHead className="w-20">Acciones</TableHead> </TableRow> </TableHeader> <TableBody> {contactos.map((c) => {
 const dirPrincipal = c.direcciones.find((d) => d.esPrincipal) ?? c.direcciones[0];
 return (
 <TableRow key={c.id} className={!c.activo ? "opacity-50" : undefined}> <TableCell className="font-medium"> <Link href={`/contactos/${c.id}`} className="hover:underline"> {c.nombre}
 </Link> </TableCell> <TableCell> <Badge variant={tipoVariant[c.tipo]} className="text-xs"> {tipoLabel[c.tipo]}
 </Badge> </TableCell> <TableCell className="text-muted-foreground text-sm">{c.rnc ?? "—"}</TableCell> <TableCell className="text-sm">{c.telefono ?? "—"}</TableCell> <TableCell> <Badge variant="outline" className="text-xs font-mono">{c.tipoComprobante}</Badge> </TableCell> <TableCell className="text-sm">{creditoLabel[c.credito] ?? c.credito}</TableCell> <TableCell className="text-sm text-muted-foreground"> {dirPrincipal?.ciudad ?? "—"}
 </TableCell> <TableCell> <Link
 href={`/contactos/${c.id}/editar`}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
 > Editar
 </Link> </TableCell> </TableRow> );
 })}
 </TableBody> </Table> );
}
