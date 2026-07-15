"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  KeySquare,
  Leaf,
  Tag,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ProfilePopover } from "@/components/admin/profile-popover";
import { usePermissions } from "@/hooks/usePermissions";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

// Links simples
const topLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingBag, exact: false },
  { href: "/admin/tareas", label: "Tareas", icon: ClipboardList, exact: false },
  { href: "/admin/expenses", label: "Gastos", icon: Receipt, exact: false },
];

// Sub-items del acordeón Food Trucks
const truckLinks = [
  { href: "/admin/food-trucks", label: "Food Trucks", icon: Truck },
  { href: "/admin/locations", label: "Ubicaciones", icon: MapPin },
];

// Sub-items del acordeón Catálogo
const catalogLinks = [
  { href: "/admin/ingredients", label: "Ingredientes", icon: Leaf },
  { href: "/admin/categories", label: "Categorías", icon: Tag },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/combos", label: "Combos", icon: Layers },
  { href: "/admin/menus", label: "Menús", icon: BookOpen },
];

// Sub-items del acordeón Usuarios
const usersLinks = [
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/permisos", label: "Permisos", icon: KeySquare },
];

// Mapeo href → module code (RBAC). Debe coincidir con supabase/migrations/create_rbac_system.sql
const HREF_TO_MODULE: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/orders": "orders",
  "/admin/tareas": "tareas",
  "/admin/expenses": "expenses",
  "/admin/food-trucks": "trucks.food_trucks",
  "/admin/locations": "trucks.locations",
  "/admin/ingredients": "catalog.ingredients",
  "/admin/categories": "catalog.categories",
  "/admin/products": "catalog.products",
  "/admin/combos": "catalog.combos",
  "/admin/menus": "catalog.menus",
  "/admin/users": "users.list",
  "/admin/roles": "users.roles",
  "/admin/permisos": "users.permissions",
};

function NavItems({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { loading: permLoading, canRead } = usePermissions();

  // Mientras cargan los permisos no ocultamos nada (evita parpadeo/bloqueo falso)
  const canSee = (href: string) => {
    if (permLoading) return true;
    const moduleCode = HREF_TO_MODULE[href];
    return moduleCode ? canRead(moduleCode) : true;
  };

  const visibleTopLinks = topLinks.filter((l) => canSee(l.href));
  const visibleTruckLinks = truckLinks.filter((l) => canSee(l.href));
  const visibleCatalogLinks = catalogLinks.filter((l) => canSee(l.href));
  const visibleUsersLinks = usersLinks.filter((l) => canSee(l.href));

  const truckActive = visibleTruckLinks.some((l) => pathname.startsWith(l.href));
  const catalogActive = visibleCatalogLinks.some((l) => pathname.startsWith(l.href));
  const usersActive = visibleUsersLinks.some((l) => pathname.startsWith(l.href));
  const [truckOpen, setTruckOpen] = useState(truckActive);
  const [catalogOpen, setCatalogOpen] = useState(catalogActive);
  const [usersOpen, setUsersOpen] = useState(usersActive);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col gap-1">
      {/* Links superiores */}
      {visibleTopLinks.map(({ href, label, icon: Icon, exact }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            isActive(href, exact)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </Link>
      ))}

      {visibleTruckLinks.length > 0 && (
        <>
          <div
            className="mx-3 my-1 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(232,197,71,0.4) 40%, rgba(232,197,71,0.4) 60%, transparent)",
            }}
          />

          {/* Acordeón Food Trucks */}
          <div>
            <button
              onClick={() => setTruckOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                truckActive
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <Truck className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Food Trucks</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  truckOpen && "rotate-180",
                )}
              />
            </button>

            {truckOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleTruckLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname.startsWith(href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {visibleCatalogLinks.length > 0 && (
        <>
          <div
            className="mx-3 my-1 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(232,197,71,0.4) 40%, rgba(232,197,71,0.4) 60%, transparent)",
            }}
          />

          {/* Acordeón Catálogo */}
          <div>
            <button
              onClick={() => setCatalogOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                catalogActive
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Catálogo</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  catalogOpen && "rotate-180",
                )}
              />
            </button>

            {catalogOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleCatalogLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname.startsWith(href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {visibleUsersLinks.length > 0 && (
        <>
          <div
            className="mx-3 my-1 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(232,197,71,0.4) 40%, rgba(232,197,71,0.4) 60%, transparent)",
            }}
          />

          {/* Acordeón Usuarios */}
          <div>
            <button
              onClick={() => setUsersOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                usersActive
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Usuarios</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  usersOpen && "rotate-180",
                )}
              />
            </button>

            {usersOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleUsersLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname.startsWith(href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  );
}

export function AdminSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const UserFooter = () => <ProfilePopover profile={profile} />;

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-60 h-full shrink-0 border-r border-border"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(232,197,71,0.06) 0%, transparent 55%), linear-gradient(180deg, #000000 0%, #0a0a08 35%, #111110 70%, #181815 100%)",
        }}
      >
        {/* Franja dorada superior */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #E8C547 40%, #E8C547 60%, transparent)",
          }}
        />
        <div className="flex items-center justify-center px-5 py-5 border-b border-white/6 ">
          <img
            src="/LogoTipo-3StreetFood.svg"
            alt="3 Street Food"
            className="h-15 w-auto margin-x-auto"
          />
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <NavItems pathname={pathname} />
        </div>
        <UserFooter />
      </aside>

      {/* Topbar móvil */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center">
          <Image
            src="/LogoTipo-3StreetFood.svg"
            alt="3 Street Food"
            width={120}
            height={28}
            className="h-7 w-auto"
          />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0 flex flex-col"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(232,197,71,0.06) 0%, transparent 55%), linear-gradient(180deg, #000000 0%, #0a0a08 35%, #111110 70%, #181815 100%)",
            }}
          >
            <div className="flex items-center px-5 py-5 border-b border-border">
              <Image
                src="/LogoTipo-3StreetFood.svg"
                alt="3 Street Food"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
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
