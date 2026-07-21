"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const menuSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  food_truck_id: z.coerce.number().min(1, "Selecciona un food truck"),
});

export async function createMenu(formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    food_truck_id: formData.get("food_truck_id"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("menu").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function updateMenu(id: number, formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    food_truck_id: formData.get("food_truck_id"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("menu").update(parsed.data).eq("menu_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteMenu(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu").delete().eq("menu_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

// ── menu_has_product ───────────────────────────────────────────────────────────
export async function addProductToMenu(menuId: number, productId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_has_product")
    .insert({ menu_id: menuId, product_id: productId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function addProductsToMenu(menuId: number, productIds: number[]) {
  if (productIds.length === 0) return { error: "Seleccioná al menos un producto" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_has_product")
    .insert(productIds.map((product_id) => ({ menu_id: menuId, product_id })));
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeProductFromMenu(menuProductId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_has_product")
    .delete()
    .eq("menu_product_id", menuProductId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

// ── menu_has_combo ─────────────────────────────────────────────────────────────
export async function addComboToMenu(menuId: number, comboId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_has_combo")
    .insert({ menu_id: menuId, combo_id: comboId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function addCombosToMenu(menuId: number, comboIds: number[]) {
  if (comboIds.length === 0) return { error: "Seleccioná al menos un combo" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_has_combo")
    .insert(comboIds.map((combo_id) => ({ menu_id: menuId, combo_id })));
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeComboFromMenu(menuComboId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_has_combo")
    .delete()
    .eq("menu_combo_id", menuComboId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}
