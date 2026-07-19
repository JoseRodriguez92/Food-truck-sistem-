"use client";

/**
 * NotificationBell
 *
 * Campanita de notificaciones conectada al hook useNotifications (ver
 * supabase/migrations/notification_system.sql + hooks/use-notifications.ts).
 * Muestra conteo de no leídas, lista con Realtime, y permite marcar
 * leída / marcar todas / archivar.
 *
 * @module components/admin/notification-bell
 */

import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Info,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification, type NotificationType } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_ICON: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  system: Settings,
};

// Solo error usa el color semántico "destructive" — el resto queda en un
// gris neutro para no empastar la lista con el dorado de marca (--primary
// y --accent son el mismo tono en modo oscuro, así que abusar de esos
// colores en la fila entera se ve sucio/anaranjado en vez de limpio).
function typeColor(type: NotificationType) {
  return type === "error" ? "text-destructive" : "text-muted-foreground";
}

function NotificationList({
  notifications,
  loading,
  onItemClick,
  onArchive,
  scrollClassName,
}: {
  notifications: AppNotification[];
  loading: boolean;
  onItemClick: (n: AppNotification) => void;
  onArchive: (id: string) => void;
  scrollClassName: string;
}) {
  if (loading) {
    return <div className="py-10 px-4 text-center text-sm text-muted-foreground">Cargando…</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-muted-foreground">
        <Bell className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm text-center">Todavía no hay notificaciones</p>
      </div>
    );
  }

  return (
    <ScrollArea className={scrollClassName}>
      <div className="flex flex-col">
        {notifications.map((n) => {
          const Icon = TYPE_ICON[n.type] ?? Info;
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => onItemClick(n)}
              className="group relative flex items-start gap-2.5 pl-4 pr-3 py-3 text-left border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-secondary/60"
            >
              {!n.is_read && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}

              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", typeColor(n.type))} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  <p
                    className={cn(
                      "text-sm leading-snug truncate",
                      n.is_read ? "text-muted-foreground" : "font-semibold text-foreground",
                    )}
                  >
                    {n.title}
                  </p>
                </div>
                {n.message && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{n.message}</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(n.id);
                }}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground transition-opacity"
                aria-label="Archivar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    archive,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();

  function handleClick(n: AppNotification) {
    if (!n.is_read) markAsRead(n.id);
    if (n.link_url) router.push(n.link_url);
  }

  const bellButton = (
    <Button variant="ghost" size="icon" className="relative shrink-0">
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center",
            "rounded-full bg-destructive px-1 text-[10px] font-medium text-white leading-none",
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      <span className="sr-only">Notificaciones</span>
    </Button>
  );

  const header = (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0",
        // El Sheet trae su propio botón de cerrar (X) flotando arriba a la
        // derecha — le damos espacio para que no se pise con "Marcar todas".
        isMobile && "pr-12",
      )}
    >
      <p className="text-sm font-semibold">Notificaciones</p>
      {unreadCount > 0 && (
        <button
          onClick={() => markAllAsRead()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Marcar todas
        </button>
      )}
    </div>
  );

  const browserPrompt = browserPermission === "default" && (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-secondary/40 shrink-0">
      <p className="text-xs text-muted-foreground">Avisos del navegador para pedidos nuevos</p>
      <button
        onClick={() => requestBrowserPermission()}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
      >
        <BellRing className="w-3.5 h-3.5" />
        Activar
      </button>
    </div>
  );

  // En mobile, un Popover anclado al ícono queda mal ubicado (el botón no
  // está en el borde de la pantalla, así que el panel se ve descuadrado
  // y deja contenido de la página asomando a los lados). Se usa un Sheet
  // que baja desde arriba, pegado al header donde vive la campanita.
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{bellButton}</SheetTrigger>
        <SheetContent
          side="top"
          className="p-0 gap-0 rounded-b-xl max-h-[75vh] flex flex-col"
        >
          <SheetTitle className="sr-only">Notificaciones</SheetTitle>
          {header}
          {browserPrompt}
          <NotificationList
            notifications={notifications}
            loading={loading}
            onItemClick={handleClick}
            onArchive={archive}
            scrollClassName="flex-1"
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] p-0 rounded-xl shadow-lg overflow-hidden"
      >
        {header}
        {browserPrompt}
        <NotificationList
          notifications={notifications}
          loading={loading}
          onItemClick={handleClick}
          onArchive={archive}
          scrollClassName="max-h-96"
        />
      </PopoverContent>
    </Popover>
  );
}
