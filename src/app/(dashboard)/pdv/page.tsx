import { getConsumidorFinal, getTopProductosPDV } from "@/actions/pdv";
import { getTurnoActivo } from "@/actions/caja";
import { PDVTerminal } from "@/components/pdv/pdv-terminal";
import { auth } from "@/lib/auth";

export const metadata = { title: "Punto de Venta — Ferretería AP" };

export default async function PDVPage() {
  const [session, cf, topProductos, turno] = await Promise.all([
    auth(),
    getConsumidorFinal(),
    getTopProductosPDV(50),
    getTurnoActivo(),
  ]);

  const rol = (session?.user as { rol?: string } | undefined)?.rol ?? "VENDEDOR";
  const puedeEditarPrecio = ["ADMINISTRADOR", "ASISTENTE_ADMINISTRATIVO"].includes(rol);

  const productos = topProductos.map(p => ({
    ...p,
    precioVenta:    Number(p.precioVenta),
    factorFraccion: p.factorFraccion ? Number(p.factorFraccion) : null,
    stockActual:    Number(p.stockActual),
    stockMinimo:    Number(p.stockMinimo),
    costoUltimo:    Number(p.costoUltimo),
  }));

  const hora = turno
    ? new Date(turno.fechaApertura).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    // -m-6 neutraliza el p-6 del layout; h-[calc(100vh-72px)] = viewport menos header
    <div className="-m-6 flex flex-col" style={{ height: "calc(100vh - 72px)" }}>

      {/* Banner turno */}
      {!turno ? (
        <div
          className="flex items-center gap-3 px-5 py-2 shrink-0"
          style={{
            backgroundColor: "color-mix(in oklch, #d97706 10%, var(--background))",
            borderBottom: "1px solid color-mix(in oklch, #d97706 30%, transparent)",
          }}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: "#d97706" }}
          />
          <p className="text-xs" style={{ color: "#d97706" }}>
            No hay turno de caja abierto. Las ventas se enviarán sin asociar a ningún turno.
          </p>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 px-5 py-2 shrink-0"
          style={{
            backgroundColor: "color-mix(in oklch, #16a34a 8%, var(--background))",
            borderBottom: "1px solid color-mix(in oklch, #16a34a 25%, transparent)",
          }}
        >
          {/* Dot pulsante */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: "#16a34a" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#16a34a" }} />
          </span>
          <span className="text-xs font-medium" style={{ color: "#16a34a" }}>
            <span className="font-bold">#{turno.numero}</span>
            <span className="mx-1.5" style={{ opacity: 0.5 }}>·</span>
            <span>Turno abierto</span>
            <span className="mx-1.5" style={{ opacity: 0.5 }}>·</span>
            <span>Apertura {hora}</span>
          </span>
        </div>
      )}

      <PDVTerminal
        consumidorFinal={{ id: cf.id, nombre: cf.nombre }}
        turnoId={turno?.id}
        topProductos={productos}
        puedeEditarPrecio={puedeEditarPrecio}
      />
    </div>
  );
}
