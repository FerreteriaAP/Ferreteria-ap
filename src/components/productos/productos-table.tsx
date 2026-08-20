"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  esFraccionable: boolean;
  categoria: { codigo: string };
  stockActual: number | string;
  stockMinimo: number | string;
  unidadMedida: string;
  costoUltimo: number | string;
  precioVenta: number | string;
  activo: boolean;
}

interface Props {
  productos: Producto[];
}

export function ProductosTableBody({ productos }: Props) {
  const router = useRouter();

  const formatDOP = (n: number | string) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  return (
    <TableBody>
      {productos.map((p) => {
        const stockBajo =
          Number(p.stockMinimo) > 0 && Number(p.stockActual) <= Number(p.stockMinimo);

        return (
          <TableRow
            key={p.id}
            onClick={() => router.push(`/productos/${p.id}`)}
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/60",
              !p.activo && "opacity-50"
            )}
          >
            <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
            <TableCell className="font-medium">
              <span className="font-semibold">
                {p.nombre}
              </span>
              {p.esFraccionable && (
                <Badge variant="outline" className="ml-2 text-xs">Fraccionable</Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs font-mono">
                {p.categoria.codigo}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <span className={cn("font-medium", stockBajo && "text-destructive")}>
                {Number(p.stockActual).toLocaleString("es-DO")}
              </span>{" "}
              <span className="text-xs text-muted-foreground">{p.unidadMedida}</span>
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {Number(p.stockMinimo).toLocaleString("es-DO")}
            </TableCell>
            <TableCell className="text-right text-sm">{formatDOP(p.costoUltimo)}</TableCell>
            <TableCell className="text-right font-medium">{formatDOP(p.precioVenta)}</TableCell>
            <TableCell className="text-center">
              {stockBajo ? (
                <Badge variant="destructive" className="text-xs">Bajo</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">OK</Badge>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}
