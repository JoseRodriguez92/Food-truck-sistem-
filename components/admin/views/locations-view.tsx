"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, MapPin, X, BookOpen, ChevronRight, Eye, Package, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createLocation,
  updateLocation,
  deleteLocation,
  assignMenuToLocation,
  removeMenuFromLocation,
  getMenuDetail,
} from "@/app/admin/locations/actions";
import { LocationQR } from "@/components/admin/location-qr";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TruckOption = { food_truck_id: number; name: string; color: string | null };
export type MenuOption  = { menu_id: number; name: string };

// Tipo simple para la tabla (query liviano)
type LocationMenu = {
  location_menu_id: number;
  menu_id: number;
  menu: { menu_id: number; name: string } | { menu_id: number; name: string }[] | null;
};

export type Location = {
  location_id: number;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  food_truck_id: number;
  food_truck: { food_truck_id: number; name: string; color: string | null } | { food_truck_id: number; name: string; color: string | null }[] | null;
  location_has_menu: LocationMenu[];
};

// Tipo del detalle completo (cargado on-demand)
type ProductImage = { image_url: string };
type ProductType  = { product_type_id: number; type: string };

type DetailProduct = {
  menu_product_id: number;
  product_id: number;
  product: {
    product_id: number;
    name: string;
    price: number;
    product_has_type:  ProductType  | ProductType[]  | null;
    product_has_image: ProductImage | ProductImage[] | null;
  } | null;
};

type DetailComboProduct = {
  combo_product_id: number;
  product: {
    product_id: number;
    name: string;
    product_has_image: ProductImage | ProductImage[] | null;
  } | null;
};

type DetailCombo = {
  menu_combo_id: number;
  combo_id: number;
  combo: {
    combo_id: number;
    name: string;
    price: number;
    combo_has_product: DetailComboProduct | DetailComboProduct[] | null;
  } | null;
};

