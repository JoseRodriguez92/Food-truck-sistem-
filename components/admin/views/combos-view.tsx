"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Layers, X,
  ShoppingBasket, LayoutList, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { createCombo, updateCombo, deleteCombo, addProductToCombo, removeProductFromCombo } from "@/app/admin/combos/actions";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export type ProductOption = { product_id: number; name: string; price: number };

type ProductImage = { product_image_id: number; image_url: string };

type ComboProductDetail = {
  product_id: number;
  name: string;
  price: number;
  product_has_image: ProductImage[];
} | null;

export type ComboProduct = {
  combo_product_id: number;
  product_id: number;
  product: ComboProductDetail;
};

export type Combo = {
  combo_id: number;
  name: string;
  description: string | null;
  price: number;
  combo_has_product: ComboProduct[];
};

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Precio inválido"),
});
type FormValues = z.infer<typeof schema>;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function toSingle<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ── Formulario ────────────────────────────────────────────────────────────────
function ComboForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const { register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "", price: 0 },
  });
  return (
    <form id="combo-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="c-name">Nombre</Label>
        <Input id="c-name" placeholder="Ej. Combo Familiar" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea id="c-desc" placeholder="Descripción del combo..." rows={2} {...register("description")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-price">Precio (COP)</Label>
        <Input id="c-price" type="number" step="1" min="0" placeholder="0" aria-invalid={!!errors.price} {...register("price")} />
        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
      </div>
    </form>
  );
}

