"use client";

/**
 * OrdersFiltersBody / OrdersFiltersSheet
 *
 * Filtros de la vista de Pedidos (`/dashboard?section=orders`).
 *
 * - Desktop (lg+): `OrdersFiltersBody` se renderiza inline dentro de una card.
 * - Mobile/tablet (<lg): los mismos controles viven dentro de un bottom sheet
 *   que se abre con `OrdersFiltersTrigger`, ubicado al lado de la campanita
 *   de notificaciones en el `SectionHeader`. Así el listado de pedidos queda
 *   visible apenas entrás, sin el bloque de filtros comiéndose la pantalla.
 *
 * @module components/admin/orders-filters
 */

import { CalendarDays, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type QuickRange = "today" | "last7" | "month" | "all";

export type OrdersFiltersProps = {
  q: string;
  onQChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  from: string;
  onFromChange: (value: string) => void;
  to: string;
  onToChange: (value: string) => void;
  statuses: { status_order_id: string; name: string }[];
  hasActiveFilters: boolean;
  onSearch: () => void;
  onClear: () => void;
  onQuickRange: (range: QuickRange) => void;
  /** El rango viene del default "hoy", no de una elección explícita del usuario. */
  isDefaultRange?: boolean;
};

// ============================================================
// CUERPO DE FILTROS (compartido desktop / sheet)
// ============================================================
export function OrdersFiltersBody({
  q,
  onQChange,
  status,
  onStatusChange,
  from,
  onFromChange,
  to,
  onToChange,
  statuses,
  hasActiveFilters,
  onSearch,
  onClear,
  onQuickRange,
  isDefaultRange = false,
}: OrdersFiltersProps) {
  return (
    <div className="space-y-3">
      {isDefaultRange && (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          Por defecto solo se muestran los pedidos de hoy
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Cliente o # pedido..."
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="pl-8"
          />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.status_order_id} value={s.status_order_id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          placeholder="Desde"
        />

        <Input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="Hasta"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={onSearch} className="gap-1.5">
            <Search className="w-3.5 h-3.5" /> Buscar
          </Button>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Rango rápido:
          </span>
          <Button
            type="button"
            size="sm"
            variant={isDefaultRange ? "default" : "outline"}
            onClick={() => onQuickRange("today")}
          >
            Hoy
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onQuickRange("last7")}>
            7 días
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onQuickRange("month")}>
            Este mes
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onQuickRange("all")}>
            Todo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHEET MOBILE (trigger al lado de la campanita)
// ============================================================
export function OrdersFiltersSheet({
  open,
  onOpenChange,
  activeCount,
  ...bodyProps
}: OrdersFiltersProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative lg:hidden shrink-0"
          aria-label="Filtros de pedidos"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-border max-h-[85dvh] overflow-y-auto gap-0"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" /> Filtrar pedidos
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <OrdersFiltersBody {...bodyProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
