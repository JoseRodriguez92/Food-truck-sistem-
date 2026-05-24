"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Package, ImagePlus, X, ExternalLink, Upload, Loader2, LayoutList, LayoutGrid, FlaskConical, Tag } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { createProduct, updateProduct, deleteProduct, addProductImage, deleteProductImage, addProductType, deleteProductType, addProductIngredient, removeProductIngredient, setProductCategory } from "@/app/admin/products/actions";

export type ProductImage      = { product_image_id: number; image_url: string };
export type ProductType       = { product_type_id: number; type: string };
export type ProductIngredient = {
  product_ingredient_id: number;
  quantity: number;
  ingredient: { ingredient_id: number; name: string; unit: string };
};
export type AvailableIngredient = { ingredient_id: number; name: string; unit: string };
export type AvailableCategory   = { category_id: number; name: string };
export type Product = {
  product_id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number | null;
  category: { category_id: number; name: string } | null;
  product_has_image: ProductImage[];
  product_has_type: ProductType[];
  product_has_ingredient: ProductIngredient[];
};

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Precio inválido"),
});
type FormValues = z.infer<typeof schema>;

function ProductForm({ defaultValues, isPending }: { defaultValues?: Partial<FormValues>; isPending: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "", price: 0 },
  });
  return (
    <form id="product-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="p-name">Nombre</Label>
        <Input id="p-name" placeholder="Ej. Dorilocos" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea id="p-desc" placeholder="Descripción del producto..." rows={2} {...register("description")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-price">Precio (COP)</Label>
        <Input id="p-price" type="number" step="0.01" min="0" placeholder="0.00" aria-invalid={!!errors.price} {...register("price")} />
        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
      </div>
    </form>
  );
}

