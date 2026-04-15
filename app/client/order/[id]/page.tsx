import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckCircle, XCircle, Clock, Package, Layers, ChevronRight } from "lucide-react";
import Link from "next/link";
import { OrderStatusUpdater } from "./status-updater";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

function StatusBadge({ code }: { code: string }) {
  const map: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    pending:    { label: "Pendiente de pago", icon: Clock,       className: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
    confirmed:  { label: "Pago confirmado",   icon: CheckCircle, className: "text-green-500 bg-green-500/10 border-green-500/20" },
    preparing:  { label: "En preparación",    icon: Clock,       className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    ready:      { label: "Lista para recoger",icon: CheckCircle, className: "text-primary bg-primary/10 border-primary/20" },
    on_the_way: { label: "En camino",         icon: ChevronRight,className: "text-primary bg-primary/10 border-primary/20" },
    delivered:  { label: "Entregada",         icon: CheckCircle, className: "text-green-500 bg-green-500/10 border-green-500/20" },
    cancelled:  { label: "Cancelada",         icon: XCircle,     className: "text-destructive bg-destructive/10 border-destructive/20" },
  };
  const cfg = map[code] ?? map["pending"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${cfg.className}`}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function OrderPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; payment_id?: string }>;
}) {
  const { id }                      = await params;
  const { status, payment_id }      = await searchParams;
  const supabase                    = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("profile_has_order")
    .select(`
      profile_order_id, order_number, subtotal, total, notes, created_at,
      status_order(code, name),
      order_detail(
        order_detail_id, quantity, unit_price, line_total,
        product_id, combo_id
      )
    `)
    .eq("profile_order_id", id)
    .eq("profile_id", user.id)
    .single();

  if (!order) redirect("/client/menu");

  const statusOrderRaw = order.status_order as unknown as { code: string; name: string } | { code: string; name: string }[] | null;
  const statusOrder    = Array.isArray(statusOrderRaw) ? statusOrderRaw[0] : statusOrderRaw;
  const statusCode     = statusOrder?.code ?? "pending";
  const details    = (order.order_detail as {
    order_detail_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product_id: number | null;
    combo_id: number | null;
  }[]) ?? [];

  const isSuccess  = statusCode === "confirmed" || statusCode === "preparing" || statusCode === "ready" || statusCode === "delivered";
  const isCancelled = statusCode === "cancelled";

  return (
    <div className="min-h-screen bg-background">
      {/* Si viene de MP con payment_id y status pending → verificar en background */}
      {status === "approved" && payment_id && statusCode === "pending" && (
        <OrderStatusUpdater profileOrderId={id} paymentId={payment_id} />
      )}

      {/* Hero status */}
      <div className={`relative overflow-hidden px-4 py-12 flex flex-col items-center text-center gap-4 ${
        isCancelled ? "bg-destructive/5" : isSuccess ? "bg-green-500/5" : "bg-primary/5"
      }`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 ${
            isCancelled ? "bg-destructive" : isSuccess ? "bg-green-500" : "bg-primary"
          }`} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            isCancelled ? "bg-destructive/20" : isSuccess ? "bg-green-500/20" : "bg-primary/20"
          }`}>
            {isCancelled
              ? <XCircle className="w-8 h-8 text-destructive" />
              : isSuccess
              ? <CheckCircle className="w-8 h-8 text-green-500" />
              : <Clock className="w-8 h-8 text-primary" />
            }
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            {isCancelled ? "Pago no completado" : isSuccess ? "¡Pedido confirmado!" : "Procesando pago..."}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isCancelled
              ? "Tu pago fue rechazado o cancelado. Puedes intentarlo de nuevo."
              : isSuccess
              ? `Tu orden #${order.order_number} fue recibida y está siendo procesada.`
              : "Estamos verificando tu pago. Esto puede tomar unos segundos."
            }
          </p>
          <StatusBadge code={statusCode} />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">
        {/* Número de orden */}
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Número de orden</p>
            <p className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              #{order.order_number}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="text-sm font-medium">
              {new Date(order.created_at).toLocaleDateString("es-CO", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Detalle de items */}
        {details.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold">
              Items pedidos
            </div>
            <div className="divide-y divide-border">
              {details.map((d) => (
                <div key={d.order_detail_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {d.combo_id
                      ? <Layers className="w-4 h-4 text-muted-foreground opacity-50" />
                      : <Package className="w-4 h-4 text-muted-foreground opacity-50" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {d.combo_id ? `Combo #${d.combo_id}` : `Producto #${d.product_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCOP(d.unit_price)} × {d.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatCOP(d.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCOP(order.total)}</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2">
          {isCancelled && (
            <Link
              href="/client/menu"
              className="flex items-center justify-center h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Volver al menú
            </Link>
          )}
          <Link
            href="/client/menu"
            className="flex items-center justify-center h-11 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            {isSuccess ? "Pedir más" : "Ir al menú"}
          </Link>
        </div>
      </div>
    </div>
  );
}
