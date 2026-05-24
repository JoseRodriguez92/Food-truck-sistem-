"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { createCategory, updateCategory, deleteCategory } from "@/app/admin/categories/actions";

export type Category = {
  category_id: number;
  name: string;
  description: string | null;
  created_at: string;
};

const schema = z.object({
  name:        z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function CategoryForm({ defaultValues, isPending }: { defaultValues?: Partial<FormValues>; isPending: boolean }) {
  const { register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "" },
  });

  return (
    <form id="category-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input id="cat-name" placeholder="Ej. Hamburguesas, Bebidas, Snacks..." aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea id="cat-desc" placeholder="Descripción de la categoría..." rows={2} {...register("description")} />
      </div>
    </form>
  );
}

export function CategoriesView({ categories }: { categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<Category | null>(null);
  const [deleteItem, setDeleteItem] = useState<Category | null>(null);

  function handleCreate() {
    const form = document.getElementById("category-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await createCategory(new FormData(form));
      if (result?.error) toast.error(result.error);
      else { toast.success("Categoría creada"); setCreateOpen(false); }
    });
  }

  function handleEdit() {
    if (!editItem) return;
    const form = document.getElementById("category-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await updateCategory(editItem.category_id, new FormData(form));
      if (result?.error) toast.error(result.error);
      else { toast.success("Categoría actualizada"); setEditItem(null); }
    });
  }

  function handleDelete() {
    if (!deleteItem) return;
    startTransition(async () => {
      const result = await deleteCategory(deleteItem.category_id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Categoría eliminada"); setDeleteItem(null); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Categorías
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {categories.length} categoría{categories.length !== 1 ? "s" : ""} registrada{categories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Tag className="w-10 h-10 opacity-20" />
            <p className="text-sm">Sin categorías registradas</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-3.5 h-3.5" /> Agregar primera
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.category_id}>
                  <TableCell className="text-muted-foreground font-mono text-sm">{cat.category_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-72 truncate">
                    {cat.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(cat)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteItem(cat)}>
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
          <DialogHeader><DialogTitle>Nueva categoría</DialogTitle></DialogHeader>
          <CategoryForm isPending={isPending} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={handleCreate}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar categoría</DialogTitle></DialogHeader>
          {editItem && (
            <CategoryForm
              isPending={isPending}
              defaultValues={{ name: editItem.name, description: editItem.description ?? "" }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={handleEdit}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Eliminar */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteItem?.name}</strong>. Si tiene productos asignados no se podrá eliminar.
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
