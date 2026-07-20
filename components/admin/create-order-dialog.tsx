"use client";

/**
 * CreateOrderDialog
 *
 * Pedido manual desde el panel (staff toma el pedido en persona).
 * Permite cliente registrado (buscado por nombre/email) o "mostrador"
 * (sin cuenta asociada — requiere que profile_id sea nullable, ver
 * supabase/migrations/allow_manual_orders.sql).
 *
 * @module components/admin/create-order-dialog
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Plus, Minus, X, User, Store, Package, Layers, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  searchCustomers,
  getCatalogForOrder,
  getLocationsForOrder,
  createManualOrder,
} from "@/app/dashboard/orders-actions";

type Customer = { id: string; first_name: string | null; last_name: string | null; email: string | null; isSocio: boolean };
type CatalogItem = { id: number; name: string; price: number; partnerPrice: number | null; type: "product" | "combo" };
type CartLine = CatalogItem & { quantity: number };
type LocationOption = { location_id: number; name: string; food_truck: { name: string } | { name: string }[] | null };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function effectivePrice(item: CatalogItem, isPartnerPrice: boolean) {
  return isPartnerPrice && item.partnerPrice != null ? item.partnerPrice : item.price;
}

export function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isPending, startTransition] = useTransition();

  // Ubicación
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationId, setLocationId] = useState<string>("");

  // Cliente
  const [customerMode, setCustomerMode] = useState<"walkin" | "search">("walkin");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Catálogo
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");

  // Carrito
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [isCourtesy, setIsCourtesy] = useState(false);
  const [courtesyReason, setCourtesyReason] = useState("");

  // Se cobra precio socio automáticamente cuando el cliente registrado elegido tiene ese rol.
  const isPartnerPrice = !!selectedCustomer?.isSocio;

  useEffect(() => {
    if (!open) return;
    setCatalogLoading(true);
    getCatalogForOrder().then(({ products, combos }) => {
      setCatalog([
        ...products.map((p) => ({ id: p.product_id, name: p.name, price: p.price, partnerPrice: p.partner_price, type: "product" as const })),
        ...combos.map((c) => ({ id: c.combo_id, name: c.name, price: c.price, partnerPrice: null, type: "combo" as const })),
      ]);
      setCatalogLoading(false);
    });

    setLocationsLoading(true);
    getLocationsForOrder().then((data) => {
      setLocations(data as LocationOption[]);
      setLocationsLoading(false);
    });
  }, [open]);

  useEffect(() => {
    if (customerMode !== "search" || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    setSearchingCustomer(true);
    const t = setTimeout(() => {
      searchCustomers(customerQuery).then((res) => {
        setCustomerResults(res);
        setSearchingCustomer(false);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [customerQuery, customerMode]);

  function resetAll() {
    setLocationId("");
    setCustomerMode("walkin");
    setCustomerQuery("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCatalogQuery("");
    setCart([]);
    setNotes("");
    setIsCourtesy(false);
    setCourtesyReason("");
  }

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.type === item.type && l.id === item.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function changeQty(item: CartLine, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l === item ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) => c.name.toLowerCase().includes(q));
  }, [catalog, catalogQuery]);

  const total = cart.reduce((acc, l) => acc + effectivePrice(l, isPartnerPrice) * l.quantity, 0);

  function handleSubmit() {
    if (!locationId) {
      toast.error("Elegí la ubicación del pedido");
      return;
    }
    if (cart.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }
    if (isCourtesy && !courtesyReason.trim()) {
      toast.error("Debes indicar el motivo de la cortesía");
      return;
    }
    startTransition(async () => {
      const result = await createManualOrder({
        profileId: customerMode === "search" ? (selectedCustomer?.id ?? null) : null,
        locationId: Number(locationId),
        notes,
        isCourtesy,
        courtesyReason,
        items: cart.map((l) => ({ type: l.type, itemId: l.id, name: l.name, price: effectivePrice(l, isPartnerPrice), quantity: l.quantity })),
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Pedido #${result.orderNumber} creado`);
        resetAll();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAll(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[90dvw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nuevo pedido</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 px-1">
          {/* Ubicación */}
          <div className="space-y-2">
            <Label>Ubicación</Label>
            <Select value={locationId} onValueChange={setLocationId} disabled={locationsLoading}>
              <SelectTrigger className="w-full">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder={locationsLoading ? "Cargando..." : "¿Dónde es el pedido?"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => {
                  const truck = Array.isArray(loc.food_truck) ? loc.food_truck[0] : loc.food_truck;
                  return (
                    <SelectItem key={loc.location_id} value={String(loc.location_id)}>
                      {loc.name}{truck?.name ? ` — ${truck.name}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={customerMode === "walkin" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => { setCustomerMode("walkin"); setSelectedCustomer(null); }}
              >
                <Store className="w-3.5 h-3.5" /> Mostrador
              </Button>
              <Button
                type="button"
                variant={customerMode === "search" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setCustomerMode("search")}
              >
                <User className="w-3.5 h-3.5" /> Cliente registrado
              </Button>
            </div>

            {customerMode === "search" && (
              <div className="space-y-2">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">
                          {selectedCustomer.first_name} {selectedCustomer.last_name ?? ""}
                        </p>
                        {selectedCustomer.isSocio && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Socio
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedCustomer(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      className="pl-8"
                    />
                    {(searchingCustomer || customerResults.length > 0) && customerQuery.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                        {searchingCustomer ? (
                          <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                          </div>
                        ) : customerResults.length === 0 ? (
                          <p className="p-3 text-xs text-muted-foreground">Sin resultados</p>
                        ) : (
                          customerResults.map((c) => (
                            <button
                              key={c.id}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                              onClick={() => { setSelectedCustomer(c); setCustomerQuery(""); setCustomerResults([]); }}
                            >
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium">{c.first_name} {c.last_name ?? ""}</p>
                                {c.isSocio && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    Socio
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Catálogo + carrito */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Productos y combos</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-56 rounded-lg border border-border">
                {catalogLoading ? (
                  <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Cargando catálogo...
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground">Sin resultados</p>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredCatalog.map((item) => {
                      const Icon = item.type === "combo" ? Layers : Package;
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          onClick={() => addToCart(item)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{item.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatCurrency(effectivePrice(item, isPartnerPrice))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label>Carrito {cart.length > 0 && `(${cart.length})`}</Label>
              <ScrollArea className="h-56 rounded-lg border border-border">
                {cart.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground">Agregá productos del catálogo</p>
                ) : (
                  <div className="divide-y divide-border">
                    {cart.map((line) => (
                      <div key={`${line.type}-${line.id}`} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{line.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(effectivePrice(line, isPartnerPrice))} c/u</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(line, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm w-5 text-center">{line.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(line, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="order-notes">Notas <span className="text-muted-foreground text-xs">(mesa, referencia, etc.)</span></Label>
            <Textarea id="order-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-lg border border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Marcar como cortesía</p>
                <p className="text-xs text-muted-foreground">El total del pedido quedará en $ 0</p>
              </div>
              <Switch checked={isCourtesy} onCheckedChange={setIsCourtesy} />
            </div>

            {isCourtesy && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="courtesy-reason">Motivo de la cortesía</Label>
                <Textarea
                  id="courtesy-reason"
                  rows={2}
                  value={courtesyReason}
                  onChange={(e) => setCourtesyReason(e.target.value)}
                  placeholder="Ej. compensación por demora"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className={cn("flex items-center border-t border-border pt-4", "sm:justify-between")}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              Total: {isCourtesy ? formatCurrency(0) : formatCurrency(total)}
            </span>
            {isPartnerPrice && !isCourtesy && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Precio socio
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || cart.length === 0}>
              {isPending ? "Creando..." : "Crear pedido"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
