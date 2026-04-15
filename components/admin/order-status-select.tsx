"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/app/admin/actions";
import { toast } from "sonner";

interface StatusOption {
  status_order_id: string;
  name: string;
  code: string;
}

interface Props {
  profileOrderId: string;
  currentStatusId: string | null;
  statuses: StatusOption[];
}

export function OrderStatusSelect({
  profileOrderId,
  currentStatusId,
  statuses,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleChange(statusOrderId: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(profileOrderId, statusOrderId);
      if (result?.error) {
        toast.error("Error al actualizar estado");
      } else {
        const newStatus = statuses.find((s) => s.status_order_id === statusOrderId);
        toast.success(`Estado actualizado a "${newStatus?.name}"`);
      }
    });
  }

  return (
    <Select
      value={currentStatusId ?? ""}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-8 text-xs w-36">
        <SelectValue placeholder="Sin estado" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s.status_order_id} value={s.status_order_id} className="text-xs">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