// ── Panel de productos del combo ───────────────────────────────────────────────
function ComboProductsPanel({
  combo, allProducts, onClose,
}: {
  combo: Combo;
  allProducts: ProductOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string>("");

  const usedIds = new Set(combo.combo_has_product.map((cp) => cp.product_id));
  const available = allProducts.filter((p) => !usedIds.has(p.product_id));

  function handleAdd() {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await addProductToCombo(combo.combo_id, Number(selectedId));
      if (result?.error) toast.error(result.error);
      else { toast.success("Producto agregado"); setSelectedId(""); }
    });
  }

  function handleRemove(comboProductId: number, name: string) {
    startTransition(async () => {
      const result = await removeProductFromCombo(comboProductId);
      if (result?.error) toast.error(result.error);
      else toast.success(`"${name}" eliminado del combo`);
    });
  }

  const sumProducts = combo.combo_has_product.reduce((acc, cp) => {
    const p = toSingle(cp.product as ComboProductDetail | ComboProductDetail[]);
    return acc + (p?.price ?? 0);
  }, 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Productos — {combo.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={selectedId} onValueChange={setSelectedId} disabled={available.length === 0}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={available.length === 0 ? "Todos los productos ya están" : "Seleccionar producto..."} />
            </SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.product_id} value={String(p.product_id)}>
                  <span className="flex items-center justify-between gap-4 w-full">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground text-xs">{formatCurrency(p.price)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" onClick={handleAdd} disabled={isPending || !selectedId}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <Separator />

        {combo.combo_has_product.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShoppingBasket className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Sin productos en este combo</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {combo.combo_has_product.map((cp) => {
              const product = toSingle(cp.product as ComboProductDetail | ComboProductDetail[]);
              const image = product?.product_has_image?.[0];
              return (
                <div key={cp.combo_product_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50 group">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-muted border border-border">
                    {image ? (
                      <Image src={image.image_url} alt={product?.name ?? ""} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Layers className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product?.name ?? "Producto eliminado"}</p>
                    {product && <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                    disabled={isPending}
                    onClick={() => handleRemove(cp.combo_product_id, product?.name ?? "")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {combo.combo_has_product.length > 0 && (
          <div className="rounded-lg bg-card border border-border px-4 py-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Suma de productos</span>
              <span>{formatCurrency(sumProducts)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Precio del combo</span>
              <span className="text-primary">{formatCurrency(combo.price)}</span>
            </div>
            {sumProducts > combo.price && (
              <p className="text-xs text-green-500 mt-1">
                Ahorro: {formatCurrency(sumProducts - combo.price)}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Card individual ────────────────────────────────────────────────────────────
function ComboCard({
  combo, onEdit, onDelete, onProducts,
}: {
  combo: Combo;
  onEdit: () => void;
  onDelete: () => void;
  onProducts: () => void;
}) {
  const products = combo.combo_has_product.map((cp) =>
    toSingle(cp.product as ComboProductDetail | ComboProductDetail[])
  ).filter(Boolean) as ComboProductDetail[];

  // Mosaico de hasta 4 imágenes
  const images = products
    .flatMap((p) => p?.product_has_image ?? [])
    .slice(0, 4);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">

      {/* Mosaico de fotos */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {images.length === 0 ? (
          <button
            onClick={onProducts}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Layers className="w-8 h-8" />
            <span className="text-xs">Agregar productos</span>
          </button>
        ) : images.length === 1 ? (
          <Image src={images[0].image_url} alt={combo.name} fill className="object-cover" unoptimized />
        ) : (
          <div className={`grid h-full w-full gap-0.5 ${images.length === 2 ? "grid-cols-2" : images.length === 3 ? "grid-cols-2" : "grid-cols-2"}`}>
            {images.map((img, i) => (
              <div
                key={img.product_image_id}
                className={`relative overflow-hidden ${images.length === 3 && i === 0 ? "row-span-2" : ""}`}
              >
                <Image src={img.image_url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}

        {/* Badge cantidad de productos */}
        <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
          {combo.combo_has_product.length} producto{combo.combo_has_product.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <h3 className="font-semibold text-sm leading-tight">{combo.name}</h3>
          {combo.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{combo.description}</p>
          )}
        </div>

        {/* Lista de productos incluidos */}
        {products.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {products.slice(0, 3).map((p) => (
              <Badge key={p!.product_id} variant="secondary" className="text-xs">
                {p!.name}
              </Badge>
            ))}
            {products.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{products.length - 3}
              </Badge>
            )}
          </div>
        )}

        <p className="text-base font-bold text-primary mt-auto">{formatCurrency(combo.price)}</p>

        {/* Acciones */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1 pt-2 border-t border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onProducts}>
                  <ShoppingBasket className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Productos</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1 hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export function CombosView({ combos, allProducts }: { combos: Combo[]; allProducts: ProductOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [editCombo, setEditCombo] = useState<Combo | null>(null);
  const [deleteCombo_, setDeleteCombo] = useState<Combo | null>(null);
  const [productsCombo, setProductsCombo] = useState<Combo | null>(null);

  function submit(action: (fd: FormData) => Promise<{ error: string } | undefined>, onSuccess: () => void) {
    const form = document.getElementById("combo-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result?.error) toast.error(result.error);
      else onSuccess();
    });
  }

  function handleDelete() {
    if (!deleteCombo_) return;
    startTransition(async () => {
      const result = await deleteCombo(deleteCombo_.combo_id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Combo eliminado"); setDeleteCombo(null); }
    });
  }

  const empty = (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Layers className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">Sin combos registrados</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Combos</h1>
          <p className="text-sm text-muted-foreground mt-1">{combos.length} combos registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-1 gap-1">
            <Button variant={view === "grid" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("grid")}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("list")}>
              <LayoutList className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      </div>

      {/* Vista cards */}
      {view === "grid" && (
        combos.length === 0 ? empty : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {combos.map((c) => (
              <ComboCard
                key={c.combo_id}
                combo={c}
                onEdit={() => setEditCombo(c)}
                onDelete={() => setDeleteCombo(c)}
                onProducts={() => setProductsCombo(c)}
              />
            ))}
          </div>
        )
      )}

      {/* Vista lista */}
      {view === "list" && (
        <div className="rounded-xl border border-border overflow-hidden">
          {combos.length === 0 ? empty : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combos.map((c) => (
                  <TableRow key={c.combo_id}>
                    <TableCell className="text-muted-foreground font-mono text-sm">{c.combo_id}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48 truncate">{c.description ?? "—"}</TableCell>
                    <TableCell>
                      <button onClick={() => setProductsCombo(c)} className="flex flex-wrap gap-1 max-w-40">
                        {c.combo_has_product.length === 0 ? (
                          <Badge variant="outline" className="text-xs gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                            <Plus className="w-3 h-3" /> Agregar
                          </Badge>
                        ) : (
                          <>
                            {c.combo_has_product.slice(0, 2).map((cp) => {
                              const p = toSingle(cp.product as ComboProductDetail | ComboProductDetail[]);
                              return (
                                <Badge key={cp.combo_product_id} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                                  {p?.name ?? "—"}
                                </Badge>
                              );
                            })}
                            {c.combo_has_product.length > 2 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground cursor-pointer">
                                +{c.combo_has_product.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{formatCurrency(c.price)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCombo(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteCombo(c)}>
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
      )}

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo combo</DialogTitle></DialogHeader>
          <ComboForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit(createCombo, () => { toast.success("Combo creado"); setCreateOpen(false); })}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editCombo} onOpenChange={(o) => !o && setEditCombo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar combo</DialogTitle></DialogHeader>
          {editCombo && <ComboForm defaultValues={{ name: editCombo.name, description: editCombo.description ?? "", price: editCombo.price }} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCombo(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit((fd) => updateCombo(editCombo!.combo_id, fd), () => { toast.success("Combo actualizado"); setEditCombo(null); })}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Eliminar */}
      <AlertDialog open={!!deleteCombo_} onOpenChange={(o) => !o && setDeleteCombo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar combo?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteCombo_?.name}</strong>. Se eliminarán sus productos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panel productos del combo */}
      {productsCombo && (
        <ComboProductsPanel combo={productsCombo} allProducts={allProducts} onClose={() => setProductsCombo(null)} />
      )}
    </div>
  );
}
