"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShoppingBag, Package, Layers, Plus, Minus, MapPin, Pencil, Loader2, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { SectionHeader } from "@/components/admin/section-header";
import { CreateOrderDialog } from "@/components/admin/create-order-dialog";
import { getCatalogForOrder, updateManualOrder, deleteOrder } from "@/app/dashboard/orders-actions";
import { useSelectedTruckStore } from "@/lib/store/selected-truck";

// ============================================================
// TIPOS
// ============================================================
type Single<T> = T | T[] | null;

function one<T>(val: Single<T>): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export type OrderStatus = {
  status_order_id: string;
  name: string;
  code: string;
  sort_order: number;
};

type OrderDetailLine = {
  order_detail_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product: { product_id: number; name: string } | { product_id: number; name: string }[] | null;
  combo: { combo_id: number; name: string } | { combo_id: number; name: string }[] | null;
};

export type LocationOption = {
  location_id: number;
  name: string;
  food_truck_id: number;
  food_truck: { name: string } | { name: string }[] | null;
};

export type OrderRow = {
  profile_order_id: string;
  order_number: number;
  total: number;
  subtotal: number;
  discount_total: number;
  is_courtesy: boolean;
  courtesy_reason: string | null;
  stock_deducted: boolean;
  created_at: string;
  notes: string | null;
  status_order_id: string | null;
  location_id: number | null;
  profiles: Single<{ first_name: string | null; last_name: string | null; email: string | null }>;
  status_order: Single<OrderStatus>;
  location: Single<LocationOption>;
  order_detail: OrderDetailLine[] | null;
};

export type OrdersFilters = {
  status: string;
  q: string;
  from: string;
  to: string;
};

type CatalogItem = { id: number; name: string; price: number; type: "product" | "combo" };
type EditableLine = CatalogItem & { quantity: number };

