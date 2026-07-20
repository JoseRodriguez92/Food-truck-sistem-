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
  Layers,
  Search,
  X,
  Factory,
  History,
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

import { createBatch, updateBatch, deleteBatch } from "@/app/admin/lotes/actions";
import { BatchRecipeDialog } from "@/components/admin/batch-recipe-dialog";
import { BatchProduceDrawer } from "@/components/admin/batch-produce-drawer";
import { StockHistoryDrawer } from "@/components/admin/stock-history-drawer";
import { SectionHeader } from "@/components/admin/section-header";
import { useSelectedTruckStore } from "@/lib/store/selected-truck";

export type BatchRecipeItem = {
  batch_recipe_id: number;
  component_ingredient_id: number;
  quantity: number;
  ingredient: { ingredient_id: number; name: string; unit: string };
};

export type Batch = {
  ingredient_id: number;
  name: string;
  unit: string;
  description: string | null;
  created_at: string;
  batch_recipe: BatchRecipeItem[];
};

export type AllIngredient = {
  ingredient_id: number;
  name: string;
  unit: string;
  is_batch: boolean;
};

export type FoodTruck = { food_truck_id: number; name: string };

type BatchWithStock = Batch & { stock: number };

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

function BatchForm({
  defaultValues,
  unitValue,
  onUnitChange,
}: {
  defaultValues?: Partial<FormValues>;
  unitValue: string;
  onUnitChange: (v: string) => void;
}) {
  const {
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", unit: "gr", description: "" },
  });

  return (
    <form id="batch-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="batch-name">Nombre</Label>
        <Input
          id="batch-name"
          placeholder="Ej. Relleno carne firme"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
        <Label htmlFor="batch-desc">
          Descripción <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Textarea id="batch-desc" placeholder="Notas sobre este lote..." rows={2} {...register("description")} />
      </div>
    </form>
  );
}

function stockBadge(stock: number, unit: string) {
  const color =
    stock <= 0
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : stock < 10
        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
        : "bg-green-500/10 text-green-500 border-green-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {stock} {unit}
    </span>
  );
}

