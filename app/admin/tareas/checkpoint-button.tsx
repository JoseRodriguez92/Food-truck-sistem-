"use client";

import { useTransition } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { sendCheckpointReminders } from "@/app/admin/tareas/actions";

export function CheckpointButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendCheckpointReminders();
      if (result.sent === 0 && result.skipped === 0 && result.errors.length === 0) {
        toast.info("No hay checkpoints para hoy");
      } else if (result.errors.length > 0) {
        toast.error(`${result.errors.length} error(es) al enviar`);
      } else {
        toast.success(
          `${result.sent} recordatorio${result.sent !== 1 ? "s" : ""} enviado${result.sent !== 1 ? "s" : ""}` +
          (result.skipped > 0 ? ` · ${result.skipped} sin email` : "")
        );
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
    >
      <Bell className="w-3.5 h-3.5" />
      {pending ? "Enviando..." : "Revisar checkpoints"}
    </button>
  );
}
