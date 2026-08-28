/**
 * Logo vectorial de Ferretería AP para documentos de impresión.
 * Isotipo: AP dentro de octágono + texto "FERRETERÍA"
 * Colores exactos del logo oficial: naranja #f5821f, negro #000204
 *
 * Usa flex HTML para alinear el isotipo y el texto con precisión óptica.
 * El SVG interno del octágono mantiene la fidelidad vectorial.
 */

interface PrintLogoProps {
  /** Ancho total en px (default 280) — solo para variante completa */
  width?: number;
  /** Alto total en px (default 72) — controla el tamaño del octágono */
  height?: number;
  /** Solo el isotipo (octágono + AP), sin el texto "FERRETERÍA" */
  isoOnly?: boolean;
}

/** Octágono SVG puro — reutilizado en ambas variantes */
function Octagono({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 70 70"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <polygon
        points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20"
        fill="white"
        stroke="#000204"
        strokeWidth="2.5"
      />
      <polygon
        points="22,7 48,7 63,22 63,48 48,63 22,63 7,48 7,22"
        fill="none"
        stroke="#000204"
        strokeWidth="1"
      />
      <text
        x="35"
        y="35"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="'Arial Black', Impact, 'Franklin Gothic Heavy', sans-serif"
        fontSize="27"
        fontWeight="900"
        fill="#f5821f"
      >
        AP
      </text>
    </svg>
  );
}

export function PrintLogo({ width = 280, height = 72, isoOnly = false }: PrintLogoProps) {
  if (isoOnly) {
    return <Octagono size={height} />;
  }

  // Fuente proporcional al alto del octágono
  // A 72px de alto el font original era ~37px → ratio ≈ 0.51
  const fontSize = Math.round(height * 0.515);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(height * 0.17),
        width,
        lineHeight: 1,
      }}
      aria-label="Ferretería AP"
    >
      <Octagono size={height} />
      <span
        style={{
          fontFamily: "'Arial Black', 'Franklin Gothic Heavy', Impact, Arial, sans-serif",
          fontSize,
          fontWeight: 900,
          letterSpacing: "-0.5px",
          lineHeight: 1,
          /* Sin padding ni margin — CSS align-items:center hace el trabajo */
        }}
      >
        <span style={{ color: "#f5821f" }}>F</span>
        <span style={{ color: "#000204" }}>ERRETERÍA</span>
      </span>
    </div>
  );
}
