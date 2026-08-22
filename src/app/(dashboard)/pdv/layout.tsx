// La lógica de VendedorGuard se maneja directamente en page.tsx
// para que el banner quede DENTRO del contenedor de altura fija del PDV
// y no cause scroll en los perfiles de vendedor/caja.
export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
