"use client";

/**
 * OrderCards
 *
 * Vista mobile del listado de pedidos (`/dashboard?section=orders`).
 * Reemplaza a la tabla por debajo de `md`, donde la tabla se desborda
 * horizontalmente y obliga a scrollear de lado para ver el total y el estado.
 *
 * Cada pedido es una card deslizable: arrastrando hacia la izquierda se
 * revelan las acciones (Ver detalle / Eliminar), patrón tipo Gmail/iOS.
 * Solo una card queda abierta a la vez.
 *
 * El gesto se implementa con Pointer Events nativos (sin dependencias):
 * - `touch-action: pan-y` deja el scroll vertical intacto.
 * - El eje se decide en el primer movimiento (`|dx| > |dy|`), así un scroll
 *   vertical nunca abre la card por accidente.
 * - No se inicia drag si el gesto arranca sobre un control interactivo
 *   (el `Select` de estado, botones), para no romperlos.
 *
 * @module components/admin/order-cards
 */

import { useRef, useState } from "react";
import { ChevronLeft, Eye, Loader2, ShoppingBag, Store, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { cn } from "@/lib/utils";
import { getOrderStatusStyle } from "@/lib/order-status";
import type { OrderRow, OrderStatus } from "@/components/admin/views/orders-view";

/** Ancho del panel de acciones que se revela al deslizar (2 botones). */
const ACTIONS_WIDTH = 132;
/** Píxeles de movimiento antes de decidir si el gesto es horizontal o vertical. */
const AXIS_THRESHOLD = 8;

type Single<T> = T | T[] | null;

function one<T>(val: Single<T>): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// CARD INDIVIDUAL
// ============================================================
function OrderCard({
  order,
  allStatuses,
  isOpen,
  onOpenChange,
  onView,
  onDelete,
  isDeleting,
}: {
  order: OrderRow;
  allStatuses: OrderStatus[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onView: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "x" | "y">("none");
  const moved = useRef(false);

  const translate = dragging ? offset : isOpen ? -ACTIONS_WIDTH : 0;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // No secuestrar el gesto si arranca sobre un control interactivo
    if ((e.target as HTMLElement).closest("button,[role='combobox'],input,a,select")) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = "none";
    moved.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (axis.current === "y") return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (axis.current === "none") {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        axis.current = "y";
        return;
      }
      axis.current = "x";
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    moved.current = true;
    const base = isOpen ? -ACTIONS_WIDTH : 0;
    setOffset(Math.max(-ACTIONS_WIDTH, Math.min(0, base + dx)));
  }

  function handlePointerUp() {
    if (axis.current === "x") {
      onOpenChange(offset < -ACTIONS_WIDTH / 2);
    }
    axis.current = "none";
    setDragging(false);
  }

  const profile = one(order.profiles);
  const customerName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : profile?.email;

  const statusCode = allStatuses.find((s) => s.status_order_id === order.status_order_id)?.code ?? "";
  const accent = getOrderStatusStyle(statusCode).accent;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card border-l-4", accent)}>
      {/* Acciones reveladas por el swipe */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_WIDTH }}>
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onView();
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-secondary text-xs font-medium text-foreground transition-colors active:bg-secondary/80"
        >
          <Eye className="size-4" />
          Ver
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => setConfirmOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-xs font-medium text-white transition-colors active:bg-destructive/90 disabled:opacity-60"
        >
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Eliminar
        </button>
      </div>

      {/* Cuerpo deslizable */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => {
          // Un tap sobre el select de estado no debe abrir el detalle
          if ((e.target as HTMLElement).closest("button,[role='combobox'],input,a,select")) return;
          if (moved.current) return;
          if (isOpen) {
            onOpenChange(false);
            return;
          }
          onView();
        }}
        style={{ transform: `translate3d(${translate}px, 0, 0)`, touchAction: "pan-y" }}
        className={cn(
          "relative bg-card px-4 py-3.5 select-none",
          !dragging && "transition-transform duration-300",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-muted-foreground">
                #{order.order_number}
              </span>
              {order.is_courtesy && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  Cortesía
                </Badge>
              )}
            </div>

            {customerName ? (
              <p className="mt-1 truncate text-sm font-semibold">{customerName}</p>
            ) : order.customer_alias ? (
              <>
                <p className="mt-1 truncate text-sm font-semibold">{order.customer_alias}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Store className="size-2.5" /> Mostrador
                </span>
              </>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Store className="size-3" /> Mostrador
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-base font-semibold">{formatCurrency(order.total)}</span>
            <ChevronLeft
              className={cn(
                "size-3.5 text-muted-foreground/40 transition-opacity",
                isOpen && "opacity-0",
              )}
            />
          </div>
        </div>

        {order.notes && (
          <p className="mt-2 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground">
            {order.notes}
          </p>
        )}

        <div className="mt-3">
          <OrderStatusSelect
            profileOrderId={order.profile_order_id}
            currentStatusId={order.status_order_id}
            currentPaymentMethod={order.payment_method}
            statuses={allStatuses}
          />
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// LISTA
// ============================================================
export function OrderCards({
  orders,
  allStatuses,
  onView,
  onDelete,
  deletingId,
  emptyLabel,
}: {
  orders: OrderRow[];
  allStatuses: OrderStatus[];
  onView: (order: OrderRow) => void;
  onDelete: (orderNumber: number, profileOrderId: string) => void;
  deletingId: string | null;
  emptyLabel: string;
}) {
  // Solo una card abierta a la vez
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border py-16 text-muted-foreground">
        <ShoppingBag className="mb-3 size-10 opacity-30" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground/70">
        <ChevronLeft className="size-3" /> Deslizá una tarjeta para ver acciones
      </p>

      {orders.map((order) => (
        <OrderCard
          key={order.profile_order_id}
          order={order}
          allStatuses={allStatuses}
          isOpen={openId === order.profile_order_id}
          onOpenChange={(open) => setOpenId(open ? order.profile_order_id : null)}
          onView={() => onView(order)}
          onDelete={() => onDelete(order.order_number, order.profile_order_id)}
          isDeleting={deletingId === order.profile_order_id}
        />
      ))}
    </div>
  );
}
