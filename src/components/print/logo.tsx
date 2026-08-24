/**
 * Logo vectorial de Ferretería AP para documentos de impresión.
 * Isotipo: AP dentro de octágono + texto "FERRETERÍA"
 * Colores exactos del logo oficial: naranja #f5821f, negro #000204
 */

interface PrintLogoProps {
  /** Ancho total del SVG en px (default 280) */
  width?: number;
  /** Alto total del SVG en px (default 72) */
  height?: number;
  /** Solo el isotipo (octágono + AP), sin el texto "FERRETERÍA" */
  isoOnly?: boolean;
}

export function PrintLogo({ width = 280, height = 72, isoOnly = false }: PrintLogoProps) {
  if (isoOnly) {
    return (
      <svg width={height} height={height} viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" aria-label="Ferretería AP">
        <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#000204" strokeWidth="2.5" />
        <polygon points="22,7 48,7 63,22 63,48 48,63 22,63 7,48 7,22" fill="none" stroke="#000204" strokeWidth="1" />
        <text
          x="35" y="35"
          dominantBaseline="central" textAnchor="middle"
          fontFamily="'Arial Black', Impact, 'Franklin Gothic Heavy', sans-serif"
          fontSize="27" fontWeight="900" fill="#f5821f"
        >AP</text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 285 70" xmlns="http://www.w3.org/2000/svg" aria-label="Ferretería AP">
      {/* Octágono exterior */}
      <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#000204" strokeWidth="2.5" />
      {/* Octágono interior — borde doble */}
      <polygon points="22,7 48,7 62,21 62,49 48,63 22,63 8,49 8,21" fill="none" stroke="#000204" strokeWidth="1" />
      {/* Letras AP — centradas en el octágono (centro: 35, 35) */}
      <text
        x="35" y="35"
        dominantBaseline="central" textAnchor="middle"
        fontFamily="'Arial Black', Impact, 'Franklin Gothic Heavy', sans-serif"
        fontSize="28" fontWeight="900" fill="#f5821f"
      >AP</text>
      {/* FERRETERÍA — F en naranja, resto negro; font mayor para proporcionar con el isotipo */}
      <text
        x="80" y="35"
        dominantBaseline="central" textAnchor="start"
        fontFamily="'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif"
        fontSize="31" fontWeight="900"
      >
        <tspan fill="#f5821f">F</tspan>
        <tspan fill="#000204">ERRETERÍA</tspan>
      </text>
    </svg>
  );
}