type MenuDetail = {
  menu_id: number;
  name: string;
  menu_has_product: DetailProduct | DetailProduct[] | null;
  menu_has_combo:   DetailCombo   | DetailCombo[]   | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toSingle<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function toArray<T>(v: T | T[] | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function getProductThumb(product: { product_has_image: ProductImage | ProductImage[] | null } | null): string | null {
  if (!product) return null;
  return toArray(product.product_has_image)[0]?.image_url ?? null;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:          z.string().min(1, "El nombre es requerido"),
  address:       z.string().optional(),
  city:          z.string().optional(),
  country:       z.string().optional(),
  food_truck_id: z.string().min(1, "Selecciona un food truck"),
});
type FormValues = z.infer<typeof schema>;

// ─── Location Form ─────────────────────────────────────────────────────────────

function LocationForm({ defaultValues, trucks }: { defaultValues?: Partial<FormValues>; trucks: TruckOption[] }) {
  const { register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", address: "", city: "", country: "", food_truck_id: "" },
  });

  return (
    <form id="location-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="l-truck">Food Truck</Label>
        <select
          id="l-truck"
          {...register("food_truck_id")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Selecciona un food truck...</option>
          {trucks.map((t) => <option key={t.food_truck_id} value={t.food_truck_id}>{t.name}</option>)}
        </select>
        {errors.food_truck_id && <p className="text-xs text-destructive">{errors.food_truck_id.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="l-name">Nombre de la ubicación</Label>
        <Input id="l-name" placeholder="Ej. Sede Centro, Parque el Lago..." aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="l-address">Dirección <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Input id="l-address" placeholder="Ej. Cra 7 #45-10" {...register("address")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="l-city">Ciudad <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="l-city" placeholder="Ej. Bogotá" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l-country">País <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="l-country" placeholder="Ej. Colombia" {...register("country")} />
        </div>
      </div>
    </form>
  );
}

// ─── Menu Detail Sheet ─────────────────────────────────────────────────────────

function MenuDetailSheet({
  menuId,
  menuName,
  open,
  onClose,
}: {
  menuId: number;
  menuName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail]   = useState<MenuDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    getMenuDetail(menuId).then((res) => {
      if ("error" in res) setError(res.error ?? "Error desconocido");
      else setDetail(res.data as unknown as MenuDetail);
      setLoading(false);
    });
  }, [open, menuId]);

  // Agrupar productos por type
  const rawProducts = toArray(detail?.menu_has_product ?? null);
  const rawCombos   = toArray(detail?.menu_has_combo ?? null);

  const groups = new Map<string, DetailProduct[]>();
  for (const mp of rawProducts) {
    if (!mp.product) continue;
    const types = toArray(mp.product.product_has_type);
    const keys = types.length === 0 ? ["Sin categoría"] : types.map((t) => t.type);
    for (const key of keys) {
      const existing = groups.get(key) ?? [];
      groups.set(key, [...existing, mp]);
    }
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === "Sin categoría") return 1;
    if (b === "Sin categoría") return -1;
    return a.localeCompare(b);
  });

  const combos = rawCombos
    .map((mc) => toSingle(mc.combo))
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-primary" />
            {menuName}
          </SheetTitle>
          {detail && (
            <p className="text-xs text-muted-foreground">
              {rawProducts.length} producto{rawProducts.length !== 1 ? "s" : ""} · {combos.length} combo{combos.length !== 1 ? "s" : ""}
            </p>
          )}
        </SheetHeader>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center px-5">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {!loading && !error && detail && (
          <Tabs defaultValue="products" className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-5 mt-4 shrink-0">
              <TabsTrigger value="products" className="flex items-center gap-1.5 flex-1">
                <Package className="w-3.5 h-3.5" />
                Productos
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 ml-0.5">{rawProducts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="combos" className="flex items-center gap-1.5 flex-1">
                <Layers className="w-3.5 h-3.5" />
                Combos
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 ml-0.5">{combos.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* ── Productos agrupados por type ── */}
            <TabsContent value="products" className="flex-1 overflow-y-auto px-5 pb-5 mt-4 space-y-5">
              {sortedGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Sin productos en este menú</p>
                </div>
              ) : (
                sortedGroups.map(([groupName, items]) => (
                  <div key={groupName}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-primary uppercase tracking-widest">{groupName}</span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{items.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((mp) => {
                        const p = mp.product!;
                        const thumb = getProductThumb(p);
                        const types = toArray(p.product_has_type);
                        return (
                          <div key={mp.menu_product_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
                            <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                              {thumb ? (
                                <Image src={thumb} alt={p.name} width={36} height={36} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground opacity-40" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              {types.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {types.map((t) => (
                                    <span key={t.product_type_id} className="text-xs px-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                      {t.type}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold shrink-0">{formatCOP(p.price)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Combos ── */}
            <TabsContent value="combos" className="flex-1 overflow-y-auto px-5 pb-5 mt-4 space-y-3">
              {combos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Layers className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Sin combos en este menú</p>
                </div>
              ) : (
                combos.map((combo) => {
                  if (!combo) return null;
                  const comboProducts = toArray(combo.combo_has_product);
                  const thumbs = comboProducts
                    .map((cp) => { const prod = toSingle(cp.product); return prod ? getProductThumb(prod) : null; })
                    .filter(Boolean) as string[];

                  return (
                    <div key={combo.combo_id} className="rounded-lg border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border grid grid-cols-2 gap-px">
                          {thumbs.slice(0, 4).map((url, i) => (
                            <div key={i} className="relative overflow-hidden bg-muted">
                              <Image src={url} alt="" fill className="object-cover" />
                            </div>
                          ))}
                          {thumbs.length === 0 && (
                            <div className="col-span-2 row-span-2 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-muted-foreground opacity-40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{combo.name}</p>
                          <p className="text-xs text-muted-foreground">{comboProducts.length} producto{comboProducts.length !== 1 ? "s" : ""}</p>
                        </div>
                        <span className="text-sm font-semibold shrink-0">{formatCOP(combo.price)}</span>
                      </div>
                      {comboProducts.length > 0 && (
                        <div className="border-t border-border px-3 py-2 flex flex-wrap gap-1.5">
                          {comboProducts.map((cp) => {
                            const prod = toSingle(cp.product);
                            return prod ? (
                              <span key={cp.combo_product_id} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                {prod.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Menus Panel (Sheet) ────────────────────────────────────────────────────────

function MenusPanel({
  location,
  allMenus,
  open,
  onClose,
}: {
  location: Location;
  allMenus: MenuOption[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [viewingMenu, setViewingMenu] = useState<{ id: number; name: string } | null>(null);

  const assignedIds = new Set(location.location_has_menu.map((lm) => lm.menu_id));
  const availableMenus = allMenus.filter((m) => !assignedIds.has(m.menu_id));

  function handleAssign() {
    if (!selectedMenuId) return;
    startTransition(async () => {
      const result = await assignMenuToLocation(location.location_id, Number(selectedMenuId));
      if (result?.error) toast.error(result.error);
      else { toast.success("Menú asignado"); setSelectedMenuId(""); router.refresh(); }
    });
  }

  function handleRemove(locationMenuId: number, menuName: string) {
    startTransition(async () => {
      const result = await removeMenuFromLocation(locationMenuId);
      if (result?.error) toast.error(result.error);
      else { toast.success(`"${menuName}" removido`); router.refresh(); }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-primary" />
              {location.name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Menús asignados a esta ubicación</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {availableMenus.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder="Agregar menú..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMenus.map((m) => (
                      <SelectItem key={m.menu_id} value={String(m.menu_id)} className="text-sm">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!selectedMenuId || isPending} onClick={handleAssign} className="gap-1.5 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  Asignar
                </Button>
              </div>
            )}

            {location.location_has_menu.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Sin menús asignados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {location.location_has_menu.map((lm) => {
                  const menu = toSingle(lm.menu);
                  return (
                    <div key={lm.location_menu_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
                      <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{menu?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">#{lm.menu_id}</p>
                      </div>
                      <button
                        onClick={() => setViewingMenu({ id: lm.menu_id, name: menu?.name ?? "" })}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                        title="Ver contenido"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(lm.location_menu_id, menu?.name ?? "")}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-40"
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {location.location_has_menu.length} menú{location.location_has_menu.length !== 1 ? "s" : ""} asignado{location.location_has_menu.length !== 1 ? "s" : ""}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {viewingMenu && (
        <MenuDetailSheet
          menuId={viewingMenu.id}
          menuName={viewingMenu.name}
          open={!!viewingMenu}
          onClose={() => setViewingMenu(null)}
        />
      )}
    </>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────

export function LocationsView({
  locations,
  trucks,
  menus,
}: {
  locations: Location[];
  trucks: TruckOption[];
  menus: MenuOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editLoc, setEditLoc]       = useState<Location | null>(null);
  const [deleteLoc, setDeleteLoc]   = useState<Location | null>(null);
  const [menusPanel, setMenusPanel] = useState<Location | null>(null);

  function submit(
    action: (fd: FormData) => Promise<{ error: string } | undefined>,
    onSuccess: () => void
  ) {
    const form = document.getElementById("location-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result?.error) toast.error(result.error);
      else onSuccess();
    });
  }

  function handleDelete() {
    if (!deleteLoc) return;
    startTransition(async () => {
      const result = await deleteLocation(deleteLoc.location_id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Ubicación eliminada"); setDeleteLoc(null); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Ubicaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{locations.length} ubicaciones registradas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nueva ubicación</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MapPin className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin ubicaciones registradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ubicación</TableHead>
                <TableHead className="hidden md:table-cell">Dirección</TableHead>
                <TableHead>Food Truck</TableHead>
                <TableHead>Menús</TableHead>
                <TableHead className="w-10 text-center">QR</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => {
                const truck = toSingle(loc.food_truck);
                const menuCount = loc.location_has_menu.length;
                return (
                  <TableRow key={loc.location_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{loc.name}</p>
                          {loc.city && (
                            <p className="text-xs text-muted-foreground">{loc.city}{loc.country ? `, ${loc.country}` : ""}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-40 truncate">
                      {loc.address ?? "—"}
                    </TableCell>
                    <TableCell>
                      {truck ? (
                        <div className="flex items-center gap-1.5">
                          {truck.color && (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-border" style={{ backgroundColor: truck.color }} />
                          )}
                          <span className="text-sm font-medium">{truck.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => setMenusPanel(loc)} className="flex items-center gap-1 group">
                        <Badge
                          variant={menuCount > 0 ? "secondary" : "outline"}
                          className="text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors cursor-pointer"
                        >
                          {menuCount} menú{menuCount !== 1 ? "s" : ""}
                        </Badge>
                        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <LocationQR locationId={loc.location_id} locationName={loc.name} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditLoc(loc)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                          onClick={() => setDeleteLoc(loc)}
                          disabled={menuCount > 0}
                          title={menuCount > 0 ? "Tiene menús asignados" : "Eliminar"}
                        >
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva ubicación</DialogTitle></DialogHeader>
          <LocationForm trucks={trucks} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit(createLocation, () => { toast.success("Ubicación creada"); setCreateOpen(false); })}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editLoc} onOpenChange={(o) => !o && setEditLoc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar ubicación</DialogTitle></DialogHeader>
          {editLoc && (
            <LocationForm
              trucks={trucks}
              defaultValues={{
                name:          editLoc.name,
                address:       editLoc.address  ?? "",
                city:          editLoc.city      ?? "",
                country:       editLoc.country   ?? "",
                food_truck_id: String(editLoc.food_truck_id),
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLoc(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit((fd) => updateLocation(editLoc!.location_id, fd), () => { toast.success("Ubicación actualizada"); setEditLoc(null); })}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLoc} onOpenChange={(o) => !o && setDeleteLoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteLoc?.name}</strong>. Esta acción no se puede deshacer.
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

      {/* Menus Panel */}
      {menusPanel && (
        <MenusPanel
          location={menusPanel}
          allMenus={menus}
          open={!!menusPanel}
          onClose={() => setMenusPanel(null)}
        />
      )}
    </div>
  );
}
