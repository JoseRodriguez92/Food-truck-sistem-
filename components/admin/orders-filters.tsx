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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="of-search" className="text-xs text-muted-foreground">
            Cliente o # pedido
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              id="of-search"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => onQChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="of-status" className="text-xs text-muted-foreground">
            Estado
          </Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger id="of-status" className="w-full">
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
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="of-from" className="text-xs text-muted-foreground">
              Desde
            </Label>
            <Input id="of-from" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="of-to" className="text-xs text-muted-foreground">
              Hasta
            </Label>
            <Input id="of-to" type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
          </div>
        </div>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
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
      </DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
            </span>
            Filtrar pedidos
          </DialogTitle>
        </DialogHeader>
        <OrdersFiltersBody {...bodyProps} />
      </DialogContent>
    </Dialog>
  );
}
