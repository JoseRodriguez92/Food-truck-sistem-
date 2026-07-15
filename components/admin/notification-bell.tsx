"use client";

/**
 * NotificationBell
 *
 * Shell de UI para el futuro módulo de notificaciones. Por ahora no hay
 * backend (tabla/triggers) conectado — solo el ícono + panel vacío,
 * listo para engancharse cuando se construya el módulo real.
 *
 * @module components/admin/notification-bell
 */

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  // TODO: reemplazar por el conteo real cuando exista la tabla de notificaciones
  const unreadCount = 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 px-4 text-muted-foreground">
          <Bell className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm text-center">Todavía no hay notificaciones</p>
          <p className="text-xs mt-1 text-center">Este módulo está en construcción</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
