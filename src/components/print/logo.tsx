/**
 * Logo vectorial de Ferretería AP para documentos de impresión.
 * Isotipo: AP dentro de octágono + texto "FERRETERÍA"
 * Colores exactos del logo oficial: naranja #f5821f, negro #000204
 */

interface PrintLogoProps {
  /** Ancho total del SVG en px (default 260) */
  width?: number;
  /** Alto total del SVG en px (default 72) */
  height?: number;
  /** Solo el isotipo (octágono + AP), sin el texto "FERRETERÍA" */
  isoOnly?: boolean;
}

export function PrintLogo({ width = 260, height = 72, isoOnly = false }: PrintLogoProps) {
  if (isoOnly) {
    return (
      <svg width={height} height={height} viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" aria-label="Ferretería AP">
        <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#000204" strokeWidth="2.5" />
        <polygon points="22,7 48,7 63,22 63,48 48,63 22,63 7,48 7,22" fill="none" stroke="#000204" strokeWidth="1" />
        <text x="35" y="50" fontFamily="'Arial Black', Impact, 'Franklin Gothic Heavy', sans-serif" fontSize="27" fontWeight="900" fill="#f5821f" textAnchor="middle">AP</text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 260 70" xmlns="http://www.w3.org/2000/svg" aria-label="Ferretería AP">
      {/* Octágono exterior */}
      <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#000204" strokeWidth="2.5" />
      {/* Octágono interior — borde doble */}
      <polygon points="22,7 48,7 62,21 62,49 48,63 22,63 8,49 8,21" fill="none" stroke="#000204" strokeWidth="1" />
      {/* Letras AP */}
      <text
        x="35" y="50"
        fontFamily="'Arial Black', Impact, 'Franklin Gothic Heavy', sans-serif"
        fontSize="27" fontWeight="900" fill="#f5821f" textAnchor="middle"
      >AP</text>
      {/* FERRETERÍA — F en naranja, resto negro */}
      <text
        x="78" y="51"
        fontFamily="'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif"
        fontSize="27" fontWeight="900" textAnchor="start"
      >
        <tspan fill="#f5821f">F</tspan>
        <tspan fill="#000204">ERRETERÍA</tspan>
      </text>
    </svg>
  );
}
