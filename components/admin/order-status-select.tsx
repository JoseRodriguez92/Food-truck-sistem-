"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/app/admin/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOrderStatusStyle } from "@/lib/order-status";
import { PAYMENT_METHODS } from "@/lib/payment-method";

interface StatusOption {
  status_order_id: string;
  name: string;
  code: string;
}

interface Props {
  profileOrderId: string;
  currentStatusId: string | null;
  currentPaymentMethod?: string | null;
  statuses: StatusOption[];
}

export function OrderStatusSelect({
  profileOrderId,
  currentStatusId,
  currentPaymentMethod,
  statuses,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const current = statuses.find((s) => s.status_order_id === currentStatusId);
  const style = getOrderStatusStyle(current?.code ?? "");

  // Un pedido cancelado es terminal: ya se devolvió el stock y se borró su
  // conteo de producción. Reactivarlo volvería a descontar todo de nuevo, así
  // que el estado queda bloqueado.
  const isCancelled = current?.code === "cancelled";

  function commit(statusOrderId: string, paymentMethod?: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(profileOrderId, statusOrderId, paymentMethod);
      if (result?.error) {
        toast.error(result.error);
      } else {
        const newStatus = statuses.find((s) => s.status_order_id === statusOrderId);
        toast.success(`Estado actualizado a "${newStatus?.name}"`);
      }
    });
  }

  function handleChange(statusOrderId: string) {
    const target = statuses.find((s) => s.status_order_id === statusOrderId);
    if (target?.code === "confirmed") {
      // Pago manual — hace falta saber el medio antes de marcar como pagado.
      setPendingStatusId(statusOrderId);
      return;
    }
    commit(statusOrderId);
  }

  // Cancelado: badge fijo, sin desplegable
  if (isCancelled) {
    return (
      <span
        title="Un pedido cancelado no se puede reactivar"
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
          style.badge,
        )}
      >
        <Lock className="size-3" />
        {current?.name ?? "Cancelada"}
      </span>
    );
  }

  return (
    <>
      <Select
        value={currentStatusId ?? ""}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger
          className={cn(
            "h-7 w-auto min-w-[8.5rem] rounded-full px-2.5 text-xs font-medium shadow-none",
            style.badge,
          )}
        >
          <SelectValue placeholder="Sin estado" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.status_order_id} value={s.status_order_id} className="text-xs">
              <span className={cn("size-1.5 rounded-full", getOrderStatusStyle(s.code).dot)} />
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={!!pendingStatusId} onOpenChange={(o) => !o && setPendingStatusId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Con qué medio se pagó?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <Button
                key={m.value}
                type="button"
                variant={currentPaymentMethod === m.value ? "default" : "outline"}
                disabled={isPending}
                onClick={() => {
                  if (pendingStatusId) commit(pendingStatusId, m.value);
                  setPendingStatusId(null);
                }}
              >
                {m.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingStatusId(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
