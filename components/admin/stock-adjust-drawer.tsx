"use client";

import { useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
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
import { adjustStock, type MovementType } from "@/app/admin/ingredients/actions";
import type { Ingredient } from "@/components/admin/views/ingredients-view";

const TYPES: { value: MovementType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "entrada",  label: "Entrada",  icon: ArrowUpCircle,   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 data-[active=true]:bg-emerald-500/25 data-[active=true]:border-emerald-400" },
  { value: "salida",   label: "Salida",   icon: ArrowDownCircle, color: "bg-red-500/15 text-red-400 border-red-500/40 data-[active=true]:bg-red-500/25 data-[active=true]:border-red-400" },
  { value: "ajuste",   label: "Ajuste",   icon: SlidersHorizontal, color: "bg-amber-500/15 text-amber-400 border-amber-500/40 data-[active=true]:bg-amber-500/25 data-[active=true]:border-amber-400" },
];

export function StockAdjustDrawer({
  ingredient,
  open,
  onOpenChange,
}: {
  ingredient: Ingredient | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType]   = useState<MovementType>("entrada");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  if (!ingredient) return null;

  const currentStock = Number(ingredient.stock);
  const numVal = parseFloat(value) || 0;

  const preview = (() => {
    if (!value || numVal <= 0) return null;
    if (type === "entrada") return currentStock + numVal;
    if (type === "salida")  return currentStock - numVal;
    return numVal; // ajuste: es el nuevo total
  })();

  const isInvalid = type === "salida" && preview !== null && preview < 0;

  function handleSubmit() {
    if (!value || numVal <= 0) { toast.error("Ingresa una cantidad válida"); return; }
    if (isInvalid) { toast.error("Stock insuficiente para esta salida"); return; }

    startTransition(async () => {
      const result = await adjustStock(ingredient!.ingredient_id, type, numVal, notes);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Stock actualizado");
        onOpenChange(false);
        setValue("");
        setNotes("");
        setType("entrada");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-base">Ajustar stock</SheetTitle>
          <p className="text-sm text-muted-foreground">{ingredient.name}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Stock actual */}
          <div className="rounded-xl bg-muted/20 border border-border/60 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stock actual</span>
            <span className="font-mono font-semibold text-sm">
              {currentStock} <span className="text-muted-foreground font-normal">{ingredient.unit}</span>
            </span>
          </div>

          {/* Tipo de movimiento */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Tipo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value: v, label, icon: Icon, color }) => (
                <button
                  key={v}
                  data-active={type === v}
                  onClick={() => setType(v)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-xs font-medium transition-all",
                    color,
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad / nuevo total */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-value">
              {type === "ajuste" ? "Nuevo total" : "Cantidad"}
            </Label>
            <div className="relative">
              <Input
                id="adj-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                className={cn("pr-10", isInvalid && "border-destructive focus-visible:ring-destructive")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {ingredient.unit}
              </span>
            </div>
            {isInvalid && (
              <p className="text-xs text-destructive">Stock insuficiente (quedaría negativo)</p>
            )}
          </div>

          {/* Preview resultado */}
          {preview !== null && !isInvalid && (
            <div className="rounded-xl border border-border/60 px-4 py-3 flex items-center justify-between bg-primary/5">
              <span className="text-sm text-muted-foreground">Resultado</span>
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-muted-foreground">{currentStock}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold text-primary">{preview.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">{ingredient.unit}</span>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-notes">
              Nota <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="adj-notes"
              placeholder="Ej: Compra en Makro, merma por mal estado..."
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 bg-muted/10">
          <Button
            className="w-full"
            disabled={isPending || !value || numVal <= 0 || isInvalid}
            onClick={handleSubmit}
          >
            {isPending ? "Guardando..." : "Confirmar ajuste"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
