import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { StatusBadge, formatCOP } from "@/components/client/order-status-badge";

export default async function OrdersListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/client/order");

  const { data: orders } = await supabase
    .from("profile_has_order")
    .select(`
      profile_order_id, order_number, total, created_at,
      status_order(code),
      order_detail(order_detail_id)
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  type StatusJoin = { code: string } | { code: string }[] | null;
  const oneCode = (v: StatusJoin) => (Array.isArray(v) ? v[0]?.code : v?.code) ?? "pending";

  const rows = orders ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 h-14 flex items-center">
        <h1 className="font-bold text-base" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Mis pedidos
        </h1>
      </div>

      <div className="max-w-lg mx-auto p-4 sm:p-6">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Todavía no hiciste ningún pedido.
            </p>
            <Link
              href="/client/menu"
              className="mt-2 inline-flex items-center h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Ver el menú
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((o) => (
              <Link
                key={o.profile_order_id}
                href={`/client/order/${o.profile_order_id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-primary" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                      #{o.order_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("es-CO", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  <StatusBadge code={oneCode(o.status_order as StatusJoin)} size="sm" />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatCOP(o.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_detail?.length ?? 0} item{(o.order_detail?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
