"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name:        z.string().min(1, "El nombre es requerido"),
  unit:        z.string().min(1, "La unidad es requerida"),
  stock:       z.coerce.number().min(0, "El stock no puede ser negativo"),
  description: z.string().optional(),
});

export async function createIngredient(formData: FormData) {
  const parsed = schema.safeParse({
    name:        formData.get("name"),
    unit:        formData.get("unit"),
    stock:       formData.get("stock") || 0,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("ingredient").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/ingredients");
}

export async function updateIngredient(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    name:        formData.get("name"),
    unit:        formData.get("unit"),
    stock:       formData.get("stock") || 0,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredient")
    .update(parsed.data)
    .eq("ingredient_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/ingredients");
}

export async function deleteIngredient(id: number) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("product_has_ingredient")
    .select("*", { count: "exact", head: true })
    .eq("ingredient_id", id);

  if (count && count > 0)
    return { error: `No se puede eliminar: está usado en ${count} producto(s).` };

  const { error } = await supabase
    .from("ingredient")
    .delete()
    .eq("ingredient_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/ingredients");
}

/* ── Stock ─────────────────────────────────────────────────────────────── */

export type MovementType = "entrada" | "salida" | "ajuste";

export async function adjustStock(
  ingredientId: number,
  type: MovementType,
  value: number,   // entrada/salida → cantidad; ajuste → nuevo total
  notes?: string,
) {
  const supabase = await createClient();

  const { data: ing } = await supabase
    .from("ingredient")
    .select("stock")
    .eq("ingredient_id", ingredientId)
    .single();

  if (!ing) return { error: "Ingrediente no encontrado" };

  const stockBefore = Number(ing.stock);
  let stockAfter: number;
  let quantity: number;

  if (type === "entrada") {
    quantity   = value;
    stockAfter = stockBefore + value;
  } else if (type === "salida") {
    quantity   = value;
    stockAfter = stockBefore - value;
    if (stockAfter < 0) return { error: "Stock insuficiente para esta salida" };
  } else {
    // ajuste: value es el nuevo total
    stockAfter = value;
    quantity   = Math.abs(value - stockBefore);
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error: movErr } = await supabase
    .from("ingredient_stock_movement")
    .insert({
      ingredient_id: ingredientId,
      type,
      quantity,
      stock_before: stockBefore,
      stock_after:  stockAfter,
      notes:        notes?.trim() || null,
      profile_id:   user?.id ?? null,
    });

  if (movErr) return { error: movErr.message };

  const { error: updErr } = await supabase
    .from("ingredient")
    .update({ stock: stockAfter })
    .eq("ingredient_id", ingredientId);

  if (updErr) return { error: updErr.message };

  revalidatePath("/admin/ingredients");
}

export type StockMovement = {
  movement_id:  number;
  type:         MovementType;
  quantity:     number;
  stock_before: number;
  stock_after:  number;
  notes:        string | null;
  created_at:   string;
  profiles: { first_name: string | null; last_name: string | null }[] | null;
};

export async function getStockHistory(ingredientId: number): Promise<StockMovement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ingredient_stock_movement")
    .select("movement_id, type, quantity, stock_before, stock_after, notes, created_at, profiles(first_name, last_name)")
    .eq("ingredient_id", ingredientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (data ?? []) as StockMovement[];
}
