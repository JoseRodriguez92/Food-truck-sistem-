"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

export async function createBatch(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("production_batch").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function updateBatch(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("production_batch")
    .update(parsed.data)
    .eq("production_batch_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteBatch(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_batch")
    .delete()
    .eq("production_batch_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

/* ── Ingredientes del lote ────────────────────────────────────────────── */

export async function saveBatchRecipeItem(
  productionBatchId: number,
  ingredientId: number,
  quantity: number,
) {
  if (quantity <= 0) return { error: "La cantidad debe ser mayor a 0" };

  const supabase = await createClient();
  const { error } = await supabase.from("production_batch_item").upsert(
    {
      production_batch_id: productionBatchId,
      ingredient_id: ingredientId,
      quantity,
    },
    { onConflict: "production_batch_id,ingredient_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeBatchRecipeItem(productionBatchItemId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_batch_item")
    .delete()
    .eq("production_batch_item_id", productionBatchItemId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

/* ── Producir lote ────────────────────────────────────────────────────── */

export async function produceBatch(
  productionBatchId: number,
  foodtruckId: number,
  notes?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("producir_lote", {
    p_production_batch_id: productionBatchId,
    p_foodtruck_id: foodtruckId,
    p_profile_id: user?.id ?? undefined,
    p_notes: notes?.trim() || undefined,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { data };
}
