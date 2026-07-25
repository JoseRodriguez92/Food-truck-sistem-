"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X, LogIn, ClipboardList, Instagram, UtensilsCrossed, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProfilePopover } from "@/components/admin/profile-popover";
import { NotificationBell } from "@/components/admin/notification-bell";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

function SidebarInner({ profile, canAccessDashboard }: { profile: Profile | null; canAccessDashboard: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function NavItems({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-col gap-1">
        <Link
          href="/client/menu"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/client/menu")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          Menú
        </Link>

        {profile && (
          <Link
            href="/client/order"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/client/order")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            Mis pedidos
          </Link>
        )}

        {canAccessDashboard && (
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Ir al panel
          </Link>
        )}
      </nav>
    );
  }

  const UserFooter = () => {
    if (profile) return <ProfilePopover profile={profile} />;

    const search = searchParams.toString();
    const returnTo = `${pathname}${search ? `?${search}` : ""}`;
    return (
      <div className="p-3 border-t border-border">
        <Link
          href={`/login?redirect=${encodeURIComponent(returnTo)}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <LogIn className="w-4 h-4 shrink-0" />
          Iniciar sesión
        </Link>
      </div>
    );
  };

  const SocialLinks = () => (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-3 px-3 py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://www.instagram.com/tresstreetfood/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground bg-accent/50 transition-all duration-200 hover:text-white hover:scale-110 hover:shadow-lg hover:shadow-pink-500/30 hover:bg-linear-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600"
            >
              <Instagram className="w-4.5 h-4.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>Síguenos</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://www.tiktok.com/@tresstreetfood"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="group flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground bg-accent/50 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-black/40 hover:bg-black"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="overflow-visible">
                {/* Glitch de marca: sombra cian + sombra roja detrás del glyph blanco */}
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
          </TooltipTrigger>
          <TooltipContent>Síguenos</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border fixed top-0 left-0">
        <div className="flex items-center justify-center px-5 py-5 border-b border-border">
          <img
            src="/LogoTipo-3StreetFood.svg"
            alt="3 Street Food"
            className="h-15 w-auto"
          />
        </div>
        {profile && (
          <div className="flex items-center justify-end px-3 pt-3">
            <NotificationBell />
          </div>
        )}
        <div className="flex-1 p-3 overflow-y-auto">
          <NavItems />
        </div>
        <SocialLinks />
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
        <div className="flex items-center gap-1">
          {profile && <NotificationBell />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {open ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <div className="flex items-center justify-center px-5 py-5 border-b border-border">
                <Image
                  src="/LogoTipo-3StreetFood.svg"
                  alt="3 Street Food"
                  width={140}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
              <div className="flex-1 p-3 overflow-y-auto">
                <NavItems onNavigate={() => setOpen(false)} />
              </div>
              <SocialLinks />
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
  canAccessDashboard = false,
}: {
  profile: Profile | null;
  canAccessDashboard?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <SidebarInner profile={profile} canAccessDashboard={canAccessDashboard} />
    </Suspense>
  );
}
