"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Search,
  X,
  Factory,
  Square,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import { createBatch, updateBatch, deleteBatch, closeProductionRun } from "@/app/admin/lotes/actions";
import { BatchRecipeDialog } from "@/components/admin/batch-recipe-dialog";
import { BatchProduceDrawer } from "@/components/admin/batch-produce-drawer";
import { BatchRunsDrawer } from "@/components/admin/batch-runs-drawer";
import { SectionHeader } from "@/components/admin/section-header";
import { useSelectedTruckStore } from "@/lib/store/selected-truck";

export type BatchItem = {
  production_batch_item_id: number;
  ingredient_id: number;
  quantity: number;
  ingredient: { ingredient_id: number; name: string; unit: string };
};

export type Batch = {
  production_batch_id: number;
  name: string;
  description: string | null;
  created_at: string;
  items: BatchItem[];
};

export type AllIngredient = {
  ingredient_id: number;
  name: string;
  unit: string;
};

export type FoodTruck = { food_truck_id: number; name: string };

/** Venta registrada sin tanda abierta — espera a la próxima producción. */
export type PendingOutput = {
  production_batch_id: number;
  food_truck_id: number;
  quantity: number;
  created_at: string;
  product: { name: string } | null;
};

/** Fila de `v_production_run_summary` — una tanda producida. */
export type ProductionRun = {
  production_run_id: number;
  production_batch_id: number;
  batch_name: string;
  food_truck_id: number;
  truck_name: string | null;
  opened_at: string;
  closed_at: string | null;
  is_open: boolean;
  units_sold: number;
  orders_count: number;
};

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/** Fecha de hoy en Bogotá como "26/07/2026" — para prefijar el nombre del lote. */
function todayLabel(): string {
  return new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function BatchForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const {
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "" },
  });

  return (
    <form id="batch-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="batch-name">Nombre</Label>
        <Input
          id="batch-name"
          placeholder="Ej. Lote de pollo"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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

export function BatchesView({
  batches,
  allIngredients,
  runs = [],
  pendingOutputs = [],
}: {
  batches: Batch[];
  allIngredients: AllIngredient[];
  runs?: ProductionRun[];
  pendingOutputs?: PendingOutput[];
}) {
  const selectedTruck = useSelectedTruckStore((s) => s.selectedTruck);
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Batch | null>(null);
  const [deleteItem, setDeleteItem] = useState<Batch | null>(null);
  const [recipeItem, setRecipeItem] = useState<Batch | null>(null);
  const [produceItem, setProduceItem] = useState<Batch | null>(null);
  const [search, setSearch] = useState("");
  const [closingRun, setClosingRun] = useState<number | null>(null);
  const [runsItem, setRunsItem] = useState<Batch | null>(null);

  // Corrida abierta por lote, para el truck que está activo en el sidebar.
  // Solo puede haber una por lote+truck (índice único parcial en la DB).
  const openRunByBatch = new Map<number, ProductionRun>();
  for (const run of runs) {
    if (!run.is_open) continue;
    if (selectedTruck != null && run.food_truck_id !== selectedTruck) continue;
    openRunByBatch.set(run.production_batch_id, run);
  }

  function handleCloseRun(run: ProductionRun) {
    setClosingRun(run.production_run_id);
    startTransition(async () => {
      const result = await closeProductionRun(run.production_run_id);
      setClosingRun(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const vendidas = (result?.data as { total_vendido?: number } | null)?.total_vendido ?? 0;
      toast.success(`Producción cerrada — ${vendidas} unidad${vendidas !== 1 ? "es" : ""} vendida${vendidas !== 1 ? "s" : ""}`);
    });
  }

  // Recargar el batch abierto en los diálogos con datos frescos tras editar ingredientes
  const liveRecipeItem = recipeItem
    ? (batches.find((b) => b.production_batch_id === recipeItem.production_batch_id) ?? recipeItem)
    : null;
  const liveProduceItem = produceItem
    ? (batches.find((b) => b.production_batch_id === produceItem.production_batch_id) ?? produceItem)
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
      }
    });
  }

  function handleEdit() {
    if (!editItem) return;
    const form = document.getElementById("batch-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await updateBatch(editItem.production_batch_id, new FormData(form));
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
      const result = await deleteBatch(deleteItem.production_batch_id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Lote eliminado");
        setDeleteItem(null);
      }
    });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredBatches = normalizedSearch
    ? batches.filter((b) => b.name.toLowerCase().includes(normalizedSearch))
    : batches;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Lotes de Producción"
        subtitle={`${filteredBatches.length} lote${filteredBatches.length !== 1 ? "s" : ""} ${normalizedSearch ? "encontrado" : "registrado"}${filteredBatches.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
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
              {batches.length === 0 ? "Sin lotes registrados" : "Sin resultados para esta busqueda"}
            </p>
            {batches.length === 0 ? (
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
                <TableHead>Ingredientes</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((b) => (
                <TableRow key={b.production_batch_id}>
                  <TableCell className="text-muted-foreground font-mono text-sm">{b.production_batch_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{b.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-56">
                      {b.items.length === 0 ? (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-accent text-xs gap-1 text-muted-foreground"
                          onClick={() => setRecipeItem(b)}
                        >
                          <Plus className="w-3 h-3" /> Agregar
                        </Badge>
                      ) : (
                        <>
                          {b.items.slice(0, 2).map((it) => (
                            <Badge
                              key={it.production_batch_item_id}
                              variant="outline"
                              className="cursor-pointer text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                              onClick={() => setRecipeItem(b)}
                            >
                              {it.ingredient.name} ({it.quantity} {it.ingredient.unit})
                            </Badge>
                          ))}
                          {b.items.length > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer text-muted-foreground"
                              onClick={() => setRecipeItem(b)}
                            >
                              +{b.items.length - 2}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-56 truncate">
                    {(() => {
                      const run = openRunByBatch.get(b.production_batch_id);
                      if (!run) return b.description ?? "—";
                      return (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            En producción
                          </span>
                          <span className="text-xs text-foreground">
                            {run.units_sold} vendida{run.units_sold !== 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {openRunByBatch.has(b.production_batch_id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          title="Cerrar la producción abierta"
                          disabled={isPending}
                          onClick={() => handleCloseRun(openRunByBatch.get(b.production_batch_id)!)}
                        >
                          {closingRun === openRunByBatch.get(b.production_batch_id)!.production_run_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                          Cerrar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-emerald-400"
                          title="Producir — descuenta ingredientes y abre la producción"
                          disabled={b.items.length === 0}
                          onClick={() => setProduceItem(b)}
                        >
                          <Factory className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Producciones y ventas"
                        onClick={() => setRunsItem(b)}
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditItem(b)}
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
          {/* El nombre viene prefijado con la fecha de creación; el staff
              completa qué lote es ("Lote de pollo") a continuación. */}
          <BatchForm defaultValues={{ name: `${todayLabel()} — ` }} />
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
              defaultValues={{
                name: editItem.name,
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

      {/* Dialog Ingredientes */}
      <BatchRecipeDialog
        batch={liveRecipeItem}
        allIngredients={allIngredients}
        open={!!recipeItem}
        onOpenChange={(o) => !o && setRecipeItem(null)}
      />

      <BatchRunsDrawer
        batch={runsItem}
        runs={runs}
        pendingOutputs={pendingOutputs}
        open={!!runsItem}
        onOpenChange={(o) => !o && setRunsItem(null)}
      />

      {/* Drawer Producir */}
      <BatchProduceDrawer
        batch={liveProduceItem}
        foodtruckId={selectedTruck}
        open={!!produceItem}
        onOpenChange={(o) => !o && setProduceItem(null)}
      />

      {/* AlertDialog Eliminar */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteItem?.name}</strong> y su lista de
              ingredientes.
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
