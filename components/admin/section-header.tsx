"use client";

/**
 * SectionHeader
 *
 * Header estándar de cada sección del panel admin: título + subtítulo,
 * slot de acciones propias de la vista (ej. "Nuevo rol"), y la campanita
 * de notificaciones (compartida en todas las secciones).
 *
 * @module components/admin/section-header
 */

import type { ReactNode } from "react";
import { NotificationBell } from "@/components/admin/notification-bell";

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-5 sm:px-6 sm:py-6"
      style={{
        backgroundImage: "linear-gradient(100deg, var(--primary) 0%, transparent 40%)",
        boxShadow: "0 -8px 20px -10px color-mix(in oklch, var(--primary) 20%, transparent)",
      }}
    >
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            {title}
          </h1>
          {subtitle && <p className="text-sm text-white/70 mt-1.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {actions}
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
