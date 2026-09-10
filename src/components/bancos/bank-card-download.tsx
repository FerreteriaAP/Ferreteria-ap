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

function drawOctagonLogo(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  bgColor: string
) {
  const pts = 8;
  const angles = Array.from({ length: pts }, (_, i) =>
    ((i * 360) / pts - 22.5) * (Math.PI / 180)
  );

  // Fondo del octágono = mismo color que la tarjeta (se funde)
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const x = cx + r * Math.cos(angles[i]);
    const y = cy + r * Math.sin(angles[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Anillo interior sutil
  const r2 = r * 0.82;
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const x = cx + r2 * Math.cos(angles[i]);
    const y = cy + r2 * Math.sin(angles[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // "AP" naranja centrado
  ctx.font = `bold ${Math.round(r * 0.85)}px Arial, sans-serif`;
  ctx.fillStyle = "#F47717";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AP", cx, cy + 1.5);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ── Separador ─────────────────────────────────────────────────────────────────

function drawSep(ctx: CanvasRenderingContext2D, y: number, pad: number, w: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  ctx.restore();
}

// ── Dibujar y descargar ───────────────────────────────────────────────────────

function drawCard(cuenta: CuentaCard, rnc?: string): void {
  const PAD    = 36;
  const W      = 640;
  const R      = 16;
  const BG     = "#222222";
  const ACCENT = "#F47717";
  const FG     = "#F0F0F0";
  const LABEL  = "rgba(255,255,255,0.65)";

  const LOGO_R = 26;

  // ── Layout Y ─────────────────────────────────────────────────────────────
  const HEADER_Y     = PAD + 22;
  const SEP1_Y       = HEADER_Y + 20;
  const LOGO_CY      = SEP1_Y + 22 + LOGO_R;
  const SEP2_Y       = LOGO_CY + LOGO_R + 24;
  const RNC_Y        = SEP2_Y + 26;
  const SEP3_Y       = RNC_Y + 22;
  const BANCO_Y      = SEP3_Y + 38;
  const CUENTA_LBL_Y = BANCO_Y + 38;
  const CUENTA_NUM_Y = CUENTA_LBL_Y + 22;
  const SEP4_Y       = CUENTA_NUM_Y + 26;
  const TIT_LBL_Y    = SEP4_Y + 28;
  const TIT_VAL_Y    = TIT_LBL_Y + 20;
  const H            = TIT_VAL_Y + PAD + 8;

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Fondo ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = BG;
  roundedRect(ctx, 0, 0, W, H, R);
  ctx.fill();

  // Stripe naranja izquierda
  const stripe = ctx.createLinearGradient(0, 0, 0, H);
  stripe.addColorStop(0,   ACCENT);
  stripe.addColorStop(0.6, ACCENT);
  stripe.addColorStop(1,   "rgba(244,119,23,0)");
  ctx.fillStyle = stripe;
  roundedRect(ctx, 0, 0, 4, H, R);
  ctx.fill();

  // ── DATOS BANCARIOS ───────────────────────────────────────────────────────
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "center";
  ctx.letterSpacing = "3px";
  ctx.fillText("DATOS BANCARIOS", W / 2, HEADER_Y);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";

  drawSep(ctx, SEP1_Y, PAD, W);

  // ── Logo + FERRETERÍA AP (izquierda) ──────────────────────────────────────
  const LOGO_CX = PAD + LOGO_R;
  drawOctagonLogo(ctx, LOGO_CX, LOGO_CY, LOGO_R, BG);

  const TX = LOGO_CX + LOGO_R + 13;
  const TY = LOGO_CY + 7;
  ctx.font = "bold 22px Arial, sans-serif";

  ctx.fillStyle = ACCENT;
  ctx.fillText("F", TX, TY);
  const wF = ctx.measureText("F").width;

  ctx.fillStyle = FG;
  ctx.fillText("ERRETERÍA ", TX + wF, TY);
  const wR = ctx.measureText("ERRETERÍA ").width;

  ctx.fillStyle = ACCENT;
  ctx.fillText("AP", TX + wF + wR, TY);

  drawSep(ctx, SEP2_Y, PAD, W);

  // ── RNC (sección propia entre dos separadores) ────────────────────────────
  if (rnc) {
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.fillStyle = LABEL;
    ctx.letterSpacing = "1.5px";
    ctx.fillText("RNC", PAD, RNC_Y);
    ctx.letterSpacing = "0px";

    ctx.font = "12px Arial, sans-serif";
    ctx.fillStyle = FG;
    ctx.fillText(rnc, PAD + 38, RNC_Y);
  }

  drawSep(ctx, SEP3_Y, PAD, W);

  // ── Banco ─────────────────────────────────────────────────────────────────
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillStyle = FG;
  ctx.fillText(cuenta.banco.toUpperCase(), PAD, BANCO_Y);

  // ── No. de Cuenta ─────────────────────────────────────────────────────────
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillStyle = LABEL;
  ctx.letterSpacing = "1.5px";
  ctx.fillText("No. DE CUENTA", PAD, CUENTA_LBL_Y);
  ctx.letterSpacing = "0px";

  ctx.font = `bold 16px "Courier New", monospace`;
  ctx.fillStyle = FG;
  ctx.letterSpacing = "1px";
  ctx.fillText(cuenta.numero.replace(/\D/g, ""), PAD, CUENTA_NUM_Y);
  ctx.letterSpacing = "0px";

  drawSep(ctx, SEP4_Y, PAD, W);

  // ── Titular / Tipo ────────────────────────────────────────────────────────
  const COL2 = W / 2 + 10;

  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillStyle = LABEL;
  ctx.letterSpacing = "1.5px";
  ctx.fillText("TITULAR", PAD, TIT_LBL_Y);
  ctx.fillText("TIPO DE CUENTA", COL2, TIT_LBL_Y);
  ctx.letterSpacing = "0px";

  ctx.font = "12px Arial, sans-serif";
  ctx.fillStyle = FG;
  ctx.fillText(cuenta.nombre.toUpperCase(), PAD, TIT_VAL_Y);
  ctx.fillText(
    cuenta.tipo.charAt(0).toUpperCase() + cuenta.tipo.slice(1).toLowerCase(),
    COL2,
    TIT_VAL_Y
  );

  // ── Borde sutil ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
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