function locationLabel(loc: LocationOption | null): string {
  if (!loc) return "—";
  const truck = Array.isArray(loc.food_truck) ? loc.food_truck[0] : loc.food_truck;
  return truck?.name ? `${loc.name} — ${truck.name}` : loc.name;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusStyle(code: string) {
  const c = code.toLowerCase();
  if (c.includes("pend")) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  if (c.includes("prep") || c.includes("progress")) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (c.includes("ready") || c.includes("listo")) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (c.includes("cancel")) return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function toEditableLines(order: OrderRow): EditableLine[] {
  return (order.order_detail ?? [])
    .map((line) => {
      const product = one(line.product);
      const combo = one(line.combo);
      if (product) {
        return {
          id: product.product_id,
          name: product.name,
          price: line.unit_price,
          quantity: line.quantity,
          type: "product" as const,
        };
      }
      if (combo) {
        return {
          id: combo.combo_id,
          name: combo.name,
          price: line.unit_price,
          quantity: line.quantity,
          type: "combo" as const,
        };
      }
      return null;
    })
    .filter((line): line is EditableLine => line !== null);
}

// ============================================================
// VISTA PRINCIPAL
// ============================================================
export function OrdersView({
  orders,
  allStatuses,
  filters,
  page,
  totalPages,
  totalCount,
  loadError,
}: {
  orders: OrderRow[];
  allStatuses: OrderStatus[];
  filters: OrdersFilters;
  page: number;
  totalPages: number;
  totalCount: number;
  loadError?: string | null;
}) {
  const router = useRouter();
  const selectedTruck = useSelectedTruckStore((s) => s.selectedTruck);

  const [q, setQ] = useState(filters.q);
  const [status, setStatus] = useState(filters.status || "all");
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  // El truck del sidebar manda: los pedidos que se ven acá son SIEMPRE los de
  // ese truck. Cuando cambia, se refleja en la URL (?truck=) para que el server filtre.
  const lastSyncedTruck = useRef(selectedTruck);
  useEffect(() => {
    if (selectedTruck === lastSyncedTruck.current) return;
    lastSyncedTruck.current = selectedTruck;
    if (selectedTruck == null) return;
    navigate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTruck]);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editIsCourtesy, setEditIsCourtesy] = useState(false);
  const [editCourtesyReason, setEditCourtesyReason] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleting] = useTransition();

  function handleDelete(orderNumber: number, profileOrderId: string) {
    setDeletingId(profileOrderId);
    startDeleting(async () => {
      const result = await deleteOrder(profileOrderId);
      setDeletingId(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Pedido #${orderNumber} eliminado`);
      router.refresh();
    });
  }

  useEffect(() => {
    if (!isEditing || !detailOrder) return;
    let cancelled = false;
    setCatalogLoading(true);
    getCatalogForOrder()
      .then(({ products, combos }) => {
        if (cancelled) return;
        setCatalog([
          ...products.map((p) => ({ id: p.product_id, name: p.name, price: p.price, type: "product" as const })),
          ...combos.map((c) => ({ id: c.combo_id, name: c.name, price: c.price, type: "combo" as const })),
        ]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditing, detailOrder]);

  const filteredCatalog = useMemo(() => {
    const qValue = catalogQuery.trim().toLowerCase();
    if (!qValue) return catalog;
    return catalog.filter((item) => item.name.toLowerCase().includes(qValue));
  }, [catalog, catalogQuery]);

  const editTotal = useMemo(
    () => editLines.reduce((acc, line) => acc + line.price * line.quantity, 0),
    [editLines],
  );

  function openDetail(order: OrderRow) {
    setDetailOrder(order);
    setIsEditing(false);
    setEditLines([]);
    setEditIsCourtesy(false);
    setEditCourtesyReason("");
    setCatalogQuery("");
    setCatalog([]);
  }

  function closeDetail() {
    setDetailOrder(null);
    setIsEditing(false);
    setEditLines([]);
    setEditNotes("");
    setEditIsCourtesy(false);
    setEditCourtesyReason("");
    setCatalogQuery("");
    setCatalog([]);
  }

  function startEdit() {
    if (!detailOrder) return;
    setEditLines(toEditableLines(detailOrder));
    setEditNotes(detailOrder.notes ?? "");
    setEditIsCourtesy(!!detailOrder.is_courtesy);
    setEditCourtesyReason(detailOrder.courtesy_reason ?? "");
    setCatalogQuery("");
    setIsEditing(true);
  }

  function addLine(item: CatalogItem) {
    setEditLines((prev) => {
      const existing = prev.find((line) => line.type === item.type && line.id === item.id);
      if (!existing) return [...prev, { ...item, quantity: 1 }];
      return prev.map((line) =>
        line.type === item.type && line.id === item.id
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      );
    });
  }

  function changeQty(item: EditableLine, delta: number) {
    setEditLines((prev) =>
      prev
        .map((line) =>
          line.type === item.type && line.id === item.id
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(item: EditableLine) {
    setEditLines((prev) => prev.filter((line) => !(line.type === item.type && line.id === item.id)));
  }

  function saveEdition() {
    if (!detailOrder) return;
    if (editLines.length === 0) {
      toast.error("El pedido debe tener al menos un item");
      return;
    }
    if (editIsCourtesy && !editCourtesyReason.trim()) {
      toast.error("Debes indicar el motivo de la cortesía");
      return;
    }

    startSaving(async () => {
      const result = await updateManualOrder({
        profileOrderId: detailOrder.profile_order_id,
        notes: editNotes,
        isCourtesy: editIsCourtesy,
        courtesyReason: editCourtesyReason,
        items: editLines.map((line) => ({
          type: line.type,
          itemId: line.id,
          name: line.name,
          price: line.price,
          quantity: line.quantity,
        })),
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(`Pedido #${result.orderNumber} actualizado`);
      setIsEditing(false);
      closeDetail();
      navigate({ page });
    });
  }

  const hasActiveFilters = !!(
    filters.q ||
    (filters.status && filters.status !== "all") ||
    filters.from ||
    filters.to
  );

  function navigate(
    overrides: Partial<{ status: string; q: string; from: string; to: string; page: number }> = {},
  ) {
    const next = { status, q, from, to, page: 1, ...overrides };
    const params = new URLSearchParams({ section: "orders" });
    if (selectedTruck) params.set("truck", String(selectedTruck));
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`/dashboard?${params.toString()}`);
  }

  function clearFilters() {
    setQ("");
    setStatus("all");
    setFrom("");
    setTo("");
    const params = new URLSearchParams({ section: "orders" });
    if (selectedTruck) params.set("truck", String(selectedTruck));
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Pedidos"
        subtitle={`${totalCount} pedido${totalCount !== 1 ? "s" : ""} ${hasActiveFilters ? "(filtrado)" : "en total"}`}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo pedido</span>
          </Button>
        }
      />

      {/* Filtros */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cliente o # pedido..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && navigate({ q })}
              className="pl-8"
            />
          </div>

          <Select value={status} onValueChange={(v) => { setStatus(v); navigate({ status: v }); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {allStatuses.map((s) => (
                <SelectItem key={s.status_order_id} value={s.status_order_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); navigate({ from: e.target.value }); }}
            placeholder="Desde"
          />

          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); navigate({ to: e.target.value }); }}
            placeholder="Hasta"
          />
        </div>

        <div className="flex items-center justify-between">
          <Button size="sm" onClick={() => navigate({ q })} className="gap-1.5">
            <Search className="w-3.5 h-3.5" /> Buscar
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{hasActiveFilters ? "Sin resultados para estos filtros" : "Sin pedidos registrados"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20"># Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 text-right">Detalle</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const profile = one(order.profiles);
                  const orderStatus = one(order.status_order);
                  const orderLocation = one(order.location);
                  const customerName = profile?.first_name
                    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
                    : profile?.email;

                  return (
                    <TableRow key={order.profile_order_id}>
                      <TableCell className="font-mono font-medium text-sm">#{order.order_number}</TableCell>
                      <TableCell>
                        {customerName ? (
                          <>
                            <p className="text-sm font-medium">{customerName}</p>
                            {profile?.email && (
                              <p className="text-xs text-muted-foreground hidden sm:block">{profile.email}</p>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                            <Store className="w-3 h-3" /> Mostrador
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {locationLabel(orderLocation)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground" suppressHydrationWarning>
                        {formatDateTime(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        <div className="flex flex-col items-end gap-1">
                          <span>{formatCurrency(order.total)}</span>
                          {order.is_courtesy && (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              Cortesía
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {orderStatus && (
                          <Badge className={`text-xs border ${getStatusStyle(orderStatus.code)}`} variant="outline">
                            {orderStatus.name}
                          </Badge>
                        )}
                        <div className="mt-1.5">
                          <OrderStatusSelect
                            profileOrderId={order.profile_order_id}
                            currentStatusId={order.status_order_id}
                            statuses={allStatuses}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(order)}>
                          Ver
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === order.profile_order_id}
                            >
                              {deletingId === order.profile_order_id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              <span className="sr-only">Eliminar pedido #{order.order_number}</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar pedido #{order.order_number}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se borra el pedido, sus líneas y su historial de estado
                                {order.stock_deducted ? ", y se devuelve el stock descontado." : "."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => handleDelete(order.order_number, order.profile_order_id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => navigate({ page: page + 1 })}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Detalle del pedido */}
      <Sheet open={!!detailOrder} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Pedido #{detailOrder?.order_number}</SheetTitle>
          </SheetHeader>
          {detailOrder && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span suppressHydrationWarning>{formatDateTime(detailOrder.created_at)}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {locationLabel(one(detailOrder.location))}
                </span>
              </div>

              {!isEditing ? (
                <>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {(detailOrder.order_detail ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3">Sin líneas de detalle registradas</p>
                    ) : (
                      detailOrder.order_detail!.map((line) => {
                        const product = one(line.product);
                        const combo = one(line.combo);
                        const Icon = combo ? Layers : Package;
                        const itemName = product?.name ?? combo?.name ?? "Ítem eliminado";

                        return (
                          <div key={line.order_detail_id} className="flex items-center justify-between gap-3 p-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {line.quantity} x {formatCurrency(line.unit_price)}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-medium shrink-0">{formatCurrency(line.line_total)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(detailOrder.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(detailOrder.total)}</span>
                  </div>

                  {detailOrder.is_courtesy && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-primary mb-1">Pedido en cortesía</p>
                      <p className="text-sm text-muted-foreground">
                        {detailOrder.courtesy_reason || "Sin motivo especificado"}
                      </p>
                    </div>
                  )}

                  {detailOrder.notes && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
                      <p className="text-sm">{detailOrder.notes}</p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full gap-2" onClick={startEdit}>
                    <Pencil className="w-3.5 h-3.5" /> Editar pedido
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid gap-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={catalogQuery}
                        onChange={(e) => setCatalogQuery(e.target.value)}
                        placeholder="Buscar producto o combo..."
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-36 rounded-lg border border-border">
                      {catalogLoading ? (
                        <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando catálogo...
                        </div>
                      ) : filteredCatalog.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">Sin resultados</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {filteredCatalog.map((item) => {
                            const Icon = item.type === "combo" ? Layers : Package;
                            return (
                              <button
                                key={`${item.type}-${item.id}`}
                                onClick={() => addLine(item)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate">{item.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{formatCurrency(item.price)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="rounded-lg border border-border divide-y divide-border">
                    {editLines.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3">Agregá al menos un item al pedido</p>
                    ) : (
                      editLines.map((line) => {
                        const Icon = line.type === "combo" ? Layers : Package;
                        return (
                          <div key={`${line.type}-${line.id}`} className="flex items-center justify-between gap-3 p-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{line.name}</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(line.price)} c/u</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => changeQty(line, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm w-5 text-center">{line.quantity}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => changeQty(line, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeLine(line)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Notas</p>
                    <Textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notas del pedido"
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Marcar como cortesía</p>
                        <p className="text-xs text-muted-foreground">El total final será $ 0</p>
                      </div>
                      <Switch checked={editIsCourtesy} onCheckedChange={setEditIsCourtesy} />
                    </div>
                    {editIsCourtesy && (
                      <Textarea
                        rows={2}
                        value={editCourtesyReason}
                        onChange={(e) => setEditCourtesyReason(e.target.value)}
                        placeholder="Motivo de la cortesía"
                      />
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal actualizado</span>
                      <span>{formatCurrency(editTotal)}</span>
                    </div>
                    {editIsCourtesy && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Descuento cortesía</span>
                        <span>- {formatCurrency(editTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-semibold">
                      <span>Total actualizado</span>
                      <span>{formatCurrency(editIsCourtesy ? 0 : editTotal)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={saveEdition} disabled={isSaving || editLines.length === 0}>
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
