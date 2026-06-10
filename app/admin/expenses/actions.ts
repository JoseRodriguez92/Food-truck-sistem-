"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createExpenseSchema = z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  description: z.string().min(1, "La descripción es requerida"),
  category: z.enum([
    "ingredientes",
    "salarios",
    "servicios",
    "mantenimiento",
    "transporte",
    "otro",
  ]),
});

const updateExpenseSchema = z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  description: z.string().min(1, "La descripción es requerida"),
  category: z.enum([
    "ingredientes",
    "salarios",
    "servicios",
    "mantenimiento",
    "transporte",
    "otro",
  ]),
});

// ─── Create Expense ───────────────────────────────────────────────────────────

export async function createExpense(formData: FormData, receiptUrl: string) {
  const parsed = createExpenseSchema.safeParse({
    amount: formData.get("amount"),
    description: formData.get("description"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createServerClient();

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Insertar gasto
  const { error } = await supabase.from("expense").insert({
    amount: parsed.data.amount,
    description: parsed.data.description,
    category: parsed.data.category,
    receipt_url: receiptUrl,
    created_by: user.id,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
}

// ─── Update Expense ───────────────────────────────────────────────────────────

export async function updateExpense(
  expenseId: number,
  formData: FormData,
  receiptUrl?: string,
) {
  const parsed = updateExpenseSchema.safeParse({
    amount: formData.get("amount"),
    description: formData.get("description"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createServerClient();

  const updateData: any = {
    amount: parsed.data.amount,
    description: parsed.data.description,
    category: parsed.data.category,
  };

  if (receiptUrl) {
    updateData.receipt_url = receiptUrl;
  }

  const { error } = await supabase
    .from("expense")
    .update(updateData)
    .eq("expense_id", expenseId);

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
}

// ─── Delete Expense ───────────────────────────────────────────────────────────

export async function deleteExpense(expenseId: number) {
  const supabase = await createServerClient();

  // Soft delete: ocultar en lugar de eliminar
  const { error } = await supabase
    .from("expense")
    .update({ visible: false })
    .eq("expense_id", expenseId);

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
}

// ─── Normalize Pending Expenses ──────────────────────────────────────────────

export async function normalizePendingExpenses() {
  const supabase = await createServerClient();

  // Llamar a la función de base de datos
  const { data, error } = await supabase.rpc("normalize_pending_expenses");

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return {
    success: true,
    data: data as {
      total_normalized: number;
      expenses_normalized: number;
      payments_created: number;
    },
  };
}

// ─── Normalize Selected Expenses ──────────────────────────────────────────────

export async function normalizeSelectedExpenses(expenseIds: number[]) {
  if (!expenseIds || expenseIds.length === 0) {
    return { error: "Debes seleccionar al menos un gasto" };
  }

  const supabase = await createServerClient();

  // Llamar a la función de base de datos con array de IDs
  const { data, error } = await supabase.rpc("normalize_selected_expenses", {
    expense_ids: expenseIds,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return {
    success: true,
    total: data.total_normalized || 0,
    count: data.expenses_normalized || 0,
  };
}

// ─── Mark Payment as Paid ─────────────────────────────────────────────────────

export async function markPaymentAsPaid(
  paymentId: number,
  receiptUrl?: string,
) {
  const supabase = await createServerClient();

  const updateData: any = {
    status: "paid",
    paid_at: new Date().toISOString(),
  };

  if (receiptUrl) {
    updateData.payment_receipt_url = receiptUrl;
  }

  const { error } = await supabase
    .from("expense_payment")
    .update(updateData)
    .eq("payment_id", paymentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
}

// ─── Upload Receipt ───────────────────────────────────────────────────────────

export async function uploadReceipt(
  file: File,
  type: "original" | "payment",
  id: string,
) {
  const supabase = await createServerClient();

  const ext = file.name.split(".").pop();
  const folder = type === "original" ? "originals" : "payments";
  const path = `${folder}/${id}/receipt_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("expense-receipts")
    .upload(path, file, { upsert: false });

  if (uploadError) return { success: false, error: uploadError.message };

  // Bucket privado → usar signed URL con 1 año de validez
  const { data: signedData, error: signedError } = await supabase.storage
    .from("expense-receipts")
    .createSignedUrl(path, 31536000); // 1 año en segundos

  if (signedError) return { success: false, error: signedError.message };

  return { success: true, url: signedData.signedUrl };
}

// ─── Delete Receipt ───────────────────────────────────────────────────────────

export async function deleteReceipt(path: string) {
  const supabase = await createServerClient();

  const { error } = await supabase.storage
    .from("expense-receipts")
    .remove([path]);

  if (error) return { error: error.message };

  return { success: true };
}
