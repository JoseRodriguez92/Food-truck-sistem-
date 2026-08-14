"use client";

/**
 * CocinaOrderCard
 *
 * Card de pedido para la vista Cocina, con 2 modos de swipe según la
 * pestaña — cada uno en una dirección distinta pa que no se confundan
 * (izquierda→derecha = avanzar, derecha→izquierda = deshacer):
 *
 * - `advance` (tab Entrantes, swipe izquierda→derecha): deslizar del todo
 *   dispara automático, sin click, 2 cambios de estado seguidos —
 *   "preparing" (descuenta stock, ver deduct_ingredient_stock.sql) y de
 *   una "delivered". El pedido pasa solo a la pestaña Entregadas.
 *
 * - `revert` (tab Entregadas, swipe derecha→izquierda): "Entregado" no es
 *   realmente reversible sin querer — el swipe acá NUNCA commitea
 *   directo, siempre abre un modal de confirmación. Al confirmar vuelve
 *   a "preparing" (no a pending/confirmed — el stock ya se descontó y
 *   sigue así, solo se corrige que todavía no se entregó).
 *
 * @module components/admin/cocina-order-card
 */

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Loader2, Store, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { updateOrderStatus } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
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
import type { CocinaOrder, CocinaStatus } from "@/components/admin/views/cocina-view";

const ACTIONS_WIDTH = 104;
const AXIS_THRESHOLD = 8;

export type CocinaAction =
  | { mode: "advance"; preparingStatus: CocinaStatus; deliveredStatus: CocinaStatus }
  | { mode: "revert"; targetStatus: CocinaStatus };

// advance = swipe izquierda→derecha (offset positivo, panel a la izquierda)
// revert  = swipe derecha→izquierda (offset negativo, panel a la derecha)
function directionSign(action: CocinaAction | null): 1 | -1 {
  return action?.mode === "advance" ? 1 : -1;
}

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

