"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShoppingBag, Package, Layers, Plus, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { SectionHeader } from "@/components/admin/section-header";
import { CreateOrderDialog } from "@/components/admin/create-order-dialog";

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
  food_truck: { name: string } | { name: string }[] | null;
};

export type OrderRow = {
  profile_order_id: string;
  order_number: number;
  total: number;
  subtotal: number;
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
  location: string;
  q: string;
  from: string;
  to: string;
};

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

// ============================================================
// VISTA PRINCIPAL
// ============================================================
export function OrdersView({
  orders,
  allStatuses,
  allLocations,
  filters,
  page,
  totalPages,
  totalCount,
}: {
  orders: OrderRow[];
  allStatuses: OrderStatus[];
  allLocations: LocationOption[];
  filters: OrdersFilters;
  page: number;
  totalPages: number;
  totalCount: number;
}) {
  const router = useRouter();

  const [q, setQ] = useState(filters.q);
  const [status, setStatus] = useState(filters.status || "all");
  const [location, setLocation] = useState(filters.location || "all");
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const hasActiveFilters = !!(
    filters.q ||
    (filters.status && filters.status !== "all") ||
    (filters.location && filters.location !== "all") ||
    filters.from ||
    filters.to
  );

  function navigate(
    overrides: Partial<{ status: string; location: string; q: string; from: string; to: string; page: number }> = {},
  ) {
    const next = { status, location, q, from, to, page: 1, ...overrides };
    const params = new URLSearchParams({ section: "orders" });
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.location && next.location !== "all") params.set("location", next.location);
    if (next.q) params.set("q", next.q);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`/dashboard?${params.toString()}`);
  }

  function clearFilters() {
    setQ("");
    setStatus("all");
    setLocation("all");
    setFrom("");
    setTo("");
    router.push("/dashboard?section=orders");
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

          <Select value={location} onValueChange={(v) => { setLocation(v); navigate({ location: v }); }}>
            <SelectTrigger className="w-full">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              {allLocations.map((l) => (
                <SelectItem key={l.location_id} value={String(l.location_id)}>
                  {locationLabel(l)}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const profile = one(order.profiles);
                  const orderStatus = one(order.status_order);
                  const orderLocation = one(order.location);
                  const customerName = profile?.first_name
                    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
                    : (profile?.email ?? "—");

                  return (
                    <TableRow key={order.profile_order_id}>
                      <TableCell className="font-mono font-medium text-sm">#{order.order_number}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{customerName}</p>
                        {profile?.email && (
                          <p className="text-xs text-muted-foreground hidden sm:block">{profile.email}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {locationLabel(orderLocation)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDateTime(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">{formatCurrency(order.total)}</TableCell>
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
                        <Button variant="ghost" size="sm" onClick={() => setDetailOrder(order)}>
                          Ver
                        </Button>
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
      <Sheet open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Pedido #{detailOrder?.order_number}</SheetTitle>
          </SheetHeader>
          {detailOrder && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatDateTime(detailOrder.created_at)}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {locationLabel(one(detailOrder.location))}
                </span>
              </div>

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

              {detailOrder.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{detailOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
