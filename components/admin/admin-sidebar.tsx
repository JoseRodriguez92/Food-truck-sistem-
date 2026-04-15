"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  MapPin,
  Truck,
  Menu,
  X,
  ChevronDown,
  Package,
  Layers,
  BookOpen,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import { ProfilePopover } from "@/components/admin/profile-popover";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

// Links simples
const topLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingBag, exact: false },
];

// Sub-items del acordeón Food Trucks
const truckLinks = [
  { href: "/admin/food-trucks", label: "Food Trucks", icon: Truck },
  { href: "/admin/locations",   label: "Ubicaciones", icon: MapPin },
];

// Sub-items del acordeón Catálogo
const catalogLinks = [
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/combos",   label: "Combos",    icon: Layers },
  { href: "/admin/menus",    label: "Menús",     icon: BookOpen },
];

// Sub-items del acordeón Usuarios
const usersLinks = [
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/roles", label: "Roles",    icon: Shield },
];

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const truckActive   = truckLinks.some((l) => pathname.startsWith(l.href));
  const catalogActive = catalogLinks.some((l) => pathname.startsWith(l.href));
  const usersActive   = usersLinks.some((l) => pathname.startsWith(l.href));
  const [truckOpen, setTruckOpen]     = useState(truckActive);
  const [catalogOpen, setCatalogOpen] = useState(catalogActive);
  const [usersOpen, setUsersOpen]     = useState(usersActive);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col gap-1">
      {/* Links superiores */}
      {topLinks.map(({ href, label, icon: Icon, exact }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            isActive(href, exact)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </Link>
      ))}

      {/* Acordeón Food Trucks */}
      <div>
        <button
          onClick={() => setTruckOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            truckActive
              ? "text-foreground bg-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Food Trucks</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              truckOpen && "rotate-180"
            )}
          />
        </button>

        {truckOpen && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
            {truckLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Acordeón Catálogo */}
      <div>
        <button
          onClick={() => setCatalogOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            catalogActive
              ? "text-foreground bg-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Catálogo</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              catalogOpen && "rotate-180"
            )}
          />
        </button>

        {catalogOpen && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
            {catalogLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Acordeón Usuarios */}
      <div>
        <button
          onClick={() => setUsersOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            usersActive
              ? "text-foreground bg-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Usuarios</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              usersOpen && "rotate-180"
            )}
          />
        </button>

        {usersOpen && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
            {usersLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

    </nav>
  );
}

export function AdminSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const displayName =
    profile?.first_name
      ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
      : profile?.email ?? "Admin";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const UserFooter = () => <ProfilePopover profile={profile} />;

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            3 Street Food
          </span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <NavItems pathname={pathname} />
        </div>
        <UserFooter />
      </aside>

      {/* Topbar móvil */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            3 Street Food
          </span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                <Truck className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                3 Street Food
              </span>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              <NavItems pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
