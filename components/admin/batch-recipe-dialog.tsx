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
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");

  if (!batch) return null;

  const usedIds = new Set(batch.items.map((it) => it.ingredient_id));
  const pickable = allIngredients.filter((i) => !usedIds.has(i.ingredient_id));

  function handleAdd() {
    const qty = parseFloat(quantity);
    if (!ingredientId || !qty || qty <= 0) {
      toast.error("Selecciona un ingrediente y una cantidad válida");
      return;
    }
    startTransition(async () => {
      const result = await saveBatchRecipeItem(batch!.production_batch_id, Number(ingredientId), qty);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Ingrediente agregado al lote");
        setIngredientId("");
        setQuantity("");
      }
    });
  }

  function handleRemove(productionBatchItemId: number) {
    startTransition(async () => {
      const result = await removeBatchRecipeItem(productionBatchItemId);
      if (result?.error) toast.error(result.error);
      else toast.success("Ingrediente quitado");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ingredientes del lote — {batch.name}</DialogTitle>
        </DialogHeader>

        {batch.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Layers className="w-8 h-8 opacity-20" />
            <p className="text-sm">Sin ingredientes todavía</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {batch.items.map((it) => (
              <div
                key={it.production_batch_item_id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{it.ingredient.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {it.quantity} {it.ingredient.unit}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:text-destructive"
                  disabled={isPending}
                  onClick={() => handleRemove(it.production_batch_item_id)}
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
            <Select value={ingredientId} onValueChange={setIngredientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {pickable.map((i) => (
                  <SelectItem key={i.ingredient_id} value={i.ingredient_id.toString()}>
                    {i.name}
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
