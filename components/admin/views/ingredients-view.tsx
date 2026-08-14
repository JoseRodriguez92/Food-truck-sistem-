"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Leaf,
  Search,
  X,
  FlaskConical,
  PackagePlus,
  History,
  PackageSearch,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "@/app/admin/ingredients/actions";
import { StockAdjustDrawer } from "@/components/admin/stock-adjust-drawer";
import { StockHistoryDrawer } from "@/components/admin/stock-history-drawer";
import { SectionHeader } from "@/components/admin/section-header";
import { useSelectedTruckStore } from "@/lib/store/selected-truck";

export type Ingredient = {
  ingredient_id: number;
  name: string;
  unit: string;
  description: string | null;
  created_at: string;
};

export type FoodTruck = {
  food_truck_id: number;
  name: string;
};

export type IngredientWithStock = Ingredient & {
  stock: number;
};

const UNITS = [
  { value: "gr", label: "Gramos (gr)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "lt", label: "Litros (lt)" },
  { value: "un", label: "Unidad (un)" },
];

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  unit: z.string().min(1, "La unidad es requerida"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function IngredientForm({
  defaultValues,
  isPending,
  unitValue,
  onUnitChange,
}: {
  defaultValues?: Partial<FormValues>;
  isPending: boolean;
  unitValue: string;
  onUnitChange: (v: string) => void;
}) {
  const {
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      name: "",
      unit: "gr",
      description: "",
    },
  });

  return (
    <form id="ingredient-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ing-name">Nombre</Label>
        <Input
          id="ing-name"
          placeholder="Ej. Cebolla cabezona"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Unidad</Label>
        <Select value={unitValue} onValueChange={onUnitChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona unidad" />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="unit" value={unitValue} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ing-desc">
          Descripción{" "}
          <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Textarea
          id="ing-desc"
          placeholder="Notas sobre este ingrediente..."
          rows={2}
          {...register("description")}
        />
      </div>
    </form>
  );
}

function stockBadge(stock: number, unit: string) {
  const color =
    stock <= 0
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : stock < 100
        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
        : "bg-green-500/10 text-green-500 border-green-500/20";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      {stock} {unit}
    </span>
  );
}

