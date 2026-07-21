"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Loader2, Trophy, Users, Gift, BarChart3, ShoppingBag, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  getOrdersReport,
  type OrdersReport,
  type OrdersReportFilters,
  type OrdersReportItem,
  type OrdersReportCategoryItem,
} from "@/app/dashboard/orders-actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          : "rounded-xl border border-border px-4 py-3"
      }
    >
      <p
        className={
          highlight
            ? "text-xs text-primary/80 flex items-center gap-1.5"
            : "text-xs text-muted-foreground flex items-center gap-1.5"
        }
      >
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function BreakdownTable({
  emptyLabel,
  nameLabel,
  rows,
  renderName,
}: {
  emptyLabel: string;
  nameLabel: string;
  rows: (OrdersReportItem | OrdersReportCategoryItem)[];
  renderName?: (row: OrdersReportItem | OrdersReportCategoryItem) => ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border border-border rounded-lg">{emptyLabel}</p>
    );
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>{nameLabel}</TableHead>
            <TableHead className="text-right w-20">Clientes</TableHead>
            <TableHead className="text-right w-20">Cortesía</TableHead>
            <TableHead className="text-right w-20">Socio</TableHead>
            <TableHead className="text-right w-20">Total</TableHead>
            <TableHead className="text-right w-28">Ingresos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.key}>
              <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
              <TableCell className="text-sm font-medium">{renderName ? renderName(r) : r.name}</TableCell>
              <TableCell className="text-right font-mono text-sm text-muted-foreground">
                {r.regularQuantity}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {r.courtesyQuantity > 0 ? (
                  <span className="text-primary">{r.courtesyQuantity}</span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {r.socioQuantity > 0 ? (
                  <span className="text-blue-400">{r.socioQuantity}</span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold">{r.quantity}</TableCell>
              <TableCell className="text-right text-sm">{formatCurrency(r.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="text-sm font-semibold">
              Total
            </TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold">
              {rows.reduce((acc, r) => acc + r.regularQuantity, 0)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold text-primary">
              {rows.reduce((acc, r) => acc + r.courtesyQuantity, 0)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold text-blue-400">
              {rows.reduce((acc, r) => acc + r.socioQuantity, 0)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold">
              {rows.reduce((acc, r) => acc + r.quantity, 0)}
            </TableCell>
            <TableCell className="text-right text-sm font-semibold">
              {formatCurrency(rows.reduce((acc, r) => acc + r.revenue, 0))}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export function OrdersReportDialog({
  open,
  onOpenChange,
  filters,
  truckId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: OrdersReportFilters;
  truckId: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OrdersReport | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getOrdersReport(filters, truckId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90dvw] sm:max-w-[90dvw] max-h-[88dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Reporte de ventas
          </DialogTitle>
        </DialogHeader>

        {loading || !report ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando reporte...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Resumen — fila de stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={ShoppingBag} label="Pedidos (sin cancelados)" value={String(report.totalOrders)} />
              <StatCard icon={Wallet} label="Total vendido (todo incluido)" value={formatCurrency(report.totalRevenue)} />
              <StatCard
                icon={Trophy}
                label={`Sin socios ni cortesías · ${report.regularOrders} ped.`}
                value={formatCurrency(report.regularRevenue)}
                highlight
              />
              <StatCard
                icon={Gift}
                label={`Cortesías · ${report.courtesy.count}`}
                value={formatCurrency(report.courtesy.value)}
              />
            </div>

            {/* Ranking + sidebar */}
            <div className="grid lg:grid-cols-3 gap-5">
              {/* Ranking por categoría + por producto */}
              <div className="lg:col-span-2 space-y-5">
                <div>
                  <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Por categoría
                  </p>
                  <BreakdownTable
                    emptyLabel="Sin ventas en este rango"
                    nameLabel="Categoría"
                    rows={report.categories}
                  />
                </div>

                <div>
                  <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Productos vendidos (mayor a menor)
                  </p>
                  <BreakdownTable
                    emptyLabel="Sin productos vendidos en este rango"
                    nameLabel="Producto"
                    rows={report.products}
                    renderName={(r) => (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{r.name}</span>
                        {"type" in r && r.type === "combo" && (
                          <Badge variant="outline" className="text-[10px]">
                            combo
                          </Badge>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Sidebar: socios + cortesías */}
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 px-4 py-3">
                  <p className="text-xs font-bold text-blue-400/90 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Consumo de socios
                  </p>
                  {report.socios.count === 0 ? (
                    <p className="text-sm text-muted-foreground">Ningún socio consumió en este rango.</p>
                  ) : (
                    <>
                      <p className="text-sm mb-2">
                        <span className="font-semibold">{report.socios.count}</span> pedido
                        {report.socios.count !== 1 ? "s" : ""} ·{" "}
                        <span className="font-semibold">{formatCurrency(report.socios.value)}</span> cobrado
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.socios.products.map((p) => (
                          <Badge key={p.key} variant="outline" className="text-xs">
                            {p.name} × {p.quantity}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
                  <p className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" /> Cortesías
                  </p>
                  {report.courtesy.count === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin cortesías en este rango.</p>
                  ) : (
                    <>
                      <p className="text-sm mb-2">
                        <span className="font-semibold">{report.courtesy.count}</span> cortesía
                        {report.courtesy.count !== 1 ? "s" : ""} · valor regalado{" "}
                        <span className="font-semibold">{formatCurrency(report.courtesy.value)}</span>
                      </p>
                      <div className="space-y-1.5">
                        {report.courtesy.orders.map((c, i) => (
                          <div
                            key={`${c.orderNumber}-${i}`}
                            className="flex items-start justify-between gap-2 rounded-md bg-background/40 px-2 py-1.5 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-muted-foreground">#{c.orderNumber}</span>{" "}
                              <span className="text-foreground">{c.reason || "Sin motivo especificado"}</span>
                            </div>
                            <span className="shrink-0 font-medium">{formatCurrency(c.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
