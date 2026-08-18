import Link from "next/link";
import { getCxPPorSuplidor } from "@/actions/contabilidad";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { CxPMultiSelect } from "@/components/contabilidad/cxp-multi-select";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{ q?: string; todas?: string }>;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function CxPContabilidadPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const busqueda = params.q ?? "";
 const mostrarTodas = params.todas === "1";

 const grupos = await getCxPPorSuplidor({ mostrarTodas, busqueda });

 const totalGeneral = grupos.reduce((s, g) => s + g.totalSaldo, 0);
 const totalVencido = grupos.reduce((s, g) => s + g.totalVencido, 0);
 const totalCompras = grupos.reduce((s, g) => s + g.compras.length, 0);

 return (
 <div className="space-y-5"> <div className="flex flex-col sm:flex-row sm:items-end gap-3"> <div className="flex-1"> <div className="flex items-center gap-2"> <Link href="/contabilidad" className="text-muted-foreground hover:text-foreground transition-colors" title="Volver a Contabilidad"> <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> </Link> <h1 className="text-2xl font-bold">Cuentas por Pagar</h1> </div> <p className="text-sm text-muted-foreground mt-0.5"> {grupos.length} suplidor{grupos.length !== 1 ? "es" : ""} · {totalCompras} compra{totalCompras !== 1 ? "s" : ""}
 </p> </div> <Link
 href={mostrarTodas ? "/contabilidad/cxp" : "/contabilidad/cxp?todas=1"}
 className={cn(buttonVariants({ variant: mostrarTodas ? "default" : "outline", size: "sm" }))}
 > {mostrarTodas ? "Ver solo pendientes" : "Ver todas (incl. pagadas)"}
 </Link> </div> <div className="grid grid-cols-2 md:grid-cols-3 gap-3"> <div className="rounded-lg border bg-card p-4"> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total pendiente</p> <p className="text-xl font-bold mt-1">{fmt(totalGeneral)}</p> </div> <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vencido</p> <p className="text-xl font-bold mt-1 text-destructive">{fmt(totalVencido)}</p> </div> <div className="rounded-lg border bg-card p-4"> <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Al día</p> <p className="text-xl font-bold mt-1 text-green-700 dark:text-green-400">{fmt(totalGeneral - totalVencido)}</p> </div> </div> <form method="GET"> {mostrarTodas && <input type="hidden" name="todas" value="1" />}
 <Input
 name="q" defaultValue={busqueda}
 placeholder="Buscar suplidor o número de compra..." className="max-w-sm" /> </form> {grupos.length === 0 ? (
 <div className="text-center py-16 text-muted-foreground"> <div className="text-4xl mb-3"></div> <p className="font-medium text-lg">Sin cuentas pendientes por pagar</p> <p className="text-sm mt-1">Todos los suplidores están pagados</p> </div> ) : (
 <CxPMultiSelect grupos={grupos} /> )}
 </div> );
}
