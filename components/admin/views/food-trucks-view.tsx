"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

import {
  createFoodTruck,
  updateFoodTruck,
  deleteFoodTruck,
} from "@/app/admin/food-trucks/actions";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export type FoodTruck = {
  food_truck_id: number;
  name: string;
  registration: string;
  color: string | null;
};

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  registration: z.string().min(1, "La matrícula es requerida"),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Formulario (crear / editar) ────────────────────────────────────────────────
function FoodTruckForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", registration: "", color: "" },
  });

  return (
    <form id="food-truck-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Ej. Food Truck #1"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="registration">Matrícula</Label>
        <Input
          id="registration"
          placeholder="Ej. ABC-1234"
          aria-invalid={!!errors.registration}
          {...register("registration")}
        />
        {errors.registration && (
          <p className="text-xs text-destructive">{errors.registration.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="color">
          Color <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            id="color"
            type="color"
            className="w-12 h-9 p-1 cursor-pointer"
            {...register("color")}
          />
          <Input
            placeholder="Ej. #E8C547 o Amarillo"
            {...register("color")}
            className="flex-1"
          />
        </div>
      </div>
    </form>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export function FoodTrucksView({ trucks }: { trucks: FoodTruck[] }) {
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTruck, setEditTruck] = useState<FoodTruck | null>(null);
  const [deleteTruck, setDeleteTruck] = useState<FoodTruck | null>(null);

  function handleCreate(data: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", data.name);
      fd.set("registration", data.registration);
      fd.set("color", data.color ?? "");
      const result = await createFoodTruck(fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Food truck creado");
        setCreateOpen(false);
      }
    });
  }

  function handleEdit(data: FormValues) {
    if (!editTruck) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", data.name);
      fd.set("registration", data.registration);
      fd.set("color", data.color ?? "");
      const result = await updateFoodTruck(editTruck.food_truck_id, fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Food truck actualizado");
        setEditTruck(null);
      }
    });
  }

  function handleDelete() {
    if (!deleteTruck) return;
    startTransition(async () => {
      const result = await deleteFoodTruck(deleteTruck.food_truck_id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Food truck eliminado");
        setDeleteTruck(null);
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Food Trucks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {trucks.length} {trucks.length === 1 ? "unidad registrada" : "unidades registradas"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        {trucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Truck className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin food trucks registrados</p>
            <Button
              variant="link"
              className="mt-2 text-primary"
              onClick={() => setCreateOpen(true)}
            >
              Agregar el primero
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead className="hidden sm:table-cell">Color</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((truck) => (
                <TableRow key={truck.food_truck_id}>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {truck.food_truck_id}
                  </TableCell>
                  <TableCell className="font-medium">{truck.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {truck.registration}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {truck.color ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: truck.color }}
                        />
                        <span className="text-sm text-muted-foreground">{truck.color}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditTruck(truck)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setDeleteTruck(truck)}
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

      {/* Dialog — Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo food truck</DialogTitle>
          </DialogHeader>
          <FoodTruckForm onSubmit={handleCreate} isPending={isPending} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="food-truck-form" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar */}
      <Dialog open={!!editTruck} onOpenChange={(o) => !o && setEditTruck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar food truck</DialogTitle>
          </DialogHeader>
          {editTruck && (
            <FoodTruckForm
              defaultValues={{
                name: editTruck.name,
                registration: editTruck.registration,
                color: editTruck.color ?? "",
              }}
              onSubmit={handleEdit}
              isPending={isPending}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTruck(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="food-truck-form" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog — Eliminar */}
      <AlertDialog open={!!deleteTruck} onOpenChange={(o) => !o && setDeleteTruck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar food truck?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar{" "}
              <strong className="text-foreground">{deleteTruck?.name}</strong>{" "}
              ({deleteTruck?.registration}). Esta acción no se puede deshacer.
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
