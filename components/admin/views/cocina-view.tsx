"use client";

import { ChefHat, Store, Clock } from "lucide-react";
import { SectionHeader } from "@/components/admin/section-header";
import { OrderStatusSelect } from "@/components/admin/order-status-select";

type Single<T> = T | T[] | null;

function one<T>(val: Single<T>): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type CocinaStatus = {
  status_order_id: string;
  name: string;
  code: string;
  sort_order: number;
};

type CocinaOrderItem = {
  order_detail_id: string;
  quantity: number;
  product: { product_id: number; name: string } | { product_id: number; name: string }[] | null;
  combo: { combo_id: number; name: string } | { combo_id: number; name: string }[] | null;
};

export type CocinaOrder = {
  profile_order_id: string;
  order_number: number;
  created_at: string;
  notes: string | null;
  status_order_id: string | null;
  customer_alias: string | null;
  profiles:
    | { first_name: string | null; last_name: string | null; email: string | null }
    | { first_name: string | null; last_name: string | null; email: string | null }[]
    | null;
  status_order: CocinaStatus | CocinaStatus[] | null;
  location:
    | { name: string; food_truck: { name: string } | { name: string }[] | null }
    | { name: string; food_truck: { name: string } | { name: string }[] | null }[]
    | null;
  order_detail: CocinaOrderItem[] | null;
};

function OrderItems({ items }: { items: CocinaOrderItem[] | null }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
      {items.map((item) => {
        const product = one(item.product);
        const combo = one(item.combo);
        return (
          <li key={item.order_detail_id} className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-primary shrink-0">{item.quantity}×</span>
            <span className="text-foreground">{product?.name ?? combo?.name ?? "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}

function OrderCard({ order, allStatuses }: { order: CocinaOrder; allStatuses: CocinaStatus[] }) {
  const profile = one(order.profiles);
  const location = one(order.location);
  const truck = location ? one(location.food_truck) : null;
  const customerName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : profile?.email;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-muted-foreground">
              #{order.order_number}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70" suppressHydrationWarning>
              <Clock className="size-3" /> {formatTime(order.created_at)}
            </span>
          </div>

          {customerName ? (
            <p className="mt-1 truncate text-sm font-semibold">{customerName}</p>
          ) : order.customer_alias ? (
            <p className="mt-1 truncate text-sm font-semibold">{order.customer_alias}</p>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Store className="size-3" /> Mostrador
            </span>
          )}

          {location && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {truck?.name ? `${location.name} — ${truck.name}` : location.name}
            </p>
          )}
        </div>

        <OrderStatusSelect
          profileOrderId={order.profile_order_id}
          currentStatusId={order.status_order_id}
          statuses={allStatuses}
        />
      </div>

      <OrderItems items={order.order_detail} />

      {order.notes && (
        <p className="mt-3 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          {order.notes}
        </p>
      )}
    </div>
  );
}

export function CocinaView({
  orders,
  allStatuses,
}: {
  orders: CocinaOrder[];
  allStatuses: CocinaStatus[];
}) {
  // Cola de cocina: el pedido más viejo primero (llegó primero, se hace primero).
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader title="Cocina" subtitle={`${orders.length} pedido(s) de hoy`} />

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 h-64 rounded-xl border border-dashed border-border text-muted-foreground">
          <ChefHat className="w-8 h-8" />
          <p className="text-sm">No hay pedidos hoy todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((order) => (
            <OrderCard key={order.profile_order_id} order={order} allStatuses={allStatuses} />
          ))}
        </div>
      )}
    </div>
  );
}
