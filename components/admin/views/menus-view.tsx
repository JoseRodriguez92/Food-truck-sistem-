"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, BookOpen, X,
  LayoutList, LayoutGrid, Package, Layers,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  createMenu, updateMenu, deleteMenu,
  addProductToMenu, removeProductFromMenu,
  addComboToMenu, removeComboFromMenu,
} from "@/app/admin/menus/actions";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export type FoodTruckOption = { food_truck_id: number; name: string };
export type ProductOption   = { product_id: number; name: string; price: number };
export type ComboOption     = { combo_id: number; name: string; price: number };

type ProductImage = { image_url: string };

type MenuProduct = {
  menu_product_id: number;
  product_id: number;
  product: { product_id: number; name: string; price: number; product_has_image: ProductImage[] } | null;
};

type MenuCombo = {
  menu_combo_id: number;
  combo_id: number;
  combo: {
    combo_id: number; name: string; price: number;
    combo_has_product: { product: { product_has_image: ProductImage[] } | null }[];
  } | null;
};

export type Menu = {
  menu_id: number;
  name: string;
  description: string | null;
  food_truck_id: number;
  food_truck: { name: string } | null;
  menu_has_product: MenuProduct[];
  menu_has_combo: MenuCombo[];
};

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  food_truck_id: z.coerce.number().min(1, "Selecciona un food truck"),
});
type FormValues = z.infer<typeof schema>;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function toSingle<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ── Helpers para extraer imágenes ──────────────────────────────────────────────
function getMenuImages(menu: Menu): string[] {
  const fromProducts = menu.menu_has_product.flatMap((mp) => {
    const p = toSingle(mp.product as MenuProduct["product"] | MenuProduct["product"][]);
    return (p?.product_has_image ?? []).map((i) => i.image_url);
  });
  const fromCombos = menu.menu_has_combo.flatMap((mc) => {
    const c = toSingle(mc.combo as MenuCombo["combo"] | MenuCombo["combo"][]);
    return (c?.combo_has_product ?? []).flatMap((cp) => {
      const p = toSingle(cp.product as { product_has_image: ProductImage[] } | { product_has_image: ProductImage[] }[]);
      return (p?.product_has_image ?? []).map((i) => i.image_url);
    });
  });
  return [...new Set([...fromProducts, ...fromCombos])].slice(0, 4);
}

