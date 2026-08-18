import Link from "next/link";
import { getConducesPDV } from "@/actions/ventas";
import { DespachoCard } from "@/components/ventas/despacho-card";

export const metadata = { title: "Despachos PDV — Ferretería AP" };

interface PageProps {
 searchParams: Promise<{ filtro?: string }>;
}

export default async function DespachosPage({ searchParams }: PageProps) {
 const { filtro = "pendiente" } = await searchParams;

 const conduces = await getConducesPDV(
 filtro === "entregado" ? "entregado" : "pendiente" );

 const TABS = [
 { key: "pendiente", label: " Pendientes de entrega" },
 { key: "entregado", label: " Entregados" },
 ];

 return (
 <div className="space-y-5 max-w-4xl"> {/* Encabezado */}
 <div className="flex items-start justify-between gap-4 flex-wrap"> <div> <h1 className="text-2xl font-bold">Despachos PDV</h1> <p className="text-sm text-muted-foreground mt-0.5"> Conduces generados desde facturas cobradas en caja
 </p> </div> <Link href="/ventas" className="text-sm text-primary hover:underline">  Volver a Ventas
 </Link> </div> {/* Tabs */}
 <div className="flex gap-1 border-b"> {TABS.map(t => (
 <Link
 key={t.key}
 href={`/ventas/despachos?filtro=${t.key}`}
 className={[
 "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
 filtro === t.key
 ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
 ].join(" ")}
 > {t.label}
 </Link> ))}
 </div> {/* Lista de conduces */}
 {conduces.length === 0 ? (
 <div className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground"> <p className="text-3xl mb-3">{filtro === "entregado" ? "" : ""}</p> <p className="font-medium text-base"> {filtro === "entregado" ? "Ningún despacho marcado como entregado aún" : "Sin despachos pendientes — todo entregado"}
 </p> </div> ) : (
 <div className="space-y-3"> {conduces.map(c => (
 <DespachoCard key={c.ventaId} conduce={c} /> ))}
 </div> )}
 </div> );
}
