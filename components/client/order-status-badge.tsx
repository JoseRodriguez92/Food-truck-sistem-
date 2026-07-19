import { CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";

export function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending:    { label: "Pago pendiente (en persona)", icon: Clock, className: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  confirmed:  { label: "Pago confirmado",   icon: CheckCircle, className: "text-green-500 bg-green-500/10 border-green-500/20" },
  preparing:  { label: "En preparación",    icon: Clock,       className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  ready:      { label: "Lista para recoger",icon: CheckCircle, className: "text-primary bg-primary/10 border-primary/20" },
  on_the_way: { label: "En camino",         icon: ChevronRight,className: "text-primary bg-primary/10 border-primary/20" },
  delivered:  { label: "Entregada",         icon: CheckCircle, className: "text-green-500 bg-green-500/10 border-green-500/20" },
  cancelled:  { label: "Cancelada",         icon: XCircle,     className: "text-destructive bg-destructive/10 border-destructive/20" },
};

export function StatusBadge({ code, size = "default" }: { code: string; size?: "default" | "sm" }) {
  const cfg = STATUS_MAP[code] ?? STATUS_MAP["pending"];
  const Icon = cfg.icon;
  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs gap-1" : "px-3 py-1.5 text-sm gap-1.5";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${cfg.className}`}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {cfg.label}
    </span>
  );
}
