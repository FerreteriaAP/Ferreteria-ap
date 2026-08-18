import { notFound } from "next/navigation";
import Link from "next/link";
import { getProducto, getHistorialComprasProducto } from "@/actions/productos";

export const metadata = { title: "Historial de compras" };

interface Props {
 params: Promise<{ id: string }>;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: string) => new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function ComprasProductoPage({ params }: Props) {
 const { id } = await params;

 const [producto, historial] = await Promise.all([
 getProducto(id),
 getHistorialComprasProducto(id),
 ]);

 if (!producto) notFound();

 // Totales
 const totalCantidad = historial.reduce((s, h) => s + h.cantidad, 0);
 const totalInvertido = historial.reduce((s, h) => s + h.total, 0);
 const costoPromedioPonderado = totalCantidad > 0
 ? historial.reduce((s, h) => s + h.costoUnitario * h.cantidad, 0) / totalCantidad
 : 0;

 return (
 <div className="max-w-5xl space-y-5"> {/* Breadcrumb */}
 <nav className="flex items-center gap-2 text-sm text-muted-foreground"> <Link href="/productos" className="hover:text-foreground">Productos</Link> <span>/</span> <Link href={`/productos/${id}`} className="hover:text-foreground truncate max-w-[200px]">{producto.nombre}</Link> <span>/</span> <span className="text-foreground font-medium">Historial de compras</span> </nav> {/* Header */}
 <div className="flex items-start justify-between gap-4"> <div> <h1 className="text-xl font-bold">Historial de compras</h1> <p className="text-sm text-muted-foreground mt-0.5"> {producto.nombre} · <span className="font-mono">{producto.codigo}</span> </p> </div> </div> {/* KPIs */}
 {historial.length > 0 && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> <StatCard label="Total compras" value={String(historial.length)} /> <StatCard label="Unidades compradas" value={totalCantidad.toLocaleString("es-DO", { maximumFractionDigits: 2 }) + " " + producto.unidadMedida} /> <StatCard label="Costo prom. ponderado" value={fmt(costoPromedioPonderado)} /> <StatCard label="Total invertido" value={fmt(totalInvertido)} highlight /> </div> )}

 {/* Tabla */}
 <div className="rounded-xl border bg-card overflow-hidden"> {historial.length === 0 ? (
 <p className="text-center py-12 text-muted-foreground text-sm"> No hay compras registradas para este producto
 </p> ) : (
 <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b bg-muted/30 text-xs text-muted-foreground"> <th className="text-left px-4 py-3">Fecha</th> <th className="text-left px-3 py-3">Compra</th> <th className="text-left px-3 py-3">Suplidor</th> <th className="text-right px-3 py-3">Cantidad</th> <th className="text-right px-3 py-3">Costo unit.</th> <th className="text-right px-3 py-3">Subtotal</th> <th className="text-right px-4 py-3">Total (c/ITBIS)</th> </tr> </thead> <tbody> {historial.map((h) => (
 <tr key={h.id} className="border-b hover:bg-muted/20 transition-colors"> <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap"> {fmtFecha(h.fecha)}
 </td> <td className="px-3 py-2.5"> <Link href={h.compraUrl} className="font-mono text-xs font-semibold text-primary hover:underline"> {h.compraNumero}
 </Link> </td> <td className="px-3 py-2.5 font-medium">{h.suplidor}</td> <td className="px-3 py-2.5 text-right font-mono"> {h.cantidad.toLocaleString("es-DO", { maximumFractionDigits: 4 })} {producto.unidadMedida}
 </td> <td className="px-3 py-2.5 text-right font-mono">{fmt(h.costoUnitario)}</td> <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt(h.subtotal)}</td> <td className="px-4 py-2.5 text-right font-mono font-bold">{fmt(h.total)}</td> </tr> ))}
 </tbody> <tfoot> <tr className="border-t-2 bg-muted/40"> <td colSpan={3} className="px-4 py-3 font-bold text-sm"> Totales
 <span className="ml-2 text-xs font-normal text-muted-foreground"> {historial.length} compra{historial.length !== 1 ? "s" : ""}
 </span> </td> <td className="px-3 py-3 text-right font-mono font-bold"> {totalCantidad.toLocaleString("es-DO", { maximumFractionDigits: 4 })} {producto.unidadMedida}
 </td> <td className="px-3 py-3 text-right font-mono text-muted-foreground text-xs"> Prom: {fmt(costoPromedioPonderado)}
 </td> <td className="px-3 py-3 text-right font-mono font-bold"> {fmt(historial.reduce((s, h) => s + h.subtotal, 0))}
 </td> <td className="px-4 py-3 text-right font-mono font-bold text-base"> {fmt(totalInvertido)}
 </td> </tr> </tfoot> </table> </div> )}
 </div> </div> );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
 return (
 <div className={`rounded-lg border px-4 py-3 ${highlight ? "bg-primary/5 border-primary/20" : "bg-card"}`}> <p className="text-xs text-muted-foreground">{label}</p> <p className={`text-base font-bold font-mono mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</p> </div> );
}
