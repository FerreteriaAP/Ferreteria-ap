"use client";

export function PrintCloseButtons() {
 return (
 <div className="no-print fixed top-4 right-4 z-50 flex gap-2"> <button
 onClick={() => window.print()}
 className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg shadow-lg hover:bg-black/80 transition-colors" > Imprimir / Guardar PDF
 </button> <button
 onClick={() => window.close()}
 className="px-3 py-2 bg-white border border-black/20 text-sm rounded-lg shadow-lg hover:bg-black/5 transition-colors" > Cerrar
 </button> </div> );
}
