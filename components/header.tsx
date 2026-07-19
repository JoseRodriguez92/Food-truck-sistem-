"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, X, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Productos", href: "#productos" },
  { label: "Historia", href: "#historia" },
  { label: "Arma Tu Truck", href: "#truck" },
  { label: "Ubicaciones", href: "#ubicaciones" },
  { label: "Contacto", href: "#contacto" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b border-border transition-colors",
        mobileMenuOpen ? "bg-background h-screen overflow-y-auto" : "bg-background/80 backdrop-blur-md",
      )}
    >
      <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", mobileMenuOpen && "flex flex-col h-full")}>
        <div className="flex py-4 items-center justify-between shrink-0">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/LogoTipo-3StreetFood.svg"
              alt="3 Street Food"
              width={160}
              height={40}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="font-semibold border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Link href="/client">Pide Online</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border flex-1 flex flex-col justify-center overflow-y-auto py-8">
            <nav className="flex flex-col gap-5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-2xl font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="pt-10">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full font-semibold border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/login");
                  }}
                >
                  Login
                </Button>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/client");
                  }}
                >
                  Pide Online
                </Button>
              </div>

              <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-border">
                <a
                  href="https://www.instagram.com/tresstreetfood/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground bg-accent/50 transition-all duration-200 hover:text-white hover:scale-110 hover:shadow-lg hover:shadow-pink-500/30 hover:bg-linear-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.tiktok.com/@tresstreetfood"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="group flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground bg-accent/50 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-black/40 hover:bg-black"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="overflow-visible">
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
          </div>
        )}
      </div>
    </header>
  );
}
