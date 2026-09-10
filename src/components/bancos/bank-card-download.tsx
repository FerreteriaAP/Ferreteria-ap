"use client";

interface CuentaCard {
  banco: string;
  nombre: string;
  numero: string;
  tipo: string;
}

interface Props {
  cuenta: CuentaCard;
  rnc?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatAccountNumber(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  if (digits.length >= 8) {
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }
  return numero;
}

// Dibuja el octágono con "AP" — idéntico al logo del sistema
function drawOctagonLogo(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number
) {
  const pts = 8;
  const angles = Array.from({ length: pts }, (_, i) =>
    ((i * 360) / pts - 22.5) * (Math.PI / 180)
  );

  // Octágono exterior (blanco)
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const x = cx + r * Math.cos(angles[i]);
    const y = cy + r * Math.sin(angles[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Anillo interior
  const r2 = r * 0.82;
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const x = cx + r2 * Math.cos(angles[i]);
    const y = cy + r2 * Math.sin(angles[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "AP" centrado en naranja
  ctx.font = `bold ${Math.round(r * 0.88)}px "Arial Black", Arial, sans-serif`;
  ctx.fillStyle = "#EC6E00";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AP", cx, cy + 2);

  // Reset
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ── Dibuja y descarga la tarjeta ──────────────────────────────────────────────

function drawCard(cuenta: CuentaCard, rnc?: string): void {
  const W = 856, H = 540, R = 28;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Fondo: degradado oscuro azul-pizarra ──────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0F1629");
  bg.addColorStop(1, "#1A2340");
  ctx.fillStyle = bg;
  roundedRect(ctx, 0, 0, W, H, R);
  ctx.fill();

  // Textura sutil (grid de puntos muy leve)
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.fillStyle = "#FFFFFF";
  for (let x = 20; x < W; x += 30) {
    for (let y = 20; y < H; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Acento izquierdo naranja (delgado)
  const stripe = ctx.createLinearGradient(0, 0, 0, H);
  stripe.addColorStop(0, "#F47717");
  stripe.addColorStop(0.6, "#F47717");
  stripe.addColorStop(1, "rgba(244,119,23,0)");
  ctx.fillStyle = stripe;
  roundedRect(ctx, 0, 0, 5, H, R);
  ctx.fill();

  // ── Logo (solo ícono, top-left) ──────────────────────────────────────────
  drawOctagonLogo(ctx, 70, 72, 48);

  // ── RNC (debajo del logo) ─────────────────────────────────────────────────
  if (rnc) {
    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(`RNC ${rnc}`, 54, 148);
  }

  // ── Separador ────────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 170);
  ctx.lineTo(W - 40, 170);
  ctx.stroke();

  // ── Banco ─────────────────────────────────────────────────────────────────
  ctx.font = `bold 40px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(cuenta.banco.toUpperCase(), 54, 238);

  // ── No. de Cuenta ─────────────────────────────────────────────────────────
  ctx.font = "11px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.letterSpacing = "2px";
  ctx.fillText("No. DE CUENTA", 54, 278);
  ctx.letterSpacing = "0px";

  ctx.font = `bold 36px "Courier New", monospace`;
  ctx.fillStyle = "#FFFFFF";
  ctx.letterSpacing = "3px";
  ctx.fillText(formatAccountNumber(cuenta.numero), 54, 322);
  ctx.letterSpacing = "0px";

  // ── Separador inferior ────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 375);
  ctx.lineTo(W - 40, 375);
  ctx.stroke();

  // ── Titular ───────────────────────────────────────────────────────────────
  ctx.font = "11px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.letterSpacing = "2px";
  ctx.fillText("TITULAR", 54, 410);
  ctx.letterSpacing = "0px";

  ctx.font = `bold 22px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(cuenta.nombre.toUpperCase(), 54, 442);

  // ── Tipo de cuenta ────────────────────────────────────────────────────────
  ctx.font = "11px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.letterSpacing = "2px";
  ctx.fillText("TIPO DE CUENTA", 500, 410);
  ctx.letterSpacing = "0px";

  ctx.font = `bold 22px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(cuenta.tipo, 500, 442);

  // ── Borde sutil ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 0, 0, W, H, R);
  ctx.stroke();
  ctx.restore();

  // ── Descarga ─────────────────────────────────────────────────────────────
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuenta-${cuenta.banco.replace(/\s+/g, "-").toLowerCase()}-${cuenta.numero.slice(-4)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ── Botón ─────────────────────────────────────────────────────────────────────

export function BankCardDownload({ cuenta, rnc }: Props) {
  return (
    <button
      onClick={() => drawCard(cuenta, rnc)}
      title="Descargar tarjeta de cuenta como PNG"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:brightness-110 active:scale-95"
      style={{
        backgroundColor: "color-mix(in oklch, #F47717 15%, transparent)",
        color: "#F47717",
        border: "1px solid color-mix(in oklch, #F47717 35%, transparent)",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Tarjeta PNG
    </button>
  );
}
