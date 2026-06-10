import { createClient } from "@/lib/supabase/server";
import { ExpensesView } from "@/components/admin/views/expenses-view";
import { Database } from "@/src/types/database.types";

type ExpenseWithCreator =
  Database["public"]["Views"]["v_expenses_with_creator"]["Row"];
type ExpensePayment =
  Database["public"]["Views"]["v_expense_payments_with_admin"]["Row"];

export default async function ExpensesPage() {
  const supabase = await createClient();

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener gastos con información del creador
  const { data: expenses } = await supabase
    .from("v_expenses_with_creator")
    .select("*")
    .order("created_at", { ascending: false });

  // Obtener pagos con información de admins
  const { data: payments } = await supabase
    .from("v_expense_payments_with_admin")
    .select("*");

  // Obtener resumen del admin actual
  const { data: summary } = await supabase
    .from("v_admin_expense_summary")
    .select("*")
    .eq("admin_id", user?.id || "")
    .single();

  return (
    <ExpensesView
      expenses={(expenses as ExpenseWithCreator[]) || []}
      payments={(payments as ExpensePayment[]) || []}
      currentUserId={user?.id || ""}
      currentUserSummary={summary}
    />
  );
}
