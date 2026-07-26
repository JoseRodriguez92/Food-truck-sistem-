"use client";

/**
 * BatchRecipeDialog
 *
 * Receta de un lote de producción: qué ingredientes consume UNA TANDA entera
 * (no una unidad vendida — la merma de la preparación queda dentro de esa
 * cantidad, que es justamente el punto del modelo de lotes).
 *
 * Se edita como checklist: se marcan los ingredientes, se escriben las
 * cantidades y se guarda todo junto. La versión anterior obligaba a un
 * Select + Cantidad + botón "+" por cada ingrediente, con un round-trip al
 * servidor cada vez — insoportable para un lote de 8 ingredientes.
 *
 * @module components/admin/batch-recipe-dialog
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, X, Check, Layers } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { saveBatchRecipe } from "@/app/admin/lotes/actions";
import type { Batch, AllIngredient } from "@/components/admin/views/batches-view";
import { cn } from "@/lib/utils";

/** Cantidad por ingrediente, indexada por ingredient_id. `undefined` = no marcado. */
type Draft = Record<number, string>;

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
  const [draft, setDraft] = useState<Draft>({});
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);

  // Al abrir, precargar lo que el lote ya tiene
  useEffect(() => {
    if (!open || !batch) return;
    const initial: Draft = {};
    for (const it of batch.items) initial[it.ingredient_id] = String(it.quantity);
    setDraft(initial);
    setSearch("");
    setOnlySelected(false);
  }, [open, batch]);

  const selectedIds = useMemo(
    () => Object.keys(draft).map(Number).filter((id) => draft[id] !== undefined),
    [draft],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIngredients.filter((i) => {
      if (onlySelected && draft[i.ingredient_id] === undefined) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q);
    });
  }, [allIngredients, search, onlySelected, draft]);

  if (!batch) return null;

  function toggle(id: number) {
    setDraft((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) delete next[id];
      else next[id] = "";
      return next;
    });
  }

  function setQty(id: number, value: string) {
    setDraft((prev) => ({ ...prev, [id]: value }));
  }

  function handleSave() {
    const items = selectedIds.map((id) => ({
      ingredientId: id,
      quantity: parseFloat(draft[id]),
    }));

    const sinCantidad = items.filter((i) => !(i.quantity > 0));
    if (sinCantidad.length > 0) {
      const nombres = sinCantidad
        .map((i) => allIngredients.find((a) => a.ingredient_id === i.ingredientId)?.name)
        .filter(Boolean)
        .join(", ");
      toast.error(`Falta la cantidad de: ${nombres}`);
      return;
    }

    startTransition(async () => {
      const result = await saveBatchRecipe(batch!.production_batch_id, items);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        items.length === 0
          ? "Receta vaciada"
          : `Receta guardada — ${items.length} ingrediente${items.length !== 1 ? "s" : ""}`,
      );
      onOpenChange(false);
    });
  }

  const totalIngredients = allIngredients.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Receta del lote — {batch.name}
          </DialogTitle>
          <DialogDescription>
            Cantidades para <strong>una tanda entera</strong>, no por unidad vendida.
          </DialogDescription>
        </DialogHeader>

        {/* Buscador + filtro */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="pl-8 h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant={onlySelected ? "default" : "outline"}
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setOnlySelected((v) => !v)}
          >
            <Check className="w-3.5 h-3.5" />
            {selectedIds.length}
          </Button>
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {totalIngredients === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Layers className="w-8 h-8 opacity-20" />
              <p className="text-sm">No hay ingredientes cargados en el sistema</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-sm">
                {onlySelected ? "Todavía no marcaste ninguno" : "Sin resultados"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border">
              {visible.map((ing) => {
                const checked = draft[ing.ingredient_id] !== undefined;
                return (
                  <div
                    key={ing.ingredient_id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 transition-colors",
                      checked && "bg-primary/5",
                    )}
                  >
                    <Checkbox
                      id={`ing-${ing.ingredient_id}`}
                      checked={checked}
                      onCheckedChange={() => toggle(ing.ingredient_id)}
                    />
                    <label
                      htmlFor={`ing-${ing.ingredient_id}`}
                      className="flex-1 min-w-0 text-sm cursor-pointer select-none"
                    >
                      <span className="truncate">{ing.name}</span>
                    </label>

                    {checked ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          autoFocus={!draft[ing.ingredient_id]}
                          value={draft[ing.ingredient_id]}
                          onChange={(e) => setQty(ing.ingredient_id, e.target.value)}
                          placeholder="0"
                          className="h-8 w-20 text-sm"
                        />
                        <span className="text-xs text-muted-foreground w-10">{ing.unit}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 shrink-0 w-[7.5rem] text-right pr-1">
                        {ing.unit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} de {totalIngredients} marcados
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar receta"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
