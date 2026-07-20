"use client";

import { useState, useTransition } from "react";
import { Factory } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  batchStock,
  stockByIngredient,
  open,
  onOpenChange,
}: {
  batch: Batch | null;
  foodtruckId: number | null;
  batchStock: number;
  stockByIngredient: Map<number, number>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [cantidad, setCantidad] = useState("");
  const [notes, setNotes] = useState("");

  if (!batch) return null;

  const numCantidad = parseFloat(cantidad) || 0;

  function handleSubmit() {
    if (!cantidad || numCantidad <= 0) {
      toast.error("Ingresa una cantidad válida a producir");
      return;
    }
    if (!foodtruckId) {
      toast.error("Selecciona un food truck");
      return;
    }

    startTransition(async () => {
      const result = await produceBatch(batch!.ingredient_id, foodtruckId, numCantidad, notes);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Lote producido: +${numCantidad} ${batch!.unit}`);
        onOpenChange(false);
        setCantidad("");
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
          <div className="rounded-xl bg-muted/20 border border-border/60 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stock actual del lote</span>
            <span className="font-mono font-semibold text-sm">
              {batchStock} <span className="text-muted-foreground font-normal">{batch.unit}</span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="produce-qty">Cantidad a producir</Label>
            <div className="relative">
              <Input
                id="produce-qty"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {batch.unit}
              </span>
            </div>
          </div>

          {/* Consumo previsto de la receta */}
          {batch.batch_recipe.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                Va a consumir
              </Label>
              <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
                {batch.batch_recipe.map((r) => {
                  const currentStock = stockByIngredient.get(r.component_ingredient_id) ?? 0;
                  const needed = r.quantity * numCantidad;
                  const after = currentStock - needed;
                  const insufficient = numCantidad > 0 && after < 0;
                  return (
                    <div
                      key={r.batch_recipe_id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>{r.ingredient.name}</span>
                      <span
                        className={cn(
                          "font-mono text-xs",
                          insufficient ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        -{needed.toFixed(2)} {r.ingredient.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Si algún ingrediente queda en 0 o negativo, igual se permite y se avisa al staff.
              </p>
            </div>
          )}

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
          <Button
            className="w-full"
            disabled={isPending || !cantidad || numCantidad <= 0}
            onClick={handleSubmit}
          >
            {isPending ? "Produciendo..." : "Confirmar producción"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
