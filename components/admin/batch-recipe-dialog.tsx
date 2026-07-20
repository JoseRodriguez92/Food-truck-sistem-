"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import {
  saveBatchRecipeItem,
  removeBatchRecipeItem,
} from "@/app/admin/lotes/actions";
import type { Batch, AllIngredient } from "@/components/admin/views/batches-view";

export function BatchRecipeDialog({
  batch,
  allIngredients,
  open,
  onOpenChange,
}: {
  batch: Batch | null;
  allIngredients: AllIngredient[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [componentId, setComponentId] = useState("");
  const [quantity, setQuantity] = useState("");

  if (!batch) return null;

  const usedIds = new Set(batch.batch_recipe.map((r) => r.component_ingredient_id));
  const pickable = allIngredients.filter(
    (i) => i.ingredient_id !== batch.ingredient_id && !usedIds.has(i.ingredient_id),
  );

  function handleAdd() {
    const qty = parseFloat(quantity);
    if (!componentId || !qty || qty <= 0) {
      toast.error("Selecciona un ingrediente y una cantidad válida");
      return;
    }
    startTransition(async () => {
      const result = await saveBatchRecipeItem(batch!.ingredient_id, Number(componentId), qty);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Ingrediente agregado a la receta");
        setComponentId("");
        setQuantity("");
      }
    });
  }

  function handleRemove(batchRecipeId: number) {
    startTransition(async () => {
      const result = await removeBatchRecipeItem(batchRecipeId);
      if (result?.error) toast.error(result.error);
      else toast.success("Quitado de la receta");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receta del lote — {batch.name}</DialogTitle>
        </DialogHeader>

        {batch.batch_recipe.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Layers className="w-8 h-8 opacity-20" />
            <p className="text-sm">Sin ingredientes en la receta todavía</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {batch.batch_recipe.map((r) => (
              <div
                key={r.batch_recipe_id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.ingredient.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {r.quantity} {r.ingredient.unit}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:text-destructive"
                  disabled={isPending}
                  onClick={() => handleRemove(r.batch_recipe_id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Ingrediente</Label>
            <Select value={componentId} onValueChange={setComponentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {pickable.map((i) => (
                  <SelectItem key={i.ingredient_id} value={i.ingredient_id.toString()}>
                    {i.name} {i.is_batch ? "(lote)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1.5">
            <Label className="text-xs">Cantidad</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button size="icon" className="shrink-0" disabled={isPending} onClick={handleAdd}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
