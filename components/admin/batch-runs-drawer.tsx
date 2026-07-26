"use client";

/**
 * BatchRunsDrawer
 *
 * Historial de producción de un lote: qué tandas se abrieron, cuántas
 * unidades se vendieron en cada una, y qué ventas están esperando sin
 * tanda asignada.
 *
 * Sin esto, lo único visible era el contador de la tanda abierta — las
 * ventas huérfanas (vendidas antes de acordarse de producir) y el
 * rendimiento de tandas anteriores quedaban solo en la base de datos.
 *
 * @module components/admin/batch-runs-drawer
 */

import { AlertTriangle, Clock, Factory, PackageCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Batch, ProductionRun, PendingOutput } from "@/components/admin/views/batches-view";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(from: string, to: string | null) {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function BatchRunsDrawer({
  batch,
  runs,
  pendingOutputs,
  open,
  onOpenChange,
}: {
  batch: Batch | null;
  runs: ProductionRun[];
  pendingOutputs: PendingOutput[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!batch) return null;

  const batchRuns = runs.filter((r) => r.production_batch_id === batch.production_batch_id);
  const pending = pendingOutputs.filter(
    (o) => o.production_batch_id === batch.production_batch_id,
  );
  const pendingTotal = pending.reduce((acc, o) => acc + Number(o.quantity), 0);

  const closedRuns = batchRuns.filter((r) => !r.is_open);
  const totalClosed = closedRuns.reduce((acc, r) => acc + Number(r.units_sold), 0);
  const promedio = closedRuns.length > 0 ? Math.round(totalClosed / closedRuns.length) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-base flex items-center gap-2">
            <Factory className="w-4 h-4 text-primary" /> Producciones
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{batch.name}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Ventas esperando tanda */}
          {pending.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5 text-primary">
                <AlertTriangle className="w-3.5 h-3.5" />
                {pendingTotal} unidad{pendingTotal !== 1 ? "es" : ""} esperando producción
              </p>
              <p className="text-xs text-muted-foreground">
                Se vendieron sin una tanda abierta. Se van a sumar solas a la próxima producción.
              </p>
              <div className="flex flex-col gap-1 pt-1">
                {pending.slice(0, 6).map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate">{o.product?.name ?? "—"}</span>
                    <span className="text-muted-foreground font-mono shrink-0 ml-2">
                      {o.quantity} · {formatDateTime(o.created_at)}
                    </span>
                  </div>
                ))}
                {pending.length > 6 && (
                  <span className="text-xs text-muted-foreground">
                    +{pending.length - 6} más
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Rendimiento promedio */}
          {promedio !== null && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Promedio por tanda cerrada</p>
              <p className="text-2xl font-semibold">
                {promedio} <span className="text-sm font-normal text-muted-foreground">unidades</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                sobre {closedRuns.length} producci{closedRuns.length !== 1 ? "ones" : "ón"}
              </p>
            </div>
          )}

          {/* Historial */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Historial
            </p>

            {batchRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <Factory className="w-8 h-8 opacity-20" />
                <p className="text-sm text-center">
                  Todavía no se produjo este lote
                </p>
              </div>
            ) : (
              batchRuns.map((run) => (
                <div
                  key={run.production_run_id}
                  className={cn(
                    "rounded-xl border p-3 space-y-2",
                    run.is_open ? "border-emerald-500/30 bg-emerald-500/5" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    {run.is_open ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs"
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Abierta
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground">
                        <PackageCheck className="w-3 h-3" /> Cerrada
                      </Badge>
                    )}
                    <span className="text-lg font-semibold">
                      {run.units_sold}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        vendida{Number(run.units_sold) !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(run.opened_at)}
                    </span>
                    <span>{durationLabel(run.opened_at, run.closed_at)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{run.truck_name ?? "—"}</span>
                    <span>
                      {run.orders_count} pedido{Number(run.orders_count) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
