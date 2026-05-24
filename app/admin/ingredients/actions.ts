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
