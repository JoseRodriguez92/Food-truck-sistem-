"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  unit: z.string().min(1, "La unidad es requerida"),
  description: z.string().optional(),
});

export async function createBatch(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredient")
    .insert({ ...parsed.data, is_batch: true });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function updateBatch(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredient")
    .update(parsed.data)
    .eq("ingredient_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteBatch(id: number) {
  const supabase = await createClient();

  const { count: usedInProducts } = await supabase
    .from("product_has_ingredient")
    .select("*", { count: "exact", head: true })
    .eq("ingredient_id", id);
  if (usedInProducts && usedInProducts > 0)
    return {
      error: `No se puede eliminar: está usado en ${usedInProducts} producto(s).`,
    };

  const { count: usedInOtherBatches } = await supabase
    .from("batch_recipe")
    .select("*", { count: "exact", head: true })
    .eq("component_ingredient_id", id);
  if (usedInOtherBatches && usedInOtherBatches > 0)
    return {
      error: `No se puede eliminar: se usa como componente de ${usedInOtherBatches} otro(s) lote(s).`,
    };

  const { error } = await supabase.from("ingredient").delete().eq("ingredient_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

/* ── Receta del lote ──────────────────────────────────────────────────── */

export async function saveBatchRecipeItem(
  batchIngredientId: number,
  componentIngredientId: number,
  quantity: number,
) {
  if (batchIngredientId === componentIngredientId)
    return { error: "Un lote no puede consumirse a sí mismo" };
  if (quantity <= 0) return { error: "La cantidad debe ser mayor a 0" };

  const supabase = await createClient();
  const { error } = await supabase.from("batch_recipe").upsert(
    {
      batch_ingredient_id: batchIngredientId,
      component_ingredient_id: componentIngredientId,
      quantity,
    },
    { onConflict: "batch_ingredient_id,component_ingredient_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeBatchRecipeItem(batchRecipeId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("batch_recipe")
    .delete()
    .eq("batch_recipe_id", batchRecipeId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

/* ── Producir lote ────────────────────────────────────────────────────── */

export async function produceBatch(
  batchIngredientId: number,
  foodtruckId: number,
  cantidad: number,
  notes?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("producir_lote", {
    p_batch_ingredient_id: batchIngredientId,
    p_foodtruck_id: foodtruckId,
    p_cantidad: cantidad,
    p_profile_id: user?.id ?? undefined,
    p_notes: notes?.trim() || undefined,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { data };
}