// ── Formulario ────────────────────────────────────────────────────────────────
function MenuForm({ defaultValues, trucks }: { defaultValues?: Partial<FormValues>; trucks: FoodTruckOption[] }) {
  const { register, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "", food_truck_id: 0 },
  });
  return (
    <form id="menu-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="m-name">Nombre</Label>
        <Input id="m-name" placeholder="Ej. Menú Verano" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea id="m-desc" placeholder="Descripción del menú..." rows={2} {...register("description")} />
      </div>
      <div className="space-y-1.5">
        <Label>Food Truck</Label>
        <Select
          defaultValue={defaultValues?.food_truck_id ? String(defaultValues.food_truck_id) : undefined}
          onValueChange={(v) => setValue("food_truck_id", Number(v))}
        >
          <SelectTrigger aria-invalid={!!errors.food_truck_id}>
            <SelectValue placeholder="Selecciona un food truck" />
          </SelectTrigger>
          <SelectContent>
            {trucks.map((t) => (
              <SelectItem key={t.food_truck_id} value={String(t.food_truck_id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" {...register("food_truck_id")} value={watch("food_truck_id")} />
        {errors.food_truck_id && <p className="text-xs text-destructive">{errors.food_truck_id.message}</p>}
      </div>
    </form>
  );
}

// ── Panel de contenido (productos + combos) ────────────────────────────────────
function MenuContentPanel({
  menu, allProducts, allCombos, onClose,
}: {
  menu: Menu;
  allProducts: ProductOption[];
  allCombos: ComboOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selProduct, setSelProduct] = useState("");
  const [selCombo, setSelCombo] = useState("");

  const usedProductIds = new Set(menu.menu_has_product.map((mp) => mp.product_id));
  const usedComboIds   = new Set(menu.menu_has_combo.map((mc) => mc.combo_id));
  const availableProducts = allProducts.filter((p) => !usedProductIds.has(p.product_id));
  const availableCombos   = allCombos.filter((c) => !usedComboIds.has(c.combo_id));

  function handleAddProduct() {
    if (!selProduct) return;
    startTransition(async () => {
      const result = await addProductToMenu(menu.menu_id, Number(selProduct));
      if (result?.error) toast.error(result.error);
      else { toast.success("Producto agregado"); setSelProduct(""); }
    });
  }

  function handleRemoveProduct(menuProductId: number, name: string) {
    startTransition(async () => {
      const result = await removeProductFromMenu(menuProductId);
      if (result?.error) toast.error(result.error);
      else toast.success(`"${name}" quitado del menú`);
    });
  }

  function handleAddCombo() {
    if (!selCombo) return;
    startTransition(async () => {
      const result = await addComboToMenu(menu.menu_id, Number(selCombo));
      if (result?.error) toast.error(result.error);
      else { toast.success("Combo agregado"); setSelCombo(""); }
    });
  }

  function handleRemoveCombo(menuComboId: number, name: string) {
    startTransition(async () => {
      const result = await removeComboFromMenu(menuComboId);
      if (result?.error) toast.error(result.error);
      else toast.success(`"${name}" quitado del menú`);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contenido — {menu.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="products">
          <TabsList className="w-full">
            <TabsTrigger value="products" className="flex-1 gap-2">
              <Package className="w-3.5 h-3.5" />
              Productos
              <Badge variant="secondary" className="text-xs ml-1">{menu.menu_has_product.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex-1 gap-2">
              <Layers className="w-3.5 h-3.5" />
              Combos
              <Badge variant="secondary" className="text-xs ml-1">{menu.menu_has_combo.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab Productos */}
          <TabsContent value="products" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Select value={selProduct} onValueChange={setSelProduct} disabled={availableProducts.length === 0}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={availableProducts.length === 0 ? "Todos los productos ya están" : "Agregar producto..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.product_id} value={String(p.product_id)}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground text-xs">{formatCurrency(p.price)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" onClick={handleAddProduct} disabled={isPending || !selProduct}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Separator />
            {menu.menu_has_product.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin productos en este menú</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {menu.menu_has_product.map((mp) => {
                  const p = toSingle(mp.product as MenuProduct["product"] | MenuProduct["product"][]);
                  const img = p?.product_has_image?.[0];
                  return (
                    <div key={mp.menu_product_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50 group">
                      <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 bg-muted border border-border">
                        {img
                          ? <Image src={img.image_url} alt={p?.name ?? ""} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p?.name ?? "—"}</p>
                        {p && <p className="text-xs text-muted-foreground">{formatCurrency(p.price)}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        disabled={isPending} onClick={() => handleRemoveProduct(mp.menu_product_id, p?.name ?? "")}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab Combos */}
          <TabsContent value="combos" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Select value={selCombo} onValueChange={setSelCombo} disabled={availableCombos.length === 0}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={availableCombos.length === 0 ? "Todos los combos ya están" : "Agregar combo..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableCombos.map((c) => (
                    <SelectItem key={c.combo_id} value={String(c.combo_id)}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>{c.name}</span>
                        <span className="text-muted-foreground text-xs">{formatCurrency(c.price)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" onClick={handleAddCombo} disabled={isPending || !selCombo}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Separator />
            {menu.menu_has_combo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin combos en este menú</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {menu.menu_has_combo.map((mc) => {
                  const c = toSingle(mc.combo as MenuCombo["combo"] | MenuCombo["combo"][]);
                  const img = c?.combo_has_product?.[0];
                  const firstImg = img
                    ? toSingle((img.product as { product_has_image: ProductImage[] } | null)?.product_has_image)
                    : null;
                  return (
                    <div key={mc.menu_combo_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50 group">
                      <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 bg-muted border border-border">
                        {firstImg
                          ? <Image src={(firstImg as ProductImage).image_url} alt={c?.name ?? ""} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                          : <div className="w-full h-full flex items-center justify-center"><Layers className="w-4 h-4 text-muted-foreground" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c?.name ?? "—"}</p>
                        {c && <p className="text-xs text-muted-foreground">{formatCurrency(c.price)}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        disabled={isPending} onClick={() => handleRemoveCombo(mc.menu_combo_id, c?.name ?? "")}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Resumen */}
        {(menu.menu_has_product.length + menu.menu_has_combo.length) > 0 && (
          <div className="rounded-lg bg-card border border-border px-4 py-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Items en el menú</span>
            <span className="font-semibold">
              {menu.menu_has_product.length} producto{menu.menu_has_product.length !== 1 ? "s" : ""} · {menu.menu_has_combo.length} combo{menu.menu_has_combo.length !== 1 ? "s" : ""}
            </span>
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
function MenuCard({ menu, onEdit, onDelete, onContent }: {
  menu: Menu;
  onEdit: () => void;
  onDelete: () => void;
  onContent: () => void;
}) {
  const images = getMenuImages(menu);
  const truck = toSingle(menu.food_truck as { name: string } | { name: string }[]);
  const totalItems = menu.menu_has_product.length + menu.menu_has_combo.length;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      {/* Mosaico */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {images.length === 0 ? (
          <button onClick={onContent} className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
            <BookOpen className="w-8 h-8" />
            <span className="text-xs">Agregar contenido</span>
          </button>
        ) : images.length === 1 ? (
          <Image src={images[0]} alt={menu.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="grid grid-cols-2 gap-0.5 h-full w-full">
            {images.map((url, i) => (
              <div key={i} className={`relative overflow-hidden ${images.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
        <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm leading-tight">{menu.name}</h3>
            <span className="text-xs text-muted-foreground font-mono shrink-0">#{menu.menu_id}</span>
          </div>
          {menu.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{menu.description}</p>
          )}
        </div>

        {truck && (
          <Badge variant="secondary" className="text-xs w-fit gap-1">
            🚚 {truck.name}
          </Badge>
        )}

        {/* Preview items */}
        <div className="flex flex-wrap gap-1">
          {menu.menu_has_product.slice(0, 2).map((mp) => {
            const p = toSingle(mp.product as MenuProduct["product"] | MenuProduct["product"][]);
            return p ? (
              <Badge key={mp.menu_product_id} variant="outline" className="text-xs">{p.name}</Badge>
            ) : null;
          })}
          {menu.menu_has_combo.slice(0, 1).map((mc) => {
            const c = toSingle(mc.combo as MenuCombo["combo"] | MenuCombo["combo"][]);
            return c ? (
              <Badge key={mc.menu_combo_id} className="text-xs bg-primary/10 text-primary border-primary/20" variant="outline">{c.name}</Badge>
            ) : null;
          })}
          {totalItems > 3 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">+{totalItems - 3}</Badge>
          )}
        </div>

        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1 pt-2 border-t border-border mt-auto">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onContent}>
                  <BookOpen className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Contenido</TooltipContent>
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
export function MenusView({ menus, trucks, allProducts, allCombos }: {
  menus: Menu[];
  trucks: FoodTruckOption[];
  allProducts: ProductOption[];
  allCombos: ComboOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [editMenu, setEditMenu] = useState<Menu | null>(null);
  const [deleteMenu_, setDeleteMenu] = useState<Menu | null>(null);
  const [contentMenu, setContentMenu] = useState<Menu | null>(null);

  function submit(action: (fd: FormData) => Promise<{ error: string } | undefined>, onSuccess: () => void) {
    const form = document.getElementById("menu-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result?.error) toast.error(result.error);
      else onSuccess();
    });
  }

  function handleDelete() {
    if (!deleteMenu_) return;
    startTransition(async () => {
      const result = await deleteMenu(deleteMenu_.menu_id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Menú eliminado"); setDeleteMenu(null); }
    });
  }

  const empty = (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BookOpen className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">Sin menús registrados</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Menús</h1>
          <p className="text-sm text-muted-foreground mt-1">{menus.length} menús registrados</p>
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
          <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={trucks.length === 0}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      </div>

      {trucks.length === 0 && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3">
          <p className="text-sm text-yellow-600">Primero debes registrar al menos un Food Truck para crear menús.</p>
        </div>
      )}

      {/* Vista cards */}
      {view === "grid" && (
        menus.length === 0 ? empty : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {menus.map((m) => (
              <MenuCard key={m.menu_id} menu={m}
                onEdit={() => setEditMenu(m)}
                onDelete={() => setDeleteMenu(m)}
                onContent={() => setContentMenu(m)}
              />
            ))}
          </div>
        )
      )}

      {/* Vista lista */}
      {view === "list" && (
        <div className="rounded-xl border border-border overflow-hidden">
          {menus.length === 0 ? empty : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead>Food Truck</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menus.map((m) => {
                  const truck = toSingle(m.food_truck as { name: string } | { name: string }[]);
                  const totalItems = m.menu_has_product.length + m.menu_has_combo.length;
                  return (
                    <TableRow key={m.menu_id}>
                      <TableCell className="text-muted-foreground font-mono text-sm">{m.menu_id}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-40 truncate">{m.description ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{truck?.name ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => setContentMenu(m)}>
                          {totalItems === 0 ? (
                            <Badge variant="outline" className="text-xs gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                              <Plus className="w-3 h-3" /> Agregar
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              {m.menu_has_product.length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1 cursor-pointer hover:bg-accent">
                                  <Package className="w-3 h-3" /> {m.menu_has_product.length}
                                </Badge>
                              )}
                              {m.menu_has_combo.length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1 cursor-pointer hover:bg-accent">
                                  <Layers className="w-3 h-3" /> {m.menu_has_combo.length}
                                </Badge>
                              )}
                            </div>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditMenu(m)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteMenu(m)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo menú</DialogTitle></DialogHeader>
          <MenuForm trucks={trucks} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit(createMenu, () => { toast.success("Menú creado"); setCreateOpen(false); })}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editMenu} onOpenChange={(o) => !o && setEditMenu(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar menú</DialogTitle></DialogHeader>
          {editMenu && <MenuForm trucks={trucks} defaultValues={{ name: editMenu.name, description: editMenu.description ?? "", food_truck_id: editMenu.food_truck_id }} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMenu(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit((fd) => updateMenu(editMenu!.menu_id, fd), () => { toast.success("Menú actualizado"); setEditMenu(null); })}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Eliminar */}
      <AlertDialog open={!!deleteMenu_} onOpenChange={(o) => !o && setDeleteMenu(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar menú?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteMenu_?.name}</strong> y todo su contenido. Esta acción no se puede deshacer.
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

      {/* Panel de contenido */}
      {contentMenu && (
        <MenuContentPanel
          menu={contentMenu}
          allProducts={allProducts}
          allCombos={allCombos}
          onClose={() => setContentMenu(null)}
        />
      )}
    </div>
  );
}