export function IngredientsView({
  ingredients,
  usedIngredientIds,
}: {
  ingredients: Ingredient[];
  usedIngredientIds: number[];
}) {
  const selectedTruck = useSelectedTruckStore((s) => s.selectedTruck);
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<IngredientWithStock | null>(null);
  const [deleteItem, setDeleteItem] = useState<IngredientWithStock | null>(
    null,
  );
  const [adjustItem, setAdjustItem] = useState<IngredientWithStock | null>(
    null,
  );
  const [historyItem, setHistoryItem] = useState<IngredientWithStock | null>(
    null,
  );

  const [ingredientsWithStock, setIngredientsWithStock] = useState<
    IngredientWithStock[]
  >([]);
  const [createUnit, setCreateUnit] = useState("gr");
  const [editUnit, setEditUnit] = useState("gr");
  const [search, setSearch] = useState("");
  const [unusedOnly, setUnusedOnly] = useState(false);

  const usedIdsSet = new Set(usedIngredientIds);
  const isUnused = (ingredientId: number) => !usedIdsSet.has(ingredientId);
  const unusedCount = ingredients.filter((ing) => isUnused(ing.ingredient_id)).length;

  // Fetch stock para truck seleccionado
  useEffect(() => {
    if (!selectedTruck) return;

    const fetchStock = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("foodtruck_has_ingredient")
        .select("ingredient_id, stock")
        .eq("foodtruck_id", selectedTruck);

      const stockMap = new Map(
        data?.map((d) => [d.ingredient_id, d.stock]) ?? [],
      );

      const withStock = ingredients.map((ing) => ({
        ...ing,
        stock: stockMap.get(ing.ingredient_id) ?? 0,
      }));

      setIngredientsWithStock(withStock);
    };

    fetchStock();
  }, [selectedTruck, ingredients]);

  function handleCreate() {
    const form = document.getElementById("ingredient-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await createIngredient(new FormData(form));
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Ingrediente creado");
        setCreateOpen(false);
        setCreateUnit("gr");
      }
    });
  }

  function handleEdit() {
    if (!editItem) return;
    const form = document.getElementById("ingredient-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await updateIngredient(
        editItem.ingredient_id,
        new FormData(form),
      );
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Ingrediente actualizado");
        setEditItem(null);
      }
    });
  }

  function handleDelete() {
    if (!deleteItem) return;
    startTransition(async () => {
      const result = await deleteIngredient(deleteItem.ingredient_id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Ingrediente eliminado");
        setDeleteItem(null);
      }
    });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredIngredients = ingredientsWithStock
    .filter((ing) => !normalizedSearch || ing.name.toLowerCase().includes(normalizedSearch))
    .filter((ing) => !unusedOnly || isUnused(ing.ingredient_id));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Ingredientes"
        subtitle={`${filteredIngredients.length} ingrediente${filteredIngredients.length !== 1 ? "s" : ""} ${normalizedSearch ? "encontrado" : "registrado"}${filteredIngredients.length !== 1 ? "s" : ""}`}
        actions={
          <Button
            onClick={() => {
              setCreateUnit("gr");
              setCreateOpen(true);
            }}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        }
      />

      <div className="rounded-xl border border-border p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de ingrediente..."
            className="pl-8 pr-9"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant={unusedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setUnusedOnly((v) => !v)}
          className="gap-2 shrink-0"
          disabled={unusedCount === 0}
        >
          <PackageSearch className="w-3.5 h-3.5" />
          Sin asociar a productos ({unusedCount})
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        {filteredIngredients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Leaf className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {ingredientsWithStock.length === 0
                ? "Sin ingredientes registrados"
                : "Sin resultados para esta busqueda"}
            </p>
            {ingredientsWithStock.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar primero
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
                className="gap-2"
              >
                <X className="w-3.5 h-3.5" /> Limpiar busqueda
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden md:table-cell">
                  Descripción
                </TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngredients.map((ing) => (
                <TableRow key={ing.ingredient_id}>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {ing.ingredient_id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{ing.name}</span>
                      {isUnused(ing.ingredient_id) && (
                        <span
                          title="No está asociado a ningún producto"
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        >
                          Sin usar
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {ing.unit}
                    </Badge>
                  </TableCell>
                  <TableCell>{stockBadge(ing.stock, ing.unit)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-56 truncate">
                    {ing.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-emerald-400"
                        title="Ajustar stock"
                        onClick={() => setAdjustItem(ing)}
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary"
                        title="Historial de stock"
                        onClick={() => setHistoryItem(ing)}
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditUnit(ing.unit);
                          setEditItem(ing);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setDeleteItem(ing)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo ingrediente</DialogTitle>
          </DialogHeader>
          <IngredientForm
            isPending={isPending}
            unitValue={createUnit}
            onUnitChange={setCreateUnit}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={isPending} onClick={handleCreate}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ingrediente</DialogTitle>
          </DialogHeader>
          {editItem && (
            <IngredientForm
              isPending={isPending}
              unitValue={editUnit}
              onUnitChange={setEditUnit}
              defaultValues={{
                name: editItem.name,
                unit: editItem.unit,
                description: editItem.description ?? "",
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button disabled={isPending} onClick={handleEdit}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer Ajustar Stock */}
      <StockAdjustDrawer
        ingredient={adjustItem}
        foodtruckId={selectedTruck}
        open={!!adjustItem}
        onOpenChange={(o) => !o && setAdjustItem(null)}
      />

      {/* Drawer Historial */}
      <StockHistoryDrawer
        ingredient={historyItem}
        foodtruckId={selectedTruck}
        open={!!historyItem}
        onOpenChange={(o) => !o && setHistoryItem(null)}
      />

      {/* AlertDialog Eliminar */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ingrediente?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar{" "}
              <strong className="text-foreground">{deleteItem?.name}</strong>.
              Si está usado en algún producto no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
