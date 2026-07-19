"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Check, LogIn, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Plantilla base: header naranja + card, reusable por cualquier toast del sistema ──

function ToastCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-border bg-card overflow-hidden shadow-xl shadow-black/40 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
      {children}
    </div>
  );
}

function ToastHeader({
  icon: Icon,
  iconBg,
  iconColor,
  text,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground">
      <span className={cn("flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0", iconBg)}>
        <Icon className={cn("w-2.5 h-2.5", iconColor)} strokeWidth={3.5} />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wide">{text}</span>
    </div>
  );
}

// ── Variante: item agregado al carrito (con thumbnail) ────────────────────────

export function showAddedToCart({
  name,
  image,
  fallbackIcon: FallbackIcon,
}: {
  name: string;
  image?: string | null;
  fallbackIcon: LucideIcon;
}) {
  toast.custom(() => (
    <ToastCard>
      <ToastHeader icon={Check} iconBg="bg-green-500" iconColor="text-white" text="Agregado al pedido" />
      <div className="flex items-center gap-3 p-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border shadow-lg shadow-black/50">
          {image ? (
            <Image src={image} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FallbackIcon className="w-5 h-5 text-muted-foreground opacity-40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">Se sumó a tu carrito</p>
        </div>
      </div>
    </ToastCard>
  ));
}

// ── Variante: mensaje simple, sin thumbnail (info / acción requerida) ─────────

export function showBrandMessage({
  headerText,
  message,
  icon = LogIn,
}: {
  headerText: string;
  message: string;
  icon?: LucideIcon;
}) {
  toast.custom(() => (
    <ToastCard>
      <ToastHeader icon={icon} iconBg="bg-white" iconColor="text-primary" text={headerText} />
      <div className="p-3">
        <p className="text-sm text-foreground">{message}</p>
      </div>
    </ToastCard>
  ));
}