function OrderItems({ items }: { items: CocinaOrder["order_detail"] }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      {items.map((item) => {
        const product = one(item.product);
        const combo = one(item.combo);
        return (
          <li key={item.order_detail_id} className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-primary shrink-0">{item.quantity}×</span>
            <span className="text-lg font-semibold text-foreground leading-tight">
              {product?.name ?? combo?.name ?? "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function CocinaOrderCard({
  order,
  action,
  isOpen,
  onOpenChange,
}: {
  order: CocinaOrder;
  action: CocinaAction | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "x" | "y">("none");
  const moved = useRef(false);

  const canAct = action !== null;
  const sign = directionSign(action);
  const openOffset = sign * ACTIONS_WIDTH;
  const translate = dragging ? offset : isOpen ? openOffset : 0;

  function runAdvance(a: Extract<CocinaAction, { mode: "advance" }>) {
    startTransition(async () => {
      // 1) preparing — dispara el descuento de stock (trigger en DB)
      const step1 = await updateOrderStatus(order.profile_order_id, a.preparingStatus.status_order_id);
      if (step1?.error) {
        toast.error(step1.error);
        onOpenChange(false);
        return;
      }
      // 2) delivered — de una, sin que el usuario tenga que hacer nada más
      const step2 = await updateOrderStatus(order.profile_order_id, a.deliveredStatus.status_order_id);
      if (step2?.error) {
        toast.error(step2.error);
        onOpenChange(false);
        return;
      }
      onOpenChange(false);
      toast.success(`Pedido #${order.order_number} entregado`);
    });
  }

  function runRevert(a: Extract<CocinaAction, { mode: "revert" }>) {
    startTransition(async () => {
      const result = await updateOrderStatus(order.profile_order_id, a.targetStatus.status_order_id);
      if (result?.error) toast.error(result.error);
      else toast.success(`Pedido #${order.order_number} volvió a Entrantes`);
      setConfirmOpen(false);
      onOpenChange(false);
    });
  }

  function handleActionTap() {
    if (!action) return;
    if (action.mode === "advance") runAdvance(action);
    else setConfirmOpen(true);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Pedido en vuelo — bloquea gesto nuevo pa que no dispare 2 veces la
    // misma acción si el usuario desliza de nuevo antes de que responda.
    if (!canAct || isPending) return;
    if ((e.target as HTMLElement).closest("button")) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = "none";
    moved.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!canAct || isPending || axis.current === "y") return;

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
    const base = isOpen ? openOffset : 0;
    const next = base + dx;
    // advance (sign 1): clampa entre 0 y +ACTIONS_WIDTH.
    // revert  (sign -1): clampa entre -ACTIONS_WIDTH y 0.
    setOffset(sign > 0 ? Math.max(0, Math.min(ACTIONS_WIDTH, next)) : Math.max(-ACTIONS_WIDTH, Math.min(0, next)));
  }

  function handlePointerUp() {
    if (isPending) {
      axis.current = "none";
      setDragging(false);
      return;
    }
    if (axis.current === "x") {
      // "advance" con swipe completo se ejecuta solo, sin click. "revert"
      // nunca — por más que deslice hasta el final, solo revela el botón,
      // que abre el modal de confirmación. Nunca commitea directo.
      if (action && action.mode === "advance" && offset >= ACTIONS_WIDTH) {
        setDragging(false);
        setOffset(0);
        axis.current = "none";
        runAdvance(action);
        return;
      }
      onOpenChange(Math.abs(offset) > ACTIONS_WIDTH / 2);
    }
    axis.current = "none";
    setDragging(false);
  }

  const profile = one(order.profiles);
  const location = one(order.location);
  const truck = location ? one(location.food_truck) : null;
  const customerName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : profile?.email;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* Acción única revelada por el swipe — a la izquierda si es "advance"
          (se deslizó hacia la derecha), a la derecha si es "revert". */}
      {action && (
        <div
          className={cn("absolute inset-y-0", action.mode === "advance" ? "left-0" : "right-0")}
          style={{ width: ACTIONS_WIDTH }}
        >
          {action.mode === "advance" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleActionTap}
              className="flex h-full w-full flex-col items-center justify-center gap-1 bg-green-600 text-xs font-medium text-white transition-colors active:bg-green-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Entregado
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handleActionTap}
              className="flex h-full w-full flex-col items-center justify-center gap-1 bg-amber-500 text-xs font-medium text-white transition-colors active:bg-amber-600 disabled:opacity-60"
            >
              <Undo2 className="size-4" />
              Deshacer
            </button>
          )}
        </div>
      )}

      {/* Cuerpo deslizable */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if (moved.current) return;
          if (isOpen) onOpenChange(false);
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
              {canAct && action.mode === "advance" && (
                <ChevronRight
                  className={cn(
                    "size-3.5 text-muted-foreground/40 transition-opacity shrink-0",
                    isOpen && "opacity-0",
                  )}
                />
              )}
              <span className="font-mono text-sm font-medium text-muted-foreground">
                #{order.order_number}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70"
                suppressHydrationWarning
              >
                <Clock className="size-3" /> {formatTime(order.created_at)}
              </span>
              {canAct && action.mode === "revert" && (
                <ChevronLeft
                  className={cn(
                    "size-3.5 text-muted-foreground/40 transition-opacity ml-auto",
                    isOpen && "opacity-0",
                  )}
                />
              )}
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
        </div>

        <OrderItems items={order.order_detail} />

        {order.notes && (
          <p className="mt-3 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground">
            {order.notes}
          </p>
        )}

        {/* Overlay de carga — bloquea toque/swipe mientras la actualización
            está en vuelo, así queda claro que ya se disparó y no hay que
            repetir el gesto. */}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[1px]">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {action && action.mode === "revert" && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Devolver pedido #{order.order_number} a Entrantes?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuelve a la cola de cocina como "en preparación". El stock ya descontado no se
                devuelve solo — si fue un error de inventario, ajustalo a mano desde Ingredientes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                className="bg-amber-500 text-white hover:bg-amber-600"
                onClick={() => runRevert(action)}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Sí, devolver"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
