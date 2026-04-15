"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const comboSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor a 0"),
});

export async function createCombo(formData: FormData) {
  const parsed = comboSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("combo").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/combos");
}

export async function updateCombo(id: number, formData: FormData) {
  const parsed = comboSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("combo")
    .update(parsed.data)
    .eq("combo_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/combos");
}

export async function deleteCombo(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("combo").delete().eq("combo_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/combos");
}

export async function addProductToCombo(comboId: number, productId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("combo_has_product")
    .insert({ combo_id: comboId, product_id: productId });
  if (error) return { error: error.message };
  revalidatePath("/admin/combos");
}

export async function removeProductFromCombo(comboProductId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("combo_has_product")
    .delete()
    .eq("combo_product_id", comboProductId);
  if (error) return { error: error.message };
  revalidatePath("/admin/combos");
}
