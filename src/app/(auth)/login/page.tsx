import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
 return (
 <div
 className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--background)" }}
 > <div className="w-full max-w-sm"> {/* Logo centrado */}
 <div className="flex flex-col items-center gap-4 mb-8"> {/* Octágono AP */}
 <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"> <polygon
 points="133.7,10 181.3,57.6 181.3,142.4 133.7,190 66.3,190 18.7,142.4 18.7,57.6 66.3,10" style={{ fill: "var(--card-bg-hex, #111923)", stroke: "var(--foreground)", strokeWidth: 7, strokeLinejoin: "round" }}/> <polygon
 points="127,23 170,66 170,134 127,177 73,177 30,134 30,66 73,23" style={{ fill: "none", stroke: "var(--foreground)", strokeWidth: 3, strokeLinejoin: "round" }}/> <text x="100" y="100" dominantBaseline="central" textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="84" letterSpacing="-3" style={{ fill: "var(--accent-hex)" }}>AP</text> </svg> {/* Wordmark */}
 <div className="flex items-baseline gap-0.5 select-none"> <span style={{ color: "var(--accent-hex)", fontWeight: 900, fontSize: 22, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>F</span> <span style={{ color: "var(--foreground)", fontWeight: 900, fontSize: 22, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>ERRETERÍA</span> </div> </div> {/* Card del formulario */}
 <div
 className="rounded-2xl p-7" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
 > <div className="mb-6"> <h1 className="text-lg font-bold mb-1" style={{ color: "#F5F7FA" }}>Iniciar sesión</h1> <p className="text-sm" style={{ color: "#71808D" }}>Ingresa tus credenciales para continuar</p> </div> <Suspense> <LoginForm /> </Suspense> </div> <p className="text-center text-xs mt-5" style={{ color: "#3A4652" }}> Sistema interno — solo personal autorizado
 </p> </div> </div> );
}
