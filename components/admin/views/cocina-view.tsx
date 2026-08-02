"use client";

import { useMemo, useState } from "react";
import { ChefHat, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CocinaOrderCard, type CocinaAction } from "@/components/admin/cocina-order-card";
import { cn } from "@/lib/utils";
import { useCocinaAnnouncer } from "@/hooks/use-cocina-announcer";

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

// Estados reales en status_order: pending, confirmed, preparing, ready,
// on_the_way, delivered, cancelled. Cocina solo distingue 2 momentos:
// "entrante" (todavía no se entregó) y "entregada". El paso por
// "preparing" (que descuenta inventario) pasa solo, automático, al
// deslizar — no se muestra como estado propio en la UI de Cocina.
const ENTRANTE_CODES = new Set(["pending", "confirmed", "preparing"]);

function statusCode(order: CocinaOrder): string | null {
  const status = Array.isArray(order.status_order) ? order.status_order[0] : order.status_order;
  return status?.code ?? null;
}

function CocinaOrderList({
  orders,
  action,
  hint,
  sortOrder,
  emptyLabel,
}: {
  orders: CocinaOrder[];
  action: CocinaAction | null;
  hint: string | null;
  sortOrder: "asc" | "desc";
  emptyLabel: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = [...orders].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === "asc" ? diff : -diff;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-64 rounded-xl border border-dashed border-border text-muted-foreground">
        <ChefHat className="w-8 h-8" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  const isAdvance = action?.mode === "advance";

  return (
    <div className="flex flex-col gap-2.5">
      {hint && (
        <p
          className={cn(
            "flex items-center gap-1 text-[11px] text-muted-foreground/70",
            isAdvance ? "justify-start" : "justify-end",
          )}
        >
          {isAdvance ? (
            <>
              {hint} <ChevronRight className="size-3" />
            </>
          ) : (
            <>
              <ChevronLeft className="size-3" /> {hint}
            </>
          )}
        </p>
      )}
      {sorted.map((order) => (
        <CocinaOrderCard
          key={order.profile_order_id}
          order={order}
          action={action}
          isOpen={openId === order.profile_order_id}
          onOpenChange={(open) => setOpenId(open ? order.profile_order_id : null)}
        />
      ))}
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
  useCocinaAnnouncer(orders);

  const preparingStatus = useMemo(() => allStatuses.find((s) => s.code === "preparing") ?? null, [allStatuses]);
  const deliveredStatus = useMemo(() => allStatuses.find((s) => s.code === "delivered") ?? null, [allStatuses]);

  const entrantes = useMemo(() => orders.filter((o) => ENTRANTE_CODES.has(statusCode(o) ?? "")), [orders]);
  const entregadas = useMemo(() => orders.filter((o) => statusCode(o) === "delivered"), [orders]);

  const advanceAction: CocinaAction | null =
    preparingStatus && deliveredStatus ? { mode: "advance", preparingStatus, deliveredStatus } : null;
  const revertAction: CocinaAction | null = preparingStatus ? { mode: "revert", targetStatus: preparingStatus } : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Tabs defaultValue="entrantes">
        <TabsList className="w-full">
          <TabsTrigger value="entrantes" className="flex-1">
            Entrantes ({entrantes.length})
          </TabsTrigger>
          <TabsTrigger value="entregadas" className="flex-1">
            Entregadas ({entregadas.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="entrantes">
          <CocinaOrderList
            orders={entrantes}
            action={advanceAction}
            hint="Deslizá a la derecha pa marcar entregado"
            sortOrder="asc"
            emptyLabel="No hay pedidos entrantes"
          />
        </TabsContent>
        <TabsContent value="entregadas">
          <CocinaOrderList
            orders={entregadas}
            action={revertAction}
            hint="Deslizá a la izquierda pa deshacer"
            sortOrder="desc"
            emptyLabel="Todavía no entregaste nada hoy"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
