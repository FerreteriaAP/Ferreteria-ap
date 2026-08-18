import Link from "next/link";
import { cookies } from "next/headers";
import { getContactos } from "@/actions/contactos";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ContactosTable } from "@/components/contactos/contactos-table";
import { ContactosGrid } from "@/components/contactos/contactos-grid";
import { ViewToggle } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ tipo?: string; q?: string; page?: string; vista?: string }>;
}

const tipoLabel: Record<string, string> = {
  CLIENTE: "Cliente",
  SUPLIDOR: "Suplidor",
  AMBOS: "Ambos",
};

export default async function ContactosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tipo = (params.tipo ?? "todos") as "CLIENTE" | "SUPLIDOR" | "AMBOS" | "todos";
  const busqueda = params.q ?? "";
  const page = Number(params.page ?? 1);
  const jar = await cookies();
  const cookieVista = jar.get("vista-preferida")?.value;
  const vista = (params.vista ?? cookieVista) === "grid" ? "grid" : "lista";

  const { contactos, total, pages } = await getContactos({ tipo, busqueda, page });

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contactos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clientes y suplidores — {total} registros
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle
            vista={vista}
            listaHref={`/contactos?tipo=${tipo}${busqueda ? `&q=${busqueda}` : ""}`}
            gridHref={`/contactos?tipo=${tipo}${busqueda ? `&q=${busqueda}` : ""}&vista=grid`}
          />
          <Link href="/contactos/nuevo" className={buttonVariants()}>
            + Nuevo contacto
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1" method="GET">
          <input type="hidden" name="tipo" value={tipo} />
          {vista === "grid" && <input type="hidden" name="vista" value="grid" />}
          <Input
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por nombre, RNC, teléfono..."
            className="max-w-sm"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {(["todos", "CLIENTE", "SUPLIDOR", "AMBOS"] as const).map((t) => (
            <Link
              key={t}
              href={`/contactos?tipo=${t}${busqueda ? `&q=${busqueda}` : ""}${vista === "grid" ? "&vista=grid" : ""}`}
            >
              <Badge
                variant={tipo === t ? "default" : "outline"}
                className="cursor-pointer px-3 py-1"
              >
                {t === "todos" ? "Todos" : tipoLabel[t]}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {vista === "grid" ? (
        <ContactosGrid contactos={contactos} />
      ) : (
        <ContactosTable contactos={contactos} />
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/contactos?tipo=${tipo}&q=${busqueda}&page=${p}${vista === "grid" ? "&vista=grid" : ""}`}
              className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
