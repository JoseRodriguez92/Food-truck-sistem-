"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, Trash2, Package, Layers, X, MapPin, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/store/cart";
import { DirectionsSheet, type DirectionItem } from "@/components/client/directions-sheet";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ProductImage = { product_image_id: number; image_url: string };
type ProductType  = { product_type_id: number; type: string };

type MenuProduct = {
  menu_product_id: number;
  product_id: number;
  product: {
    product_id: number;
    name: string;
    description: string | null;
    price: number;
    product_has_type:  ProductType  | ProductType[]  | null;
    product_has_image: ProductImage | ProductImage[] | null;
  } | null;
};

type ComboProduct = {
  combo_product_id: number;
  product: {
    product_id: number;
    name: string;
    product_has_image: ProductImage | ProductImage[] | null;
  } | null;
};

type MenuCombo = {
  menu_combo_id: number;
  combo_id: number;
  combo: {
    combo_id: number;
    name: string;
    description: string | null;
    price: number;
    combo_has_product: ComboProduct | ComboProduct[] | null;
  } | null;
};

export type MenuData = {
  menu_id: number;
  name: string;
  description: string | null;
  menu_has_product: MenuProduct | MenuProduct[] | null;
  menu_has_combo:   MenuCombo   | MenuCombo[]   | null;
};

