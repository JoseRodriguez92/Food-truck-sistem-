"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Receipt,
  DollarSign,
  Filter,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Users,
  Banknote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Database } from "@/src/types/database.types";
import {
  createExpense,
  normalizePendingExpenses,
  normalizeSelectedExpenses,
  markPaymentAsPaid,
  uploadReceipt,
  deleteExpense,
} from "@/app/admin/expenses/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseWithCreator =
  Database["public"]["Views"]["v_expenses_with_creator"]["Row"];
type ExpensePayment =
  Database["public"]["Views"]["v_expense_payments_with_admin"]["Row"];
type AdminExpenseSummary =
  Database["public"]["Views"]["v_admin_expense_summary"]["Row"];
type ExpenseStatus = Database["public"]["Enums"]["expense_status_enum"];
type ExpenseCategory = Database["public"]["Enums"]["expense_category_enum"];

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: "ingredientes", label: "Ingredientes", color: "bg-green-500" },
  { value: "salarios", label: "Salarios", color: "bg-blue-500" },
  { value: "servicios", label: "Servicios", color: "bg-purple-500" },
  { value: "mantenimiento", label: "Mantenimiento", color: "bg-orange-500" },
  { value: "transporte", label: "Transporte", color: "bg-yellow-500" },
  { value: "otro", label: "Otro", color: "bg-gray-500" },
];

const STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; color: string; icon: any }
> = {
  pending: { label: "Pendiente", color: "bg-yellow-500", icon: Clock },
  normalized: { label: "Normalizado", color: "bg-blue-500", icon: Users },
  paid: { label: "Pagado", color: "bg-green-500", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-gray-500", icon: X },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

function getCategoryColor(category: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === category)?.color ?? "bg-gray-500";
}

function getCategoryLabel(category: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function getStatusConfig(status: ExpenseStatus) {
  return STATUS_CONFIG[status];
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────

function StatsCards({
  expenses,
  summary,
}: {
  expenses: ExpenseWithCreator[];
  summary: AdminExpenseSummary | null;
}) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pending = expenses.filter((e) => e.status === "pending");
  const pendingTotal = pending.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );

  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total General</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold">
                {formatCurrency(pendingTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pending.length} gasto{pending.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Mis Pendientes</p>
              <p className="text-2xl font-bold">
                {formatCurrency(Number(summary?.pending_amount || 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.pending_count || 0} pago
                {summary?.pending_count !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Por Categoría</p>
            <div className="space-y-1">
              {byCategory.slice(0, 3).map((c) => (
                <div
                  key={c.value}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${c.color}`} />
                    <span className="text-muted-foreground">{c.label}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ExpensesView({
  expenses,
  payments,
  currentUserId,
  currentUserSummary,
}: {
  expenses: ExpenseWithCreator[];
  payments: ExpensePayment[];
  currentUserId: string;
  currentUserSummary: AdminExpenseSummary | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estado para crear gasto
  const [createOpen, setCreateOpen] = useState(false);
  const [createAmount, setCreateAmount] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createCategory, setCreateCategory] = useState<ExpenseCategory | "">(
    "",
  );
  const [createFile, setCreateFile] = useState<File | null>(null);

  // Estado para normalizar
  const [normalizeOpen, setNormalizeOpen] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

  // Estado para eliminar/ocultar
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] =
    useState<ExpenseWithCreator | null>(null);

  // Estado para pagar
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ExpensePayment | null>(
    null,
  );
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "all">(
    "all",
  );
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Aplicar filtros
  const filteredExpenses = expenses.filter((exp) => {
    if (filterStatus !== "all" && exp.status !== filterStatus) return false;
    if (filterCategory && exp.category !== filterCategory) return false;

    // Filtro por rango de fechas
    if (filterDateFrom || filterDateTo) {
      const expDate = new Date(exp.created_at || "");
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (expDate < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (expDate > toDate) return false;
      }
    }

    return true;
  });

  const hasActiveFilters =
    filterStatus !== "all" || filterCategory || filterDateFrom || filterDateTo;

  // Acciones
  async function handleCreate() {
    if (!createCategory || !createDesc || !createAmount || !createFile) {
      toast.error("Completa todos los campos y sube el comprobante");
      return;
    }

    startTransition(async () => {
      try {
        // Upload receipt first
        const uploadResult = await uploadReceipt(
          createFile,
          "original",
          crypto.randomUUID(),
        );
        if (!uploadResult.success || !uploadResult.url) {
          toast.error(uploadResult.error || "Error subiendo comprobante");
          return;
        }

        // Create expense
        const formData = new FormData();
        formData.append("amount", createAmount);
        formData.append("description", createDesc);
        formData.append("category", createCategory);

        const result = await createExpense(formData, uploadResult.url);
        if (!result.success) {
          toast.error(result.error || "Error creando gasto");
          return;
        }

        toast.success("Gasto registrado");
        setCreateOpen(false);
        setCreateAmount("");
        setCreateDesc("");
        setCreateCategory("");
        setCreateFile(null);
        router.refresh();
      } catch (e) {
        toast.error("Error inesperado");
      }
    });
  }

  async function handleNormalize() {
    if (selectedExpenseIds.length === 0) {
      toast.error("Selecciona al menos un gasto");
      return;
    }

    startTransition(async () => {
      const result = await normalizeSelectedExpenses(selectedExpenseIds);
      if (!result.success) {
        toast.error(result.error || "Error normalizando");
        return;
      }

      toast.success(
        `Normalizados ${result.count} gastos. Total: ${formatCurrency(result.total || 0)}`,
      );
      setNormalizeOpen(false);
      setSelectedExpenseIds([]);
      router.refresh();
    });
  }

  function toggleExpense(expenseId: number) {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId],
    );
  }

  function toggleAllExpenses() {
    if (selectedExpenseIds.length === pendingExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(pendingExpenses.map((e) => e.expense_id!));
    }
  }

  async function handleMarkAsPaid() {
    if (!selectedPayment) return;

    startTransition(async () => {
      try {
        let receiptUrl: string | undefined;

        // Upload receipt if provided
        if (paymentFile) {
          const uploadResult = await uploadReceipt(
            paymentFile,
            "payment",
            String(selectedPayment.payment_id),
          );
          if (!uploadResult.success || !uploadResult.url) {
            toast.error(uploadResult.error || "Error subiendo comprobante");
            return;
          }
          receiptUrl = uploadResult.url;
        }

        // Mark as paid
        const result = await markPaymentAsPaid(
          selectedPayment.payment_id!,
          receiptUrl,
        );
        if (!result.success) {
          toast.error(result.error || "Error marcando pago");
          return;
        }

        toast.success("Pago registrado");
        setPaymentDialogOpen(false);
        setSelectedPayment(null);
        setPaymentFile(null);
        router.refresh();
      } catch (e) {
        toast.error("Error inesperado");
      }
    });
  }

  async function handleDelete() {
    if (!expenseToDelete) return;

    startTransition(async () => {
      const result = await deleteExpense(expenseToDelete.expense_id!);
      if (!result.success) {
        toast.error(result.error || "Error ocultando gasto");
        return;
      }

      toast.success("Gasto ocultado");
      setDeleteOpen(false);
      setExpenseToDelete(null);
      router.refresh();
    });
  }

  function clearFilters() {
    setFilterStatus("all");
    setFilterCategory("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const myPendingPayments = payments.filter(
    (p) => p.admin_id === currentUserId && p.status === "pending",
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-6xl text-foreground"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Control de Gastos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredExpenses.length} gasto
            {filteredExpenses.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtrado)"}
          </p>
        </div>
        <div className="flex gap-2">
          {pendingExpenses.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setNormalizeOpen(true)}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Normalizar Pendientes
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registrar Gasto</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards expenses={filteredExpenses} summary={currentUserSummary} />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Filtros</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-7 text-xs gap-1"
              >
                <X className="w-3 h-3" />
                Limpiar
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select
                value={filterStatus}
                onValueChange={(v) =>
                  setFilterStatus(v as ExpenseStatus | "all")
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="normalized">Normalizados</SelectItem>
                  <SelectItem value="paid">Pagados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="h-9"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="h-9"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mis Pagos Pendientes */}
      {myPendingPayments.length > 0 && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium">Mis Pagos Pendientes</h3>
                <Badge variant="outline" className="ml-2">
                  {myPendingPayments.length}
                </Badge>
              </div>
              <p className="text-sm font-medium text-blue-500">
                Total:{" "}
                {formatCurrency(
                  myPendingPayments.reduce(
                    (sum, p) => sum + Number(p.amount || 0),
                    0,
                  ),
                )}
              </p>
            </div>
            <div className="space-y-2">
              {myPendingPayments.map((payment) => {
                const expense = expenses.find(
                  (e) => e.expense_id === payment.expense_id,
                );
                return (
                  <div
                    key={payment.payment_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {expense?.description || "Gasto #" + payment.expense_id}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {expense && (
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(
                              expense.category as ExpenseCategory,
                            )}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Mi parte: {formatCurrency(Number(payment.amount))}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setPaymentDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar Pagado
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Receipt className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {hasActiveFilters
                ? "No hay gastos con esos filtros"
                : "Sin gastos registrados"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="hidden md:table-cell">
                  Categoría
                </TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Creado por
                </TableHead>
                <TableHead className="w-16 text-right">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((exp) => {
                const statusConfig = getStatusConfig(
                  exp.status as ExpenseStatus,
                );
                const StatusIcon = statusConfig.icon;

                // Get payments for this expense
                const expensePayments = payments.filter(
                  (p) => p.expense_id === exp.expense_id,
                );
                const paidPayments = expensePayments.filter(
                  (p) => p.status === "paid",
                );

                return (
                  <TableRow key={exp.expense_id}>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {exp.expense_id}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(exp.created_at || "").toLocaleDateString(
                        "es-CO",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm line-clamp-2">
                            {exp.description}
                          </span>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {exp.receipt_url && (
                              <a
                                href={exp.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <Receipt className="w-3 h-3" />
                                Ver comprobante
                              </a>
                            )}
                            <span className="text-xs text-muted-foreground lg:hidden">
                              Por: {exp.created_by_name || "Desconocido"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${getCategoryColor(exp.category as ExpenseCategory)}`}
                        />
                        {getCategoryLabel(exp.category as ExpenseCategory)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(Number(exp.amount))}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs gap-1.5">
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                      {exp.status === "normalized" &&
                        expensePayments.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {paidPayments.length}/{expensePayments.length}{" "}
                              pagado
                            </span>
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {exp.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {exp.receipt_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={exp.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        {exp.created_by === currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => {
                              setExpenseToDelete(exp);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Monto (COP) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Select
                value={createCategory}
                onValueChange={(v) => setCreateCategory(v as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${c.color}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe el gasto..."
                rows={2}
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receipt">
                Comprobante <span className="text-destructive">*</span>
              </Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG · máx. 5MB
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={isPending} onClick={handleCreate}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Normalizar */}
      <Dialog open={normalizeOpen} onOpenChange={setNormalizeOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Normalizar Gastos Pendientes</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona los gastos que quieres dividir entre todos los
              administradores activos.
            </p>

            {pendingExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm">No hay gastos pendientes</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        selectedExpenseIds.length === pendingExpenses.length &&
                        pendingExpenses.length > 0
                      }
                      onCheckedChange={toggleAllExpenses}
                    />
                    <span className="text-sm font-medium">
                      Seleccionar todos ({pendingExpenses.length})
                    </span>
                  </div>
                  {selectedExpenseIds.length > 0 && (
                    <Badge variant="outline">
                      {selectedExpenseIds.length} seleccionado
                      {selectedExpenseIds.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {pendingExpenses.map((exp) => (
                    <div
                      key={exp.expense_id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        selectedExpenseIds.includes(exp.expense_id!)
                          ? "bg-primary/5 border-primary"
                          : "bg-background hover:bg-muted/50"
                      }`}
                      onClick={() => toggleExpense(exp.expense_id!)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={selectedExpenseIds.includes(exp.expense_id!)}
                        onCheckedChange={() => toggleExpense(exp.expense_id!)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {exp.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${getCategoryColor(exp.category as ExpenseCategory)}`}
                                />
                                {getCategoryLabel(
                                  exp.category as ExpenseCategory,
                                )}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Por: {exp.created_by_name || "Desconocido"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  exp.created_at || "",
                                ).toLocaleDateString("es-CO", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm shrink-0">
                            {formatCurrency(Number(exp.amount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {selectedExpenseIds.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total a normalizar:
                </span>
                <span className="font-bold text-lg">
                  {formatCurrency(
                    pendingExpenses
                      .filter((e) => selectedExpenseIds.includes(e.expense_id!))
                      .reduce((sum, e) => sum + Number(e.amount), 0),
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Este monto se dividirá entre todos los administradores activos.
                Cada uno verá su parte en "Mis Pendientes".
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNormalizeOpen(false);
                setSelectedExpenseIds([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleNormalize}
              disabled={isPending || selectedExpenseIds.length === 0}
            >
              {isPending
                ? "Procesando..."
                : `Normalizar (${selectedExpenseIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Marcar Pago */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Monto a pagar
                  </span>
                  <span className="text-xl font-bold">
                    {formatCurrency(Number(selectedPayment.amount))}
                  </span>
                </div>
                <p className="text-sm">
                  {
                    expenses.find(
                      (e) => e.expense_id === selectedPayment.expense_id,
                    )?.description
                  }
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-receipt">
                  Comprobante de Pago{" "}
                  <span className="text-muted-foreground text-xs">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="payment-receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  PDF, JPG, PNG · máx. 5MB
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Al marcar como pagado, este pago se registrará en el sistema.
                {paymentFile
                  ? " Se guardará el comprobante adjunto."
                  : " Puedes agregar comprobante opcionalmente."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                setSelectedPayment(null);
                setPaymentFile(null);
              }}
            >
              Cancelar
            </Button>
            <Button disabled={isPending} onClick={handleMarkAsPaid}>
              {isPending ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ocultar Gasto */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ocultar Gasto</AlertDialogTitle>
            <AlertDialogDescription>
              {expenseToDelete && (
                <>
                  ¿Seguro que quieres ocultar este gasto?
                  <br />
                  <br />
                  <strong>{expenseToDelete.description}</strong>
                  <br />
                  Monto: {formatCurrency(Number(expenseToDelete.amount))}
                  <br />
                  <br />
                  <span className="text-xs text-muted-foreground">
                    El gasto no se eliminará permanentemente, solo dejará de ser
                    visible.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? "Ocultando..." : "Ocultar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
