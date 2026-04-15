"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Truck, Menu, X, ShoppingCart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import { ProfilePopover } from "@/components/admin/profile-popover";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

type LocationItem = {
  location_id: number;
  name: string;
  city: string | null;
  food_truck: { food_truck_id: number; name: string; color: string | null } | { food_truck_id: number; name: string; color: string | null }[] | null;
};

function toSingle<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function SidebarInner({
  profile,
  locations,
}: {
  profile: Profile | null;
  locations: LocationItem[];
}) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const activeLocation = searchParams.get("location");
  const count = useCartStore((s) => s.count());
  const [open, setOpen]     = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function NavItems({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1 mt-2">
          Ubicaciones
        </p>
        {locations.length === 0 && (
          <p className="text-xs text-muted-foreground px-3">Sin ubicaciones disponibles</p>
        )}
        {locations.map((loc) => {
          const truck = toSingle(loc.food_truck);
          const isActive = activeLocation === String(loc.location_id) && pathname.startsWith("/client/menu");
          return (
            <Link
              key={loc.location_id}
              href={`/client/menu?location=${loc.location_id}`}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{loc.name}</p>
                {(loc.city || truck) && (
                  <p className={cn("text-xs truncate", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {[truck?.name, loc.city].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {truck?.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: truck.color }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  const UserFooter = () => <ProfilePopover profile={profile} />;

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border fixed top-0 left-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            3 Street Food
          </span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <NavItems />
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
        <div className="flex items-center gap-2">
          {mounted && count > 0 && (
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {count}
              </span>
            </div>
          )}
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
                <NavItems onNavigate={() => setOpen(false)} />
              </div>
              <UserFooter />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

export function ClientSidebar({
  profile,
  locations,
}: {
  profile: Profile | null;
  locations: LocationItem[];
}) {
  return (
    <Suspense fallback={null}>
      <SidebarInner profile={profile} locations={locations} />
    </Suspense>
  );
}
