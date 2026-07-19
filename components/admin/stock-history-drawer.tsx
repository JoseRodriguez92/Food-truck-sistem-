"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  SlidersHorizontal,
  History,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getStockHistory,
  type StockMovement,
} from "@/app/admin/ingredients/actions";
import type { IngredientWithStock } from "@/components/admin/views/ingredients-view";

const TYPE_CONFIG = {
  entrada: {
    label: "Entrada",
    icon: ArrowUpCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  salida: {
    label: "Salida",
    icon: ArrowDownCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  ajuste: {
    label: "Ajuste",
    icon: SlidersHorizontal,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockHistoryDrawer({
  ingredient,
  foodtruckId,
  open,
  onOpenChange,
}: {
  ingredient: IngredientWithStock | null;
  foodtruckId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !ingredient || !foodtruckId) return;
    startTransition(async () => {
      const data = await getStockHistory(foodtruckId, ingredient.ingredient_id);
      setMovements(data);
    });
  }, [open, ingredient, foodtruckId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <SheetTitle className="text-base">Historial de stock</SheetTitle>
          </div>
          {ingredient && (
            <p className="text-sm text-muted-foreground">{ingredient.name}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isPending ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <History className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="relative px-5 py-5">
              {/* línea vertical */}
              <div className="absolute left-[2.35rem] top-5 bottom-5 w-px bg-border/60" />

              <div className="flex flex-col gap-5">
                {movements.map((mov) => {
                  const cfg = TYPE_CONFIG[mov.type];
                  const Icon = cfg.icon;
                  const profile = mov.profiles?.[0] ?? null;
                  const name = profile
                    ? [profile.first_name, profile.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : null;

                  return (
                    <div key={mov.movement_id} className="flex gap-3">
                      {/* icono en la línea */}
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border border-border",
                          cfg.bg,
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      </div>

                      {/* contenido */}
                      <div className="flex-1 min-w-0 bg-muted/20 rounded-xl border border-border/60 px-3 py-2.5 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn("text-xs font-semibold", cfg.color)}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                            {formatDate(mov.created_at)}
                          </span>
                        </div>

                        {/* stock antes → después */}
                        <div className="flex items-center gap-1.5 font-mono text-sm">
                          <span className="text-muted-foreground">
                            {Number(mov.stock_before).toFixed(2)}
                          </span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                          <span className="font-semibold text-foreground">
                            {Number(mov.stock_after).toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-0.5">
                            (
                            {mov.type !== "ajuste"
                              ? `${mov.type === "entrada" ? "+" : "-"}${Number(mov.quantity).toFixed(2)}`
                              : `Δ${Number(mov.stock_after - mov.stock_before) >= 0 ? "+" : ""}${(Number(mov.stock_after) - Number(mov.stock_before)).toFixed(2)}`}
                            )
                          </span>
                        </div>

                        {/* notas y quién */}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          {mov.notes ? (
                            <p className="text-[11px] text-muted-foreground/80 truncate">
                              {mov.notes}
                            </p>
                          ) : (
                            <span />
                          )}
                          {name && (
                            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap shrink-0">
                              {name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
