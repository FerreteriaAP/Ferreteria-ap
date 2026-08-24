import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { EMPRESA } from "@/lib/empresa";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtNum = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

const metodosLabel: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
};

export default async function ReciboCobro({ params }: PageProps) {
  const { id } = await params;

  const mov = await prisma.movimientoCaja.findUnique({
    where: { id },
    include: { turno: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
  });
  if (!mov || mov.subTipo !== "COBRO_CXC") notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cxc: any = null;
  if (mov.cxcId) {
    cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id: mov.cxcId },
      include: {
        venta: { select: { numero: true, total: true } },
        cliente: { select: { nombre: true, rnc: true, telefono: true } },
      },
    });
  }

  const fechaHora = new Date(mov.fecha).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const cajera = `${mov.turno.usuario.nombre} ${mov.turno.usuario.apellido}`.trim();
  const noRecibo = id.slice(-8).toUpperCase();

  return (
    <>
      <PrintButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", padding: "16px 0 6px" }}>
        Presiona <strong>Ctrl+P</strong> / <strong>⌘+P</strong> para imprimir
      </p>

      <div className="wrap">
        <div className="recibo">
          {/* HEADER */}
          <div className="hdr">
            <div className="hdr-empresa">
              <div className="empresa-ap">
                <span className="ap-box">AP</span>
                <span className="empresa-txt"> FERRETERÍA AP</span>
              </div>
              <div className="empresa-dir">{EMPRESA.dir} · {EMPRESA.ciudad}</div>
              <div className="empresa-dir">RNC: {EMPRESA.rnc} · Tel: {EMPRESA.tel}</div>
            </div>
            <div className="hdr-tipo">
              <div className="tipo-txt">RECIBO DE INGRESO</div>
              <div className="recibo-num">No. {noRecibo}</div>
              <div className="recibo-fecha">{fechaHora}</div>
            </div>
          </div>

          <div className="sep"></div>

          {/* CLIENTE */}
          <div className="section">
            <div className="section-lbl">RECIBIDO DE</div>
            <div className="section-val-lg">{cxc?.cliente?.nombre ?? "—"}</div>
            {cxc?.cliente?.rnc && <div className="section-sub">RNC: {cxc.cliente.rnc}</div>}
            {cxc?.cliente?.telefono && <div className="section-sub">Tel: {cxc.cliente.telefono}</div>}
          </div>

          <div className="sep-dashed"></div>

          {/* DETALLE DEL PAGO */}
          {cxc?.venta?.numero && (
            <div className="row-data">
              <span className="row-lbl">Factura referencia</span>
              <span className="row-val mono">{cxc.venta.numero}</span>
            </div>
          )}
          <div className="row-data">
            <span className="row-lbl">Forma de pago</span>
            <span className="row-val">{metodosLabel[mov.metodo ?? ""] ?? mov.metodo ?? "—"}</span>
          </div>
          <div className="row-data">
            <span className="row-lbl">Atendido por</span>
            <span className="row-val">{cajera}</span>
          </div>
          {mov.notas && (
            <div className="row-data">
              <span className="row-lbl">Notas</span>
              <span className="row-val">{mov.notas}</span>
            </div>
          )}

          <div className="sep-dashed"></div>

          {/* MONTO */}
          <div className="monto-box">
            <div className="monto-lbl">MONTO RECIBIDO</div>
            <div className="monto-val">RD$ {fmtNum(mov.monto)}</div>
          </div>

          <div className="sep-dashed"></div>

          {/* ESTADO */}
          <div className={`estado ${mov.confirmado ? "confirmado" : "pendiente"}`}>
            {mov.confirmado ? "✓ Cobro confirmado y aplicado" : "⏳ Pendiente de confirmación"}
          </div>

          <div className="sep-dashed"></div>

          {/* FIRMA */}
          <div className="firmas">
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">Cajero/a: {cajera}</div>
            </div>
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">Cliente</div>
            </div>
          </div>

          <div className="footer">
            Este recibo acredita el pago indicado. Consérvelo como comprobante.
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; background: #e0e0e0; }

        .wrap { max-width: 400px; margin: 0 auto; padding: 0 12px 32px; }
        .recibo { background: #fff; border-radius: 6px; padding: 20px 22px 16px; margin-top: 12px; box-shadow: 0 2px 10px rgba(0,0,0,.15); }

        /* Header */
        .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .ap-box { display: inline-block; border: 2px solid #000204; padding: 0 3px; font-size: 14px; font-weight: 900; font-family: 'Arial Black', sans-serif; }
        .empresa-txt { font-size: 13px; font-weight: 900; font-family: 'Arial Black', sans-serif; }
        .empresa-dir { font-size: 8px; color: #666; line-height: 1.5; margin-top: 2px; }
        .hdr-tipo { text-align: right; }
        .tipo-txt { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #f5821f; }
        .recibo-num { font-size: 15px; font-weight: 900; line-height: 1.1; }
        .recibo-fecha { font-size: 9px; color: #666; margin-top: 2px; }

        .sep { border-top: 2.5px solid #000204; margin: 0 0 12px; }
        .sep-dashed { border-top: 1px dashed #ccc; margin: 10px 0; }

        .section { margin-bottom: 10px; }
        .section-lbl { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 3px; }
        .section-val-lg { font-size: 14px; font-weight: 700; line-height: 1.2; }
        .section-sub { font-size: 10px; color: #555; }

        .row-data { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
        .row-lbl { font-size: 9.5px; color: #777; font-weight: 600; }
        .row-val { font-size: 10.5px; font-weight: 500; text-align: right; max-width: 55%; }
        .mono { font-family: 'Courier New', monospace; }

        .monto-box { text-align: center; padding: 10px 0; }
        .monto-lbl { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #999; margin-bottom: 4px; }
        .monto-val { font-size: 26px; font-weight: 900; font-family: 'Courier New', monospace; color: #000204; }

        .estado { font-size: 10px; font-weight: 600; text-align: center; padding: 6px 10px; border-radius: 4px; }
        .estado.confirmado { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .estado.pendiente { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }

        .firmas { display: flex; gap: 20px; }
        .firma { flex: 1; }
        .firma-line { border-bottom: 1px solid #aaa; height: 30px; margin-bottom: 4px; }
        .firma-lbl { font-size: 8.5px; color: #888; text-align: center; }

        .footer { font-size: 8.5px; color: #bbb; text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; }

        @media print {
          @page { size: 80mm auto; margin: 4mm 3mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; margin: 0; padding: 0; }
          .recibo { border-radius: 0; box-shadow: none; padding: 0; }
          .estado { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
