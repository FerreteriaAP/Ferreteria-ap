"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buscarProductosPorKeyword } from "@/actions/productos";
import { agregarItemsOC } from "@/actions/ordenes-compra";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Sugerencia = {
  id: string;
  nombre: string;
  codigo: string;
  unidadMedida: string;
  costoUltimo: number | null;
  exentoItbis: boolean;
};

type ItemStaging = {
  productoId: string;
  nombre: string;
  codigo: string;
  unidad: string;
  cantidad: number;
  costo: number;
  exentoItbis: boolean;
};

const UNIDADES = ["UND","PIE","M","M2","M3","KG","LB","GLL","FND","CJA","RLL","PLG","TN","SACO","QUINTAL","METRO3"];

export function AgregarItemsOcBtn({ ocId }: { ocId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ItemStaging[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda de producto
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscarProductos = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSugerencias([]); return; }
    setBuscando(true);
    try {
      const res = await buscarProductosPorKeyword(q.trim());
      setSugerencias(res.map(p => ({
        id:           p.id,
        nombre:       p.nombre,
        codigo:       p.codigo,
        unidadMedida: p.unidadMedida,
        costoUltimo:  p.costoUltimo != null ? Number(p.costoUltimo) : null,
        exentoItbis:  p.exentoItbis,
      })));
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarProductos(busqueda), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busqueda, buscarProductos]);

  function seleccionarProducto(p: Sugerencia) {
    // Si ya está en staging, incrementar cantidad
    const existe = items.find(i => i.productoId === p.id);
    if (existe) {
      setItems(prev => prev.map(i =>
        i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
      ));
    } else {
      setItems(prev => [...prev, {
        productoId:  p.id,
        nombre:      p.nombre,
        codigo:      p.codigo,
        unidad:      p.unidadMedida,
        cantidad:    1,
        costo:       p.costoUltimo ?? 0,
        exentoItbis: p.exentoItbis,
      }]);
    }
    setBusqueda("");
    setSugerencias([]);
  }

  function actualizarItem(idx: number, campo: keyof ItemStaging, valor: string | number | boolean) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [campo]: valor } : item));
  }

  function eliminarItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleGuardar() {
    if (!items.length) return;
    setGuardando(true);
    setError(null);
    try {
      const result = await agregarItemsOC(
        ocId,
        items.map(({ productoId, cantidad, costo, exentoItbis }) => ({
          productoId, cantidad, costo, exentoItbis,
        }))
      );
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      setItems([]);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  function handleOpenChange(val: boolean) {
    if (!val) { setItems([]); setBusqueda(""); setSugerencias([]); setError(null); }
    setOpen(val);
  }

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.costo, 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <PackagePlus size={15} />
        Agregar artículos
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base">Agregar artículos a la orden</DialogTitle>
          </DialogHeader>

          {/* Búsqueda */}
          <div className="px-6 py-3 border-b shrink-0 relative">
            <Input
              placeholder="Buscar producto por nombre o código…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="h-9"
              autoFocus
            />
            {(sugerencias.length > 0 || buscando) && (
              <div className="absolute left-6 right-6 top-full z-50 bg-background border rounded-lg shadow-lg mt-0.5 max-h-56 overflow-y-auto">
                {buscando && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Buscando…</p>
                )}
                {sugerencias.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => seleccionarProducto(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-4"
                  >
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{p.codigo}</span>
                      {p.nombre}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {p.costoUltimo != null
                        ? `RD$${p.costoUltimo.toFixed(2)}`
                        : "Sin costo"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de staging */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Plus size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Busca y agrega artículos arriba</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-28">Unidad</TableHead>
                    <TableHead className="w-24 text-right">Cantidad</TableHead>
                    <TableHead className="w-28 text-right">Costo</TableHead>
                    <TableHead className="w-24 text-right">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.productoId}>
                      <TableCell className="text-sm">
                        <p className="font-medium leading-tight">{item.nombre}</p>
                        <p className="text-xs font-mono text-muted-foreground">{item.codigo}</p>
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.unidad}
                          onChange={e => actualizarItem(idx, "unidad", e.target.value)}
                          className={cn(
                            "h-8 w-full rounded-md border bg-background px-2 text-xs",
                            "focus:outline-none focus:ring-2 focus:ring-primary/40"
                          )}
                        >
                          {UNIDADES.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0.01}
                          step={1}
                          value={item.cantidad}
                          onChange={e => actualizarItem(idx, "cantidad", Number(e.target.value))}
                          className="h-8 text-right w-20 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.costo}
                          onChange={e => actualizarItem(idx, "costo", Number(e.target.value))}
                          className="h-8 text-right w-24 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {(item.cantidad * item.costo).toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => eliminarItem(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t shrink-0 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {items.length > 0 && (
                <>
                  <span className="mr-4">
                    {items.length} {items.length === 1 ? "artículo" : "artículos"}
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    Subtotal: RD$
                    {subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={items.length === 0 || guardando}
                onClick={handleGuardar}
              >
                {guardando ? "Guardando…" : "Agregar a la orden"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
