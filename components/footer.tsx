import Link from "next/link"
import Image from "next/image"
import { Instagram, Facebook, Twitter } from "lucide-react"

const footerLinks = {
  menu: [
    { label: "Productos", href: "#productos" },
    { label: "Historia", href: "#historia" },
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
                href="#" 
                className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
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
            © 2024 3 Street Food. Todos los derechos reservados.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hecho con pasión en la ciudad
          </p>
        </div>
      </div>
    </footer>
  )
}
