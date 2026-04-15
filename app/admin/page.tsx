import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { ShoppingBag, Clock, CheckCircle, Loader } from "lucide-react";

// ── Tipos para los joins de Supabase ──────────────────────────────────────────
type ProfileJoin = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
} | null;

type StatusJoin = {
  status_order_id: string;
  name: string;
  code: string;
} | null;

function toSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

// Colores por código de estado
function getStatusStyle(code: string) {
  const c = code.toLowerCase();
  if (c.includes("pend")) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  if (c.includes("prep") || c.includes("progress")) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (c.includes("ready") || c.includes("listo")) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (c.includes("cancel")) return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Pedidos de hoy con cliente y estado actual
  const { data: orders } = await supabase
    .from("profile_has_order")
    .select(
      `
      profile_order_id,
      order_number,
      total,
      subtotal,
      created_at,
      notes,
      status_order_id,
      profiles(first_name, last_name, email),
      status_order(status_order_id, name, code, sort_order)
    `
    )
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false });

  // Todos los estados disponibles para el select
  const { data: allStatuses } = await supabase
    .from("status_order")
    .select("status_order_id, name, code, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  const total = orders?.length ?? 0;
  const pending =
    orders?.filter((o) =>
      toSingle(o.status_order as unknown as StatusJoin | StatusJoin[])?.code?.toLowerCase().includes("pend")
    ).length ?? 0;
  const preparing =
    orders?.filter((o) =>
      toSingle(o.status_order as unknown as StatusJoin | StatusJoin[])?.code?.toLowerCase().includes("prep")
    ).length ?? 0;
  const ready =
    orders?.filter((o) =>
      toSingle(o.status_order as unknown as StatusJoin | StatusJoin[])?.code
        ?.toLowerCase()
        .match(/ready|listo/)
    ).length ?? 0;

  const stats = [
    { label: "Pedidos hoy", value: total, icon: ShoppingBag, color: "text-primary" },
    { label: "Pendientes", value: pending, icon: Clock, color: "text-yellow-500" },
    { label: "Preparando", value: preparing, icon: Loader, color: "text-blue-500" },
    { label: "Listos", value: ready, icon: CheckCircle, color: "text-green-500" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="py-4">
            <CardHeader className="px-4 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-1">
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla de pedidos */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <CardTitle className="text-base">Pedidos de hoy</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!orders || orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Sin pedidos por ahora</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16"># Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Hora</TableHead>
                    <TableHead className="hidden md:table-cell">Notas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const profile = toSingle(
                      order.profiles as unknown as ProfileJoin | ProfileJoin[]
                    );
                    const status = toSingle(
                      order.status_order as unknown as StatusJoin | StatusJoin[]
                    );
                    const customerName = profile?.first_name
                      ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
                      : profile?.email ?? "—";

                    return (
                      <TableRow key={order.profile_order_id}>
                        <TableCell className="font-mono font-medium text-sm">
                          #{order.order_number}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{customerName}</p>
                          {profile?.email && (
                            <p className="text-xs text-muted-foreground hidden sm:block">
                              {profile.email}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {formatTime(order.created_at)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-40 truncate">
                          {order.notes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          {status ? (
                            <Badge
                              className={`text-xs border ${getStatusStyle(status.code)}`}
                              variant="outline"
                            >
                              {status.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          <div className="mt-1.5">
                            <OrderStatusSelect
                              profileOrderId={order.profile_order_id}
                              currentStatusId={order.status_order_id}
                              statuses={allStatuses ?? []}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
