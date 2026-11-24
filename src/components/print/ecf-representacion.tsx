/**
 * Parte inferior de la Representación Impresa del e-CF (DGII): QR, código de
 * seguridad y fecha de firma. La razón social, el tipo de comprobante, el e-NCF y
 * su vencimiento van en el encabezado de cada impresión (sin repetirlos aquí).
 * Server component: trae el QR en SVG del conector local. Solo con e-NCF.
 */
import { qrSvgECF, TIPO_ECF_NOMBRE } from "@/lib/ecf";

export interface DatosEcfImpresion {
  referencia: string; // id de la venta, o "nc_<id>" para notas de crédito
  ecfTipo: number | null;
  ecfEncf: string | null;
  ecfEstado: string | null;
  ecfCodigoSeguridad: string | null;
  ecfFechaFirma: string | null;
  ecfFechaVencSecuencia: string | null;
  ecfQrUrl: string | null;
}

/** Título del documento en palabras ("Factura de Consumo Electrónica"). */
export function tituloEcf(d: Pick<DatosEcfImpresion, "ecfTipo" | "ecfEncf">): string | null {
  if (!d.ecfEncf || !d.ecfTipo) return null;
  return TIPO_ECF_NOMBRE[d.ecfTipo] ?? null;
}

function limpiarSvg(svg: string) {
  // Viene del conector local; por si acaso, sin scripts ni manejadores de eventos.
  return svg.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
}

export async function EcfRepresentacion({ datos, variante }: { datos: DatosEcfImpresion; variante: "ticket" | "carta" }) {
  if (!datos.ecfEncf) return null;
  const svg = await qrSvgECF(datos.referencia);
  const noValido = datos.ecfEstado === "rechazado" || datos.ecfEstado === "error_interno";
  const ticket = variante === "ticket";

  const aviso = noValido && (
    <div style={{ border: "2px solid #000", padding: "4px", fontWeight: 900, fontSize: ticket ? "11px" : "12px", marginBottom: "6px", textAlign: "center" }}>
      COMPROBANTE NO VÁLIDO — {datos.ecfEstado === "rechazado" ? "RECHAZADO POR LA DGII" : "PENDIENTE DE CORRECCIÓN"}
    </div>
  );
  const qr = (tam: string) => svg ? (
    <div style={{ width: tam, height: tam, flexShrink: 0 }} className="ecf-qr" dangerouslySetInnerHTML={{ __html: limpiarSvg(svg) }} />
  ) : (
    <div style={{ fontSize: "8px", wordBreak: "break-all", maxWidth: ticket ? "70mm" : "60mm" }}>
      {datos.ecfQrUrl ? `Consulta: ${datos.ecfQrUrl}` : "QR no disponible"}
    </div>
  );
  const estilos = <style>{`.ecf-qr svg { width: 100%; height: 100%; display: block; }`}</style>;

  // Factura carta: compacto, a la izquierda, QR con los datos al lado (no le quita alto a la página).
  if (!ticket) {
    return (
      <div style={{ color: "#000", breakInside: "avoid" }}>
        {aviso}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {qr("24mm")}
          <div style={{ fontSize: "10px", lineHeight: 1.5 }}>
            {datos.ecfCodigoSeguridad && (
              <div style={{ fontWeight: 700 }}>
                Código de seguridad: <span style={{ fontFamily: "monospace" }}>{datos.ecfCodigoSeguridad}</span>
              </div>
            )}
            {datos.ecfFechaFirma && <div>Fecha de firma: {datos.ecfFechaFirma}</div>}
          </div>
        </div>
        {estilos}
      </div>
    );
  }

  // Ticket: centrado, QR grande y los datos debajo.
  return (
    <div style={{ textAlign: "center", margin: "4px 0", color: "#000", breakInside: "avoid" }}>
      {aviso}
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>{qr("34mm")}</div>
      {datos.ecfCodigoSeguridad && (
        <div style={{ fontSize: "10px", fontWeight: 700 }}>
          Código de seguridad: <span style={{ fontFamily: "monospace" }}>{datos.ecfCodigoSeguridad}</span>
        </div>
      )}
      {datos.ecfFechaFirma && <div style={{ fontSize: "9px" }}>Fecha de firma: {datos.ecfFechaFirma}</div>}
      {estilos}
    </div>
  );
}
