"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  unit: z.string().min(1, "La unidad es requerida"),
  description: z.string().optional(),
});

export async function createIngredient(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("ingredient").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function updateIngredient(id: number, formData: FormData) {
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

export async function deleteIngredient(id: number) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("product_has_ingredient")
    .select("*", { count: "exact", head: true })
    .eq("ingredient_id", id);

  if (count && count > 0)
    return {
      error: `No se puede eliminar: está usado en ${count} producto(s).`,
    };

  const { error } = await supabase
    .from("ingredient")
    .delete()
    .eq("ingredient_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

/* ── Stock ─────────────────────────────────────────────────────────────── */

export type MovementType = "entrada" | "salida" | "ajuste" | "produccion";

export async function adjustStock(
  foodtruckId: number,
  ingredientId: number,
  type: MovementType,
  value: number, // entrada/salida → cantidad; ajuste → nuevo total
  notes?: string,
) {
  const supabase = await createClient();

  // Obtener stock actual del truck específico
  const { data: stockData } = await supabase
    .from("foodtruck_has_ingredient")
    .select("stock")
    .eq("foodtruck_id", foodtruckId)
    .eq("ingredient_id", ingredientId)
    .single();

  const stockBefore = Number(stockData?.stock ?? 0);
  let stockAfter: number;
  let quantity: number;

  if (type === "entrada") {
    quantity = value;
    stockAfter = stockBefore + value;
  } else if (type === "salida") {
    quantity = value;
    stockAfter = stockBefore - value;
    if (stockAfter < 0) return { error: "Stock insuficiente para esta salida" };
  } else {
    // ajuste: value es el nuevo total
    stockAfter = value;
    quantity = Math.abs(value - stockBefore);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insertar movimiento con foodtruck_id
  const { error: movErr } = await supabase
    .from("ingredient_stock_movement")
    .insert({
      foodtruck_id: foodtruckId,
      ingredient_id: ingredientId,
      type,
      quantity,
      stock_before: stockBefore,
      stock_after: stockAfter,
      notes: notes?.trim() || null,
      profile_id: user?.id ?? null,
    });

  if (movErr) return { error: movErr.message };

  // Actualizar o crear registro en foodtruck_has_ingredient
  if (!stockData) {
    // No existe → crear
    const { error: insertErr } = await supabase
      .from("foodtruck_has_ingredient")
      .insert({
        foodtruck_id: foodtruckId,
        ingredient_id: ingredientId,
        stock: stockAfter,
      });
    if (insertErr) return { error: insertErr.message };
  } else {
    // Existe → actualizar
    const { error: updErr } = await supabase
      .from("foodtruck_has_ingredient")
      .update({ stock: stockAfter })
      .eq("foodtruck_id", foodtruckId)
      .eq("ingredient_id", ingredientId);
    if (updErr) return { error: updErr.message };
  }

  revalidatePath("/dashboard");
}

export type StockMovement = {
  movement_id: number;
  type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null }[] | null;
};

export async function getStockHistory(
  foodtruckId: number,
  ingredientId: number,
): Promise<StockMovement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ingredient_stock_movement")
    .select(
      "movement_id, type, quantity, stock_before, stock_after, notes, created_at, profiles(first_name, last_name)",
    )
    .eq("foodtruck_id", foodtruckId)
    .eq("ingredient_id", ingredientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (data ?? []) as StockMovement[];
}