export function BatchesView({
  batches,
  allIngredients,
}: {
  batches: Batch[];
  allIngredients: AllIngredient[];
}) {
  const selectedTruck = useSelectedTruckStore((s) => s.selectedTruck);
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<BatchWithStock | null>(null);
  const [deleteItem, setDeleteItem] = useState<BatchWithStock | null>(null);
  const [recipeItem, setRecipeItem] = useState<Batch | null>(null);
  const [produceItem, setProduceItem] = useState<Batch | null>(null);
  const [historyItem, setHistoryItem] = useState<BatchWithStock | null>(null);

  const [batchesWithStock, setBatchesWithStock] = useState<BatchWithStock[]>([]);
  const [stockByIngredient, setStockByIngredient] = useState<Map<number, number>>(new Map());
  const [createUnit, setCreateUnit] = useState("gr");
  const [editUnit, setEditUnit] = useState("gr");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedTruck) return;

    const fetchStock = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("foodtruck_has_ingredient")
        .select("ingredient_id, stock")
        .eq("foodtruck_id", selectedTruck);

      const stockMap = new Map(data?.map((d) => [d.ingredient_id, d.stock]) ?? []);
      setStockByIngredient(stockMap);

      const withStock = batches.map((b) => ({
        ...b,
        stock: stockMap.get(b.ingredient_id) ?? 0,
      }));
      setBatchesWithStock(withStock);
    };

    fetchStock();
  }, [selectedTruck, batches]);

  // Recargar el batch abierto en los diálogos con datos frescos tras editar la receta
  const liveRecipeItem = recipeItem
    ? (batches.find((b) => b.ingredient_id === recipeItem.ingredient_id) ?? recipeItem)
    : null;
  const liveProduceItem: BatchWithStock | null = produceItem
    ? (batchesWithStock.find((b) => b.ingredient_id === produceItem.ingredient_id) ?? {
        ...produceItem,
        stock: 0,
      })
    : null;

  function handleCreate() {
    const form = document.getElementById("batch-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await createBatch(new FormData(form));
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Lote creado");
        setCreateOpen(false);
        setCreateUnit("gr");
      }
    });
  }

  function handleEdit() {
    if (!editItem) return;
    const form = document.getElementById("batch-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await updateBatch(editItem.ingredient_id, new FormData(form));
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Lote actualizado");
        setEditItem(null);
      }
    });
  }

  function handleDelete() {
    if (!deleteItem) return;
    startTransition(async () => {
      const result = await deleteBatch(deleteItem.ingredient_id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Lote eliminado");
        setDeleteItem(null);
      }
    });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredBatches = normalizedSearch
    ? batchesWithStock.filter((b) => b.name.toLowerCase().includes(normalizedSearch))
    : batchesWithStock;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Lotes de Producción"
        subtitle={`${filteredBatches.length} lote${filteredBatches.length !== 1 ? "s" : ""} ${normalizedSearch ? "encontrado" : "registrado"}${filteredBatches.length !== 1 ? "s" : ""}`}
        actions={
          <Button
            onClick={() => {
              setCreateUnit("gr");
              setCreateOpen(true);
            }}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo lote</span>
          </Button>
        }
      />

      <div className="rounded-xl border border-border p-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de lote..."
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
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Layers className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {batchesWithStock.length === 0 ? "Sin lotes registrados" : "Sin resultados para esta busqueda"}
            </p>
            {batchesWithStock.length === 0 ? (
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-3.5 h-3.5" /> Crear primer lote
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSearch("")} className="gap-2">
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
                <TableHead>Receta</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((b) => (
                <TableRow key={b.ingredient_id}>
                  <TableCell className="text-muted-foreground font-mono text-sm">{b.ingredient_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{b.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {b.unit}
                    </Badge>
                  </TableCell>
                  <TableCell>{stockBadge(b.stock, b.unit)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-40">
                      {b.batch_recipe.length === 0 ? (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-accent text-xs gap-1 text-muted-foreground"
                          onClick={() => setRecipeItem(b)}
                        >
                          <Plus className="w-3 h-3" /> Agregar
                        </Badge>
                      ) : (
                        <>
                          {b.batch_recipe.slice(0, 2).map((r) => (
                            <Badge
                              key={r.batch_recipe_id}
                              variant="outline"
                              className="cursor-pointer text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                              onClick={() => setRecipeItem(b)}
                            >
                              {r.ingredient.name}
                            </Badge>
                          ))}
                          {b.batch_recipe.length > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer text-muted-foreground"
                              onClick={() => setRecipeItem(b)}
                            >
                              +{b.batch_recipe.length - 2}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-56 truncate">
                    {b.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-emerald-400"
                        title="Producir"
                        disabled={b.batch_recipe.length === 0}
                        onClick={() => setProduceItem(b)}
                      >
                        <Factory className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary"
                        title="Historial de stock"
                        onClick={() => setHistoryItem(b)}
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditUnit(b.unit);
                          setEditItem(b);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setDeleteItem(b)}
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
            <DialogTitle>Nuevo lote</DialogTitle>
          </DialogHeader>
          <BatchForm unitValue={createUnit} onUnitChange={setCreateUnit} />
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
            <DialogTitle>Editar lote</DialogTitle>
          </DialogHeader>
          {editItem && (
            <BatchForm
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

      {/* Dialog Receta */}
      <BatchRecipeDialog
        batch={liveRecipeItem}
        allIngredients={allIngredients}
        open={!!recipeItem}
        onOpenChange={(o) => !o && setRecipeItem(null)}
      />

      {/* Drawer Producir */}
      <BatchProduceDrawer
        batch={liveProduceItem}
        foodtruckId={selectedTruck}
        batchStock={liveProduceItem?.stock ?? 0}
        stockByIngredient={stockByIngredient}
        open={!!produceItem}
        onOpenChange={(o) => !o && setProduceItem(null)}
      />

      {/* Drawer Historial */}
      <StockHistoryDrawer
        ingredient={historyItem}
        foodtruckId={selectedTruck}
        open={!!historyItem}
        onOpenChange={(o) => !o && setHistoryItem(null)}
      />

      {/* AlertDialog Eliminar */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteItem?.name}</strong>. Si está usado en algún
              producto o como componente de otro lote no se podrá eliminar.
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