export type LocationCtx = {
  locationName: string;
  locationId: number;
  menus: { menu_id: number; name: string }[];
  activeMenuId: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function toSingle<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Cart Drawer ───────────────────────────────────────────────────────────────

function CartDrawer({ open, onClose, locationId }: { open: boolean; onClose: () => void; locationId?: number }) {
  const router = useRouter();
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Tu pedido
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShoppingCart className="w-10 h-10 opacity-20" />
            <p className="text-sm">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  {/* Imagen */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-primary font-semibold">{formatCOP(item.price)}</p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-semibold">{formatCOP(total())}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-bold">Total</span>
                <span className="text-lg font-bold text-primary">{formatCOP(total())}</span>
              </div>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => {
                  onClose();
                  router.push(locationId ? `/client/checkout?location=${locationId}` : "/client/checkout");
                }}
              >
                <CreditCard className="w-4 h-4" />
                Continuar con el pedido
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearCart}>
                Vaciar carrito
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ mp }: { mp: MenuProduct }) {
  if (!mp.product) return null;
  const p = mp.product!;

  const addItem   = useCartStore((s) => s.addItem);
  const items     = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);

  const cartId  = `product-${p.product_id}`;
  const inCart  = items.find((i) => i.id === cartId);
  const images  = toArray(p.product_has_image);
  const types   = toArray(p.product_has_type);
  const thumb   = images[0]?.image_url ?? null;

  function handleAdd() {
    addItem({ id: cartId, type: "product", itemId: p.product_id, name: p.name, price: p.price, image: thumb });
    toast.success(`"${p.name}" agregado`);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      {/* Imagen */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {thumb ? (
          <Image src={thumb} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground opacity-20" />
          </div>
        )}
        {/* Types */}
        {types.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {types.map((t) => (
              <span key={t.product_type_id} className="text-xs px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                {t.type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div>
          <h3 className="font-semibold text-sm leading-tight">{p.name}</h3>
          {p.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="text-base font-bold text-primary">{formatCOP(p.price)}</span>
          {inCart ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQty(cartId, inCart.quantity - 1)}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                {inCart.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
              </button>
              <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
              <button
                onClick={() => updateQty(cartId, inCart.quantity + 1)}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Combo Card ────────────────────────────────────────────────────────────────

function ComboCard({ mc }: { mc: MenuCombo }) {
  const combo = toSingle(mc.combo)!;
  if (!combo) return null;

  const addItem   = useCartStore((s) => s.addItem);
  const items     = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);

  const cartId       = `combo-${combo.combo_id}`;
  const inCart       = items.find((i) => i.id === cartId);
  const comboProducts = toArray(combo.combo_has_product);

  const thumbs = comboProducts
    .map((cp) => toSingle(cp.product))
    .filter(Boolean)
    .map((p) => toArray(p!.product_has_image)[0]?.image_url ?? null)
    .filter(Boolean) as string[];

  function handleAdd() {
    addItem({ id: cartId, type: "combo", itemId: combo.combo_id, name: combo.name, price: combo.price, image: thumbs[0] ?? null });
    toast.success(`"${combo.name}" agregado`);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      {/* Mosaic */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {thumbs.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-10 h-10 text-muted-foreground opacity-20" />
          </div>
        ) : thumbs.length === 1 ? (
          <Image src={thumbs[0]} alt={combo.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
        ) : (
          <div className={`grid h-full gap-0.5 ${thumbs.length >= 4 ? "grid-cols-2" : "grid-cols-2"}`}>
            {thumbs.slice(0, 4).map((url, i) => (
              <div key={i} className={`relative overflow-hidden ${thumbs.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
        <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm flex items-center gap-1">
          <Layers className="w-3 h-3" /> Combo
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div>
          <h3 className="font-semibold text-sm leading-tight">{combo.name}</h3>
          {combo.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{combo.description}</p>
          )}
          {comboProducts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {comboProducts.slice(0, 3).map((cp) => {
                const prod = toSingle(cp.product);
                return prod ? (
                  <span key={cp.combo_product_id} className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {prod.name}
                  </span>
                ) : null;
              })}
              {comboProducts.length > 3 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  +{comboProducts.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="text-base font-bold text-primary">{formatCOP(combo.price)}</span>
          {inCart ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQty(cartId, inCart.quantity - 1)}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                {inCart.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
              </button>
              <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
              <button
                onClick={() => updateQty(cartId, inCart.quantity + 1)}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Menu View ────────────────────────────────────────────────────────────

export function MenuView({
  menu,
  locationCtx,
  directions = [],
}: {
  menu: MenuData;
  locationCtx?: LocationCtx;
  directions?: DirectionItem[];
}) {
  const [cartOpen, setCartOpen]             = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [mounted, setMounted]               = useState(false);
  useEffect(() => setMounted(true), []);
  const count  = useCartStore((s) => s.count());
  const total  = useCartStore((s) => s.total());
  const router = useRouter();

  const rawProducts = toArray(menu.menu_has_product);
  const rawCombos   = toArray(menu.menu_has_combo);

  // Agrupar productos por type
  const groups = new Map<string, MenuProduct[]>();
  for (const mp of rawProducts) {
    if (!mp.product) continue;
    const types = toArray(mp.product.product_has_type);
    const keys  = types.length === 0 ? ["Otros"] : types.map((t) => t.type);
    for (const key of keys) {
      const existing = groups.get(key) ?? [];
      groups.set(key, [...existing, mp]);
    }
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === "Otros") return 1;
    if (b === "Otros") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="relative min-h-screen">
      {/* Header sticky */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        {/* Ubicación + carrito */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div>
            {locationCtx && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-primary">{locationCtx.locationName}</span>
              </div>
            )}
            <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              {menu.name}
            </h1>
            {menu.description && (
              <p className="text-xs text-muted-foreground">{menu.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDirectionsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent hover:border-primary/40 transition-colors"
              title="Mis direcciones"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline text-muted-foreground">Ubicaciones</span>
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Mi pedido</span>
              {mounted && count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card text-foreground text-xs flex items-center justify-center font-bold border border-border">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs de menús si hay más de uno en la ubicación */}
        {locationCtx && locationCtx.menus.length > 1 && (
          <div className="flex gap-1 px-4 sm:px-6 lg:px-8 pb-2 overflow-x-auto scrollbar-none">
            {locationCtx.menus.map((m) => (
              <button
                key={m.menu_id}
                onClick={() => router.push(`/client/menu?location=${locationCtx.locationId}&id=${m.menu_id}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  m.menu_id === locationCtx.activeMenuId
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-10">
        {/* ── Productos agrupados por tipo ── */}
        {sortedGroups.length > 0 && sortedGroups.map(([groupName, items]) => (
          <section key={groupName}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                {groupName}
              </h2>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {items.map((mp) => <ProductCard key={mp.menu_product_id} mp={mp} />)}
            </div>
          </section>
        ))}

        {/* ── Combos ── */}
        {rawCombos.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                Combos
              </h2>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{rawCombos.length} combo{rawCombos.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {rawCombos.map((mc) => <ComboCard key={mc.menu_combo_id} mc={mc} />)}
            </div>
          </section>
        )}

        {sortedGroups.length === 0 && rawCombos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Este menú no tiene productos aún.</p>
          </div>
        )}
      </div>

      {/* Barra flotante del carrito (solo cuando hay items) */}
      {mounted && count > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:left-[calc(50%+120px)]">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="font-semibold text-sm">{count} item{count !== 1 ? "s" : ""}</span>
            <span className="text-xs opacity-80">·</span>
            <span className="font-bold text-sm">{formatCOP(total)}</span>
          </button>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} locationId={locationCtx?.locationId} />
      <DirectionsSheet
        directions={directions}
        open={directionsOpen}
        onClose={() => setDirectionsOpen(false)}
      />
    </div>
  );
}
