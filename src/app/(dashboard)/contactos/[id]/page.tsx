import { notFound } from "next/navigation";
import Link from "next/link";
import { getContacto } from "@/actions/contactos";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ChequeSupllidorBtn } from "@/components/cheques/cheque-btn";
import { Pencil, MapPin, Building2, CreditCard } from "lucide-react";

const tipoLabel:   Record<string, string> = { CLIENTE: "Cliente", SUPLIDOR: "Suplidor", AMBOS: "Cliente y Suplidor" };
const tipoVariant: Record<string, "default" | "secondary" | "outline"> = { CLIENTE: "default", SUPLIDOR: "secondary", AMBOS: "outline" };
const creditoLabel: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
  DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};
const ncfLabel: Record<string, string> = {
  B01: "B01 — Crédito Fiscal", B02: "B02 — Consumidor Final",
  B14: "B14 — Regímenes Especiales", B15: "B15 — Gubernamentales",
};

const CARD_BG = "color-mix(in srgb, var(--card) 55%, transparent)";
const ACCENT  = "var(--accent-hex)";

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG }}>
      <div className="px-5 py-3 border-b rounded-t-xl flex items-center gap-2"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        {icon && <span style={{ color: ACCENT }}>{icon}</span>}
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0"
      style={{ borderColor: "color-mix(in oklch, var(--border) 50%, transparent)" }}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
      <span className={mono ? "font-mono text-sm text-right" : "text-sm font-medium text-right"}>{value}</span>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactoPage({ params }: PageProps) {
  const { id } = await params;
  const [contacto, session] = await Promise.all([getContacto(id), auth()]);

  if (!contacto) notFound();

  const rol      = (session?.user as { rol?: string })?.rol ?? "";
  const esAdmin  = rol === "ADMINISTRADOR";
  const esSuplidor = contacto.tipo === "SUPLIDOR" || contacto.tipo === "AMBOS";

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/contactos">Contactos</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{contacto.nombre}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{contacto.nombre}</h1>
            <Badge variant={tipoVariant[contacto.tipo]}>{tipoLabel[contacto.tipo]}</Badge>
            {!contacto.activo && <Badge variant="destructive">Inactivo</Badge>}
          </div>
          {contacto.nombreLegal && (
            <p className="text-sm text-muted-foreground">{contacto.nombreLegal}</p>
          )}
          {contacto.rnc && (
            <p className="text-xs font-mono text-muted-foreground">RNC: {contacto.rnc}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {esAdmin && esSuplidor && (
            <ChequeSupllidorBtn
              contactoId={contacto.id}
              nombre={contacto.nombre}
              chequeListo={contacto.chequeListo}
            />
          )}
          <Link
            href={`/contactos/${id}/editar`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Pencil size={14} /> Editar
          </Link>
        </div>
      </div>

      {/* Grid: Datos generales | Condiciones comerciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Section title="Datos generales" icon={<Building2 size={13} />}>
          <div className="space-y-0">
            <Row label="Comprobante" value={ncfLabel[contacto.tipoComprobante] ?? contacto.tipoComprobante} />
            <Row label="Teléfono" value={contacto.telefono ?? "—"} mono />
            <Row label="Tel. alternativo" value={contacto.telefonoAlt ?? "—"} mono />
            <Row label="Email" value={contacto.email ?? "—"} />
          </div>
        </Section>

        <Section title="Condiciones comerciales" icon={<CreditCard size={13} />}>
          <div className="space-y-0">
            <Row label="Crédito" value={creditoLabel[contacto.credito] ?? contacto.credito} />
            <Row label="Límite crédito"
              value={contacto.limiteCredito
                ? `RD$ ${Number(contacto.limiteCredito).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`
                : "—"} mono />
            <Row label="Descuento fijo"
              value={contacto.descuentoFijo ? `${contacto.descuentoFijo}%` : "—"} />
            <Row label="Ventas" value={
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold">{contacto._count.ventas}</span>
                {contacto._count.ventas > 0 && (
                  <Link href={`/ventas?clienteId=${contacto.id}`}
                    className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium transition-colors hover:bg-muted/40"
                    style={{ color: ACCENT, borderColor: `color-mix(in oklch, ${ACCENT} 40%, transparent)` }}>
                    ver
                  </Link>
                )}
              </span>
            } />
            <Row label="Compras" value={<span className="font-bold">{contacto._count.compras}</span>} />
          </div>
        </Section>
      </div>

      {/* Notas */}
      {contacto.notas && (
        <Section title="Notas internas">
          <p className="text-sm whitespace-pre-line leading-relaxed">{contacto.notas}</p>
        </Section>
      )}

      {/* Direcciones */}
      <Section title={`Direcciones de entrega (${contacto.direcciones.length})`} icon={<MapPin size={13} />}>
        {contacto.direcciones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin direcciones registradas</p>
        ) : (
          <div className="space-y-3">
            {contacto.direcciones.map((dir) => (
              <div key={dir.id} className="rounded-xl border p-4 space-y-1.5"
                style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{dir.etiqueta}</span>
                  {dir.esPrincipal && <Badge variant="outline" className="text-xs">Principal</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {dir.direccion}{dir.sector ? `, ${dir.sector}` : ""} — {dir.ciudad}
                  {dir.provincia ? `, ${dir.provincia}` : ""}
                </p>
                {dir.referencia && (
                  <p className="text-xs text-muted-foreground italic">{dir.referencia}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

    </div>
  );
}
