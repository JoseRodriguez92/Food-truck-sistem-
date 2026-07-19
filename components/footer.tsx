import Link from "next/link"
import Image from "next/image"
import { Instagram } from "lucide-react"

const footerLinks = {
  menu: [
    { label: "Productos", href: "#productos" },
    { label: "Historia", href: "#historia" },
    { label: "Arma Tu Truck", href: "#truck" },
    { label: "Ubicaciones", href: "#ubicaciones" },
    { label: "Contacto", href: "#contacto" },
  ],
  legal: [
    { label: "Términos de Servicio", href: "#" },
    { label: "Política de Privacidad", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="/LogoTipo-3StreetFood.svg"
                alt="3 Street Food"
                width={160}
                height={40}
              />
            </Link>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-sm leading-relaxed">
              Street food con actitud. Dorilocos, Crazy Fries, Boom Fries y Mindoggys. Sabores que explotan.
            </p>
            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <a
                href="https://www.instagram.com/tresstreetfood/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground transition-all duration-200 hover:text-white hover:scale-110 hover:shadow-lg hover:shadow-pink-500/30 hover:bg-linear-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600"
              >
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@tresstreetfood"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="group w-9 h-9 sm:w-10 sm:h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-black/40 hover:bg-black"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="overflow-visible">
                  <path
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    transform="translate(-0.9, -0.9)"
                    fill="#25F4EE"
                    d="M16.6 5.82c-1.02-.88-1.6-2.16-1.6-3.61h-3.03v13.83c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.84.13V10.4a5.85 5.85 0 0 0-.84-.06 5.84 5.84 0 1 0 5.84 5.84V9.4a8.44 8.44 0 0 0 4.94 1.58V7.95a5.62 5.62 0 0 1-3.34-2.13z"
                  />
                  <path
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    transform="translate(0.9, 0.9)"
                    fill="#FE2C55"
                    d="M16.6 5.82c-1.02-.88-1.6-2.16-1.6-3.61h-3.03v13.83c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.84.13V10.4a5.85 5.85 0 0 0-.84-.06 5.84 5.84 0 1 0 5.84 5.84V9.4a8.44 8.44 0 0 0 4.94 1.58V7.95a5.62 5.62 0 0 1-3.34-2.13z"
                  />
                  <path
                    fill="currentColor"
                    className="text-muted-foreground group-hover:text-white transition-colors"
                    d="M16.6 5.82c-1.02-.88-1.6-2.16-1.6-3.61h-3.03v13.83c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.84.13V10.4a5.85 5.85 0 0 0-.84-.06 5.84 5.84 0 1 0 5.84 5.84V9.4a8.44 8.44 0 0 0 4.94 1.58V7.95a5.62 5.62 0 0 1-3.34-2.13z"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Menú</h3>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.menu.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Legal</h3>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} 3 Street Food. Todos los derechos reservados.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hecho con pasión en la ciudad
          </p>
        </div>
      </div>
    </footer>
  )
}
