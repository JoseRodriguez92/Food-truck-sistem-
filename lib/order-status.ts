// Estilos de color por estado de pedido — compartidos entre el badge/select
// del panel admin (components/admin/order-status-select.tsx) y el tracker
// del cliente (components/client/order-status-badge.tsx), para que un mismo
// estado se vea igual en toda la app.

type StatusStyle = { badge: string; dot: string };

const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: {
    badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  confirmed: {
    badge: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30",
    dot: "bg-green-500",
  },
  preparing: {
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
    dot: "bg-blue-500",
  },
  ready: {
    badge: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:border-primary/30",
    dot: "bg-primary",
  },
  on_the_way: {
    badge: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:border-primary/30",
    dot: "bg-primary",
  },
  delivered: {
    badge: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30",
    dot: "bg-green-500",
  },
  cancelled: {
    badge: "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/15 dark:border-destructive/30",
    dot: "bg-destructive",
  },
};

const DEFAULT_STYLE: StatusStyle = {
  badge: "bg-muted text-muted-foreground border-border",
  dot: "bg-muted-foreground",
};

export function getOrderStatusStyle(code: string): StatusStyle {
  const c = code.toLowerCase();
  if (STATUS_STYLES[c]) return STATUS_STYLES[c];
  if (c.includes("pend")) return STATUS_STYLES.pending;
  if (c.includes("confirm")) return STATUS_STYLES.confirmed;
  if (c.includes("prep") || c.includes("progress")) return STATUS_STYLES.preparing;
  if (c.includes("camino") || c.includes("way")) return STATUS_STYLES.on_the_way;
  if (c.includes("entreg") || c.includes("deliver")) return STATUS_STYLES.delivered;
  if (c.includes("ready") || c.includes("listo")) return STATUS_STYLES.ready;
  if (c.includes("cancel") || c.includes("rechaz")) return STATUS_STYLES.cancelled;
  return DEFAULT_STYLE;
}
