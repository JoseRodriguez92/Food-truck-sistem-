"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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

// Cada `section` DEBE coincidir con: 1) el `code` sembrado en supabase/migrations/create_rbac_system.sql
// y 2) el `case` correspondiente en app/dashboard/page.tsx

// Links simples
const topLinks = [
  { section: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { section: "orders", label: "Pedidos", icon: ShoppingBag },
  { section: "tareas", label: "Tareas", icon: ClipboardList },
  { section: "expenses", label: "Gastos", icon: Receipt },
];

// Sub-items del acordeón Food Trucks
const truckLinks = [
  { section: "trucks.food_trucks", label: "Food Trucks", icon: Truck },
  { section: "trucks.locations", label: "Ubicaciones", icon: MapPin },
];

// Sub-items del acordeón Catálogo
const catalogLinks = [
  { section: "catalog.ingredients", label: "Ingredientes", icon: Leaf },
  { section: "catalog.categories", label: "Categorías", icon: Tag },
  { section: "catalog.products", label: "Productos", icon: Package },
  { section: "catalog.combos", label: "Combos", icon: Layers },
  { section: "catalog.menus", label: "Menús", icon: BookOpen },
];

// Sub-items del acordeón Usuarios
const usersLinks = [
  { section: "users.list", label: "Usuarios", icon: Users },
  { section: "users.roles", label: "Roles", icon: Shield },
  { section: "users.permissions", label: "Permisos", icon: KeySquare },
];

function NavItems({
  activeSection,
  onNavigate,
}: {
  activeSection: string;
  onNavigate?: () => void;
}) {
  const { loading: permLoading, canRead } = usePermissions();

  // Mientras cargan los permisos no ocultamos nada (evita parpadeo/bloqueo falso)
  const canSee = (section: string) => (permLoading ? true : canRead(section));

  const visibleTopLinks = topLinks.filter((l) => canSee(l.section));
  const visibleTruckLinks = truckLinks.filter((l) => canSee(l.section));
  const visibleCatalogLinks = catalogLinks.filter((l) => canSee(l.section));
  const visibleUsersLinks = usersLinks.filter((l) => canSee(l.section));

  const truckActive = visibleTruckLinks.some((l) => l.section === activeSection);
  const catalogActive = visibleCatalogLinks.some((l) => l.section === activeSection);
  const usersActive = visibleUsersLinks.some((l) => l.section === activeSection);
  const [truckOpen, setTruckOpen] = useState(truckActive);
  const [catalogOpen, setCatalogOpen] = useState(catalogActive);
  const [usersOpen, setUsersOpen] = useState(usersActive);

  return (
    <nav className="flex flex-col gap-1">
      {/* Links superiores */}
      {visibleTopLinks.map(({ section, label, icon: Icon }) => (
        <Link
          key={section}
          href={`/dashboard?section=${section}`}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            activeSection === section
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
                className={cn("w-4 h-4 transition-transform duration-200", truckOpen && "rotate-180")}
              />
            </button>

            {truckOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleTruckLinks.map(({ section, label, icon: Icon }) => (
                  <Link
                    key={section}
                    href={`/dashboard?section=${section}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section
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
                className={cn("w-4 h-4 transition-transform duration-200", catalogOpen && "rotate-180")}
              />
            </button>

            {catalogOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleCatalogLinks.map(({ section, label, icon: Icon }) => (
                  <Link
                    key={section}
                    href={`/dashboard?section=${section}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section
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
                className={cn("w-4 h-4 transition-transform duration-200", usersOpen && "rotate-180")}
              />
            </button>

            {usersOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleUsersLinks.map(({ section, label, icon: Icon }) => (
                  <Link
                    key={section}
                    href={`/dashboard?section=${section}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section
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

export function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "dashboard";
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
        <div
          className="h-px w-full"
          style={{
            background: "linear-gradient(90deg, transparent, #E8C547 40%, #E8C547 60%, transparent)",
          }}
        />
        <div className="flex items-center justify-center px-5 py-5 border-b border-white/6 ">
          <img
            src="/LogoTipo-3StreetFood.svg"
            alt="3 Street Food"
            className="h-15 w-auto margin-x-auto"
          />
        </div>
        <div className="flex-1 p-3 overflow-y-auto scrollbar-brand">
          <NavItems activeSection={activeSection} />
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
            <div className="flex-1 p-3 overflow-y-auto scrollbar-brand">
              <NavItems activeSection={activeSection} onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
