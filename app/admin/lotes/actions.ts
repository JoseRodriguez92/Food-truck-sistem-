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

/**
 * Guarda la receta COMPLETA del lote de una sola vez.
 *
 * El diálogo trabaja como checklist: el staff marca/desmarca ingredientes y
 * ajusta cantidades, y recién al guardar se manda todo junto. Por eso acá se
 * sincroniza el estado final — se borra lo que ya no está marcado y se hace
 * upsert del resto — en vez de tener una llamada por ingrediente.
 */
export async function saveBatchRecipe(
  productionBatchId: number,
  items: { ingredientId: number; quantity: number }[],
) {
  const invalid = items.find((i) => !(i.quantity > 0));
  if (invalid) return { error: "Todas las cantidades deben ser mayores a 0" };

  const supabase = await createClient();
  const keepIds = items.map((i) => i.ingredientId);

  // 1. Borrar los desmarcados
  let del = supabase
    .from("production_batch_item")
    .delete()
    .eq("production_batch_id", productionBatchId);
  if (keepIds.length > 0) del = del.not("ingredient_id", "in", `(${keepIds.join(",")})`);
  const { error: delError } = await del;
  if (delError) return { error: delError.message };

  // 2. Insertar/actualizar los marcados
  if (items.length > 0) {
    const { error } = await supabase.from("production_batch_item").upsert(
      items.map((i) => ({
        production_batch_id: productionBatchId,
        ingredient_id: i.ingredientId,
        quantity: i.quantity,
      })),
      { onConflict: "production_batch_id,ingredient_id" },
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, count: items.length };
}

/* ── Producir lote / corridas de producción ───────────────────────────── */

/**
 * Produce el lote: descuenta la materia prima del truck Y abre la corrida.
 *
 * Abrir la corrida es lo que habilita el conteo — desde ese momento cada
 * arepa vendida de ese lote se imputa a esta tanda. Si quedaron ventas
 * sueltas (se vendió antes de acordarse de producir), la función SQL las
 * adopta automáticamente.
 */
export async function produceBatch(
  productionBatchId: number,
  foodtruckId: number,
  notes?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("abrir_produccion", {
    p_production_batch_id: productionBatchId,
    p_foodtruck_id: foodtruckId,
    p_profile_id: user?.id ?? undefined,
    p_notes: notes?.trim() || undefined,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { data };
}

/** Cierra la corrida. Devuelve cuántas unidades se vendieron en la tanda. */
export async function closeProductionRun(productionRunId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("cerrar_produccion", {
    p_production_run_id: productionRunId,
    p_profile_id: user?.id ?? undefined,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { data };
}
