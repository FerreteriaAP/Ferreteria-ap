import { notFound } from "next/navigation";
import Link from "next/link";
import { getProducto, getMovimientosProducto } from "@/actions/productos";
import { cn } from "@/lib/utils";

export const metadata = { title: "Movimientos de inventario" };

interface Props {
 params: Promise<{ id: string }>;
 searchParams: Promise<{ page?: string }>;
}

const movTipo: Record<string, { label: string; color: string }> = {
 ENTRADA_COMPRA: { label: "Entrada Compra", color: "text-emerald-600" },
 ENTRADA_AJUSTE: { label: "Entrada Ajuste", color: "text-blue-600" },
 ENTRADA_DEVOLUCION:{ label: "Devolución entrada", color: "text-teal-600" },
 SALIDA_VENTA: { label: "Salida Venta", color: "text-orange-600" },
 SALIDA_AJUSTE: { label: "Salida Ajuste", color: "text-red-600" },
 SALIDA_DEVOLUCION: { label: "Devolución", color: "text-purple-600" },
};

export default async function MovimientosProductoPage({ params, searchParams }: Props) {
 const { id } = await params;
 const sp = await searchParams;
 const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

 const [producto, { items, total, pages }] = await Promise.all([
 getProducto(id),
 getMovimientosProducto(id, page, 50),
 ]);

 if (!producto) notFound();

 const fmtFecha = (d: string) => new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

 return (
 <div className="max-w-5xl space-y-5"> {/* Breadcrumb */}
 <nav className="flex items-center gap-2 text-sm text-muted-foreground"> <Link href="/productos" className="hover:text-foreground">Productos</Link> <span>/</span> <Link href={`/productos/${id}`} className="hover:text-foreground truncate max-w-[200px]">{producto.nombre}</Link> <span>/</span> <span className="text-foreground font-medium">Movimientos</span> </nav> {/* Header */}
 <div className="flex items-center justify-between"> <div> <h1 className="text-xl font-bold">Movimientos de inventario</h1> <p className="text-sm text-muted-foreground mt-0.5"> {producto.nombre} · <span className="font-mono">{producto.codigo}</span> </p> </div> <div className="text-right text-sm text-muted-foreground"> <p>Stock actual: <span className="font-bold text-foreground">{Number(producto.stockActual).toLocaleString("es-DO")} {producto.unidadMedida}</span></p> <p>{total} movimiento{total !== 1 ? "s" : ""}</p> </div> </div> {/* Tabla */}
 <div className="rounded-xl border bg-card overflow-hidden"> {items.length === 0 ? (
 <p className="text-center py-12 text-muted-foreground text-sm">Sin movimientos registrados</p> ) : (
 <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b bg-muted/30 text-xs text-muted-foreground"> <th className="text-left px-4 py-3">Fecha</th> <th className="text-left px-3 py-3">Tipo</th> <th className="text-right px-3 py-3">Cantidad</th> <th className="text-right px-3 py-3">Stock antes</th> <th className="text-right px-3 py-3">Stock después</th> <th className="text-right px-3 py-3">Costo</th> <th className="text-left px-4 py-3">Notas / Ref.</th> </tr> </thead> <tbody> {items.map((m) => {
 const info = movTipo[m.tipo] ?? { label: m.tipo, color: "" };
 const esEntrada = m.tipo.startsWith("ENTRADA");
 return (
 <tr key={m.id} className="border-b hover:bg-muted/20 transition-colors"> <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtFecha(m.createdAt)}</td> <td className="px-3 py-2.5"> <span className={cn("font-medium text-xs px-2 py-0.5 rounded-full bg-muted", info.color)}>{info.label}</span> </td> <td className={cn("px-3 py-2.5 text-right font-mono font-medium", esEntrada ? "text-emerald-600" : "text-red-600")}> {esEntrada ? "+" : "−"}{m.cantidad.toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> <td className="px-3 py-2.5 text-right font-mono text-muted-foreground"> {m.stockAntes.toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> <td className="px-3 py-2.5 text-right font-mono font-medium"> {m.stockDespues.toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> <td className="px-3 py-2.5 text-right font-mono text-muted-foreground"> {m.costo != null ? `RD$ ${m.costo.toLocaleString("es-DO", { minimumFractionDigits: 2 })}` : "—"}
 </td> <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate"> {m.notas ?? (m.referencia ? `Ref: ${m.referencia}` : "—")}
 </td> </tr> );
 })}
 </tbody> </table> </div> )}
 </div> {/* Paginación */}
 {pages > 1 && (
 <div className="flex items-center justify-center gap-2 text-sm"> {page > 1 && (
 <Link href={`/productos/${id}/movimientos?page=${page - 1}`}
 className="px-3 py-1.5 rounded border hover:bg-accent"> Anterior</Link> )}
 <span className="text-muted-foreground">Pág. {page} de {pages}</span> {page < pages && (
 <Link href={`/productos/${id}/movimientos?page=${page + 1}`}
 className="px-3 py-1.5 rounded border hover:bg-accent">Siguiente </Link> )}
 </div> )}
 </div> );
}
