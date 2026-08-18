import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoAPProps {
 /** Con enlace al dashboard */
 linked?: boolean;
 /** Solo el mark (octágono AP), sin el texto "Ferretería" */
 markOnly?: boolean;
 /** Altura del logo en px */
 height?: number;
 className?: string;
}

/**
 * Logo oficial de Ferretería AP.
 * markOnly = true  solo el octágono con AP (para topbar)
 * markOnly = false  logo completo con wordmark (para dashboard, login)
 */
export function LogoAP({ linked = true, markOnly = false, height = 38, className }: LogoAPProps) {
 const src = markOnly ? "/logo-mark.svg" : "/logo-full.svg";
 // El logo-full tiene aspecto ~540:200 = 2.7:1
 const width = markOnly ? height : Math.round(height * 2.7);

 const inner = (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={src}
 alt="Ferretería AP" width={width}
 height={height}
 className={cn("shrink-0 select-none", className)}
 style={{ height, width }}
 /> );

 if (!linked) return inner;

 return (
 <Link href="/dashboard" className="hover:opacity-85 transition-opacity" title="Inicio"> {inner}
 </Link> );
}
