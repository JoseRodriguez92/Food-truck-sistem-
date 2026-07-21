"use client";

import { useEffect, useState, useTransition } from "react";
import { Factory } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { produceBatch } from "@/app/admin/lotes/actions";
import type { Batch } from "@/components/admin/views/batches-view";

export function BatchProduceDrawer({
  batch,
  foodtruckId,
  open,
  onOpenChange,
}: {
  batch: Batch | null;
  foodtruckId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [stockByIngredient, setStockByIngredient] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    if (!open || !batch || !foodtruckId) return;
    const ingredientIds = batch.items.map((it) => it.ingredient_id);
    if (ingredientIds.length === 0) return;

    const supabase = createClient();
    supabase
      .from("foodtruck_has_ingredient")
      .select("ingredient_id, stock")
      .eq("foodtruck_id", foodtruckId)
      .in("ingredient_id", ingredientIds)
      .then(({ data }) => {
        setStockByIngredient(new Map(data?.map((d) => [d.ingredient_id, d.stock]) ?? []));
      });
  }, [open, batch, foodtruckId]);

  if (!batch) return null;

  function handleSubmit() {
    if (!foodtruckId) {
      toast.error("Selecciona un food truck");
      return;
    }

    startTransition(async () => {
      const result = await produceBatch(batch!.production_batch_id, foodtruckId, notes);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Lote "${batch!.name}" producido`);
        onOpenChange(false);
        setNotes("");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-base flex items-center gap-2">
            <Factory className="w-4 h-4 text-primary" /> Producir lote
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{batch.name}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Vas a consumir
            </Label>
            <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
              {batch.items.map((it) => {
                const currentStock = stockByIngredient.get(it.ingredient_id) ?? 0;
                const after = currentStock - it.quantity;
                const insufficient = after < 0;
                return (
                  <div
                    key={it.production_batch_item_id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>{it.ingredient.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {currentStock} {it.ingredient.unit}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs",
                          insufficient ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        -{it.quantity} {it.ingredient.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Si algún ingrediente queda en 0 o negativo, igual se permite y se avisa al staff.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="produce-notes">
              Nota <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="produce-notes"
              placeholder="Ej: Producción de la mañana..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 bg-muted/10">
          <Button className="w-full" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Produciendo..." : "Confirmar producción"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
