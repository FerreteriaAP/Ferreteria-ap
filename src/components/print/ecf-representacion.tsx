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
  const qrSize = ticket ? "34mm" : "30mm";

  return (
    <div style={{ textAlign: "center", margin: ticket ? "4px 0" : "10px 0", color: "#000", breakInside: "avoid" }}>
      {noValido && (
        <div style={{ border: "2px solid #000", padding: "4px", fontWeight: 900, fontSize: ticket ? "11px" : "13px", marginBottom: "6px" }}>
          COMPROBANTE NO VÁLIDO — {datos.ecfEstado === "rechazado" ? "RECHAZADO POR LA DGII" : "PENDIENTE DE CORRECCIÓN"}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
        {svg ? (
          <div
            style={{ width: qrSize, height: qrSize }}
            className="ecf-qr"
            dangerouslySetInnerHTML={{ __html: limpiarSvg(svg) }}
          />
        ) : (
          <div style={{ fontSize: "8px", wordBreak: "break-all", maxWidth: ticket ? "70mm" : "90mm" }}>
            {datos.ecfQrUrl ? `Consulta: ${datos.ecfQrUrl}` : "QR no disponible"}
          </div>
        )}
      </div>
      {datos.ecfCodigoSeguridad && (
        <div style={{ fontSize: ticket ? "10px" : "11px", fontWeight: 700 }}>
          Código de seguridad: <span style={{ fontFamily: "monospace" }}>{datos.ecfCodigoSeguridad}</span>
        </div>
      )}
      {datos.ecfFechaFirma && (
        <div style={{ fontSize: ticket ? "9px" : "10px" }}>Fecha de firma: {datos.ecfFechaFirma}</div>
      )}
      <style>{`.ecf-qr svg { width: 100%; height: 100%; display: block; }`}</style>
    </div>
  );
}