const BUCKET = "product-images";
const MAX_SIZE_MB = 3;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function ImagesPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG, WEBP o GIF");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo supera los ${MAX_SIZE_MB}MB permitidos`);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${product.product_id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) { toast.error(uploadError.message); return; }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      const result = await addProductImage(product.product_id, publicUrl);
      if (result?.error) toast.error(result.error);
      else toast.success("Imagen subida");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }

  function handleDelete(imageId: number) {
    startTransition(async () => {
      const result = await deleteProductImage(imageId);
      if (result?.error) toast.error(result.error);
      else toast.success("Imagen eliminada");
    });
  }

  const isLoading = uploading || isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Imágenes — {product.name}</DialogTitle>
        </DialogHeader>

        {/* Zona de drop */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
            px-4 py-6 cursor-pointer transition-colors
            ${dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/50"
            }
            ${isLoading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={handleFileInput}
            disabled={isLoading}
          />
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground text-center">
            {uploading
              ? "Subiendo imagen..."
              : "Arrastra imágenes aquí o haz clic para seleccionar"}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF · máx. {MAX_SIZE_MB}MB</p>
        </label>

        {/* Grid de imágenes */}
        {product.product_has_image.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin imágenes aún</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {product.product_has_image.map((img) => (
              <div
                key={img.product_image_id}
                className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted"
              >
                <Image src={img.image_url} alt="Producto" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <a href={img.image_url} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="secondary" className="h-7 w-7">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7"
                    onClick={() => handleDelete(img.product_image_id)}
                    disabled={isLoading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypesPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [newType, setNewType] = useState("");

  function handleAdd() {
    if (!newType.trim()) return;
    startTransition(async () => {
      const result = await addProductType(product.product_id, newType.trim());
      if (result?.error) toast.error(result.error);
      else { toast.success("Tipo agregado"); setNewType(""); }
    });
  }

  function handleDelete(typeId: number) {
    startTransition(async () => {
      const result = await deleteProductType(typeId);
      if (result?.error) toast.error(result.error);
      else toast.success("Tipo eliminado");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tipos — {product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Ej. Vegano, Picante, Sin gluten..."
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="icon" onClick={handleAdd} disabled={isPending || !newType.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {product.product_has_type.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin tipos asignados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {product.product_has_type.map((t) => (
              <span
                key={t.product_type_id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {t.type}
                <button
                  onClick={() => handleDelete(t.product_type_id)}
                  disabled={isPending}
                  className="hover:text-destructive transition-colors"
                  aria-label="Eliminar tipo"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IngredientsPanel({
  product,
  allIngredients,
  onClose,
}: {
  product: Product;
  allIngredients: AvailableIngredient[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedIngId, setSelectedIngId] = useState("");
  const [quantity, setQuantity] = useState("");

  const usedIds = new Set(product.product_has_ingredient.map((i) => i.ingredient.ingredient_id));
  const available = allIngredients.filter((i) => !usedIds.has(i.ingredient_id));
  const selectedIng = allIngredients.find((i) => i.ingredient_id === Number(selectedIngId));

  function handleAdd() {
    if (!selectedIngId || Number(quantity) <= 0) return;
    startTransition(async () => {
      const result = await addProductIngredient(product.product_id, Number(selectedIngId), Number(quantity));
      if (result?.error) toast.error(result.error);
      else { toast.success("Ingrediente agregado"); setSelectedIngId(""); setQuantity(""); }
    });
  }

  function handleRemove(productIngredientId: number) {
    startTransition(async () => {
      const result = await removeProductIngredient(productIngredientId);
      if (result?.error) toast.error(result.error);
      else toast.success("Ingrediente removido");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receta — {product.name}</DialogTitle>
        </DialogHeader>

        {product.product_has_ingredient.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin ingredientes asignados</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.product_has_ingredient.map((pi) => (
                  <TableRow key={pi.product_ingredient_id}>
                    <TableCell className="font-medium text-sm">{pi.ingredient.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {pi.quantity} {pi.ingredient.unit}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleRemove(pi.product_ingredient_id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {allIngredients.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center">
            Primero crea ingredientes en Catálogo → Ingredientes
          </p>
        ) : available.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center">
            Todos los ingredientes ya están asignados
          </p>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Ingrediente</Label>
              <Select value={selectedIngId} onValueChange={setSelectedIngId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map((ing) => (
                    <SelectItem key={ing.ingredient_id} value={String(ing.ingredient_id)}>
                      {ing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-1.5">
              <Label className="text-xs">
                Cantidad{selectedIng ? ` (${selectedIng.unit})` : ""}
              </Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button
              size="icon"
              disabled={isPending || !selectedIngId || Number(quantity) <= 0}
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryPanel({
  product,
  allCategories,
  onClose,
}: {
  product: Product;
  allCategories: AvailableCategory[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(
    product.category_id ? String(product.category_id) : ""
  );

  function handleSave() {
    startTransition(async () => {
      const result = await setProductCategory(
        product.product_id,
        selected ? Number(selected) : null
      );
      if (result?.error) toast.error(result.error);
      else { toast.success("Categoría actualizada"); onClose(); }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Categoría — {product.name}</DialogTitle>
        </DialogHeader>

        {allCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Primero crea categorías en Catálogo → Categorías
          </p>
        ) : (
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => (
                  <SelectItem key={c.category_id} value={String(c.category_id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <button
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => setSelected("")}
              >
                Quitar categoría
              </button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={isPending || allCategories.length === 0} onClick={handleSave}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

// ── Card individual con slider ─────────────────────────────────────────────────
function ProductCard({
  product,
  onEdit,
  onDelete,
  onImages,
  onTypes,
  onIngredients,
  onCategory,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onImages: () => void;
  onTypes: () => void;
  onIngredients: () => void;
  onCategory: () => void;
}) {
  const hasImages = product.product_has_image.length > 0;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      {/* Slider de imágenes */}
      <div className="relative aspect-square bg-muted">
        {hasImages ? (
          <Carousel className="w-full h-full" opts={{ loop: true }}>
            <CarouselContent className="h-full">
              {product.product_has_image.map((img) => (
                <CarouselItem key={img.product_image_id} className="h-full">
                  <div className="relative w-full aspect-square">
                    <Image
                      src={img.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {product.product_has_image.length > 1 && (
              <>
                <CarouselPrevious className="left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CarouselNext className="right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
            {/* Contador de imágenes */}
            <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
              {product.product_has_image.length} foto{product.product_has_image.length !== 1 ? "s" : ""}
            </span>
          </Carousel>
        ) : (
          <button
            onClick={onImages}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <ImagePlus className="w-8 h-8" />
            <span className="text-xs">Agregar fotos</span>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Categoría */}
        {product.category && (
          <span className="self-start text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            {product.category.name}
          </span>
        )}

        {/* Tipos */}
        {product.product_has_type.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.product_has_type.map((t) => (
              <span key={t.product_type_id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {t.type}
              </span>
            ))}
          </div>
        )}

        {/* Precio */}
        <p className="text-base font-bold text-primary mt-auto">{formatCurrency(product.price)}</p>

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
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onImages}>
                  <ImagePlus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fotos</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onTypes}>
                  <Package className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tipos</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onIngredients}>
                  <FlaskConical className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Receta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-1" onClick={onCategory}>
                  <Tag className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Categoría</TooltipContent>
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

export function ProductsView({ products, allIngredients, allCategories }: { products: Product[]; allIngredients: AvailableIngredient[]; allCategories: AvailableCategory[] }) {
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"list" | "grid">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct_, setDeleteProduct] = useState<Product | null>(null);
  const [imagesProduct, setImagesProduct] = useState<Product | null>(null);
  const [typesProduct, setTypesProduct] = useState<Product | null>(null);
  const [ingredientsProduct, setIngredientsProduct] = useState<Product | null>(null);
  const [categoryProduct, setCategoryProduct] = useState<Product | null>(null);

  function handleCreate(fd: FormData) {
    startTransition(async () => {
      const result = await createProduct(fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("Producto creado"); setCreateOpen(false); }
    });
  }

  function handleEdit(fd: FormData) {
    if (!editProduct) return;
    startTransition(async () => {
      const result = await updateProduct(editProduct.product_id, fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("Producto actualizado"); setEditProduct(null); }
    });
  }

  function handleDelete() {
    if (!deleteProduct_) return;
    startTransition(async () => {
      const result = await deleteProduct(deleteProduct_.product_id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Producto eliminado"); setDeleteProduct(null); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} productos registrados</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex items-center rounded-lg border border-border p-1 gap-1">
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("list")}
            >
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
        products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin productos registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.product_id}
                product={p}
                onEdit={() => setEditProduct(p)}
                onDelete={() => setDeleteProduct(p)}
                onImages={() => setImagesProduct(p)}
                onTypes={() => setTypesProduct(p)}
                onIngredients={() => setIngredientsProduct(p)}
                onCategory={() => setCategoryProduct(p)}
              />
            ))}
          </div>
        )
      )}

      {/* Vista lista */}
      {view === "list" && (
      <div className="rounded-xl border border-border overflow-hidden">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin productos registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipos</TableHead>
                <TableHead>Imágenes</TableHead>
                <TableHead>Receta</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.product_id}>
                  <TableCell className="text-muted-foreground font-mono text-sm">{p.product_id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    {p.category ? (
                      <Badge
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-accent gap-1"
                        onClick={() => setCategoryProduct(p)}
                      >
                        <Tag className="w-3 h-3" />{p.category.name}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs cursor-pointer text-muted-foreground hover:bg-accent gap-1"
                        onClick={() => setCategoryProduct(p)}
                      >
                        <Plus className="w-3 h-3" />Asignar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48 truncate">{p.description ?? "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{formatCurrency(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-36">
                      {p.product_has_type.length === 0 ? (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-accent text-xs gap-1 text-muted-foreground"
                          onClick={() => setTypesProduct(p)}
                        >
                          <Plus className="w-3 h-3" /> Agregar
                        </Badge>
                      ) : (
                        p.product_has_type.slice(0, 2).map((t) => (
                          <Badge
                            key={t.product_type_id}
                            className="text-xs cursor-pointer bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                            variant="outline"
                            onClick={() => setTypesProduct(p)}
                          >
                            {t.type}
                          </Badge>
                        ))
                      )}
                      {p.product_has_type.length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer text-muted-foreground"
                          onClick={() => setTypesProduct(p)}
                        >
                          +{p.product_has_type.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent text-xs gap-1"
                      onClick={() => setImagesProduct(p)}
                    >
                      <ImagePlus className="w-3 h-3" />
                      {p.product_has_image.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent text-xs gap-1"
                      onClick={() => setIngredientsProduct(p)}
                    >
                      <FlaskConical className="w-3 h-3" />
                      {p.product_has_ingredient.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProduct(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteProduct(p)}>
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
          <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
          <ProductForm isPending={isPending} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => {
              const form = document.getElementById("product-form") as HTMLFormElement;
              if (form) handleCreate(new FormData(form));
            }}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar producto</DialogTitle></DialogHeader>
          {editProduct && <ProductForm defaultValues={{ name: editProduct.name, description: editProduct.description ?? "", price: editProduct.price }} isPending={isPending} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => {
              const form = document.getElementById("product-form") as HTMLFormElement;
              if (form) handleEdit(new FormData(form));
            }}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Eliminar */}
      <AlertDialog open={!!deleteProduct_} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteProduct_?.name}</strong>. Esta acción no se puede deshacer.
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

      {/* Panel de imágenes */}
      {imagesProduct && <ImagesPanel product={imagesProduct} onClose={() => setImagesProduct(null)} />}

      {/* Panel de tipos */}
      {typesProduct && <TypesPanel product={typesProduct} onClose={() => setTypesProduct(null)} />}

      {/* Panel de categoría */}
      {categoryProduct && (
        <CategoryPanel
          product={categoryProduct}
          allCategories={allCategories}
          onClose={() => setCategoryProduct(null)}
        />
      )}

      {/* Panel de ingredientes / receta */}
      {ingredientsProduct && (
        <IngredientsPanel
          product={ingredientsProduct}
          allIngredients={allIngredients}
          onClose={() => setIngredientsProduct(null)}
        />
      )}
    </div>
  );
}
