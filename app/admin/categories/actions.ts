"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name:        z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  const parsed = schema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("category").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
}

export async function updateCategory(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("category")
    .update(parsed.data)
    .eq("category_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
}

export async function deleteCategory(id: number) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("product")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0)
    return { error: `No se puede eliminar: tiene ${count} producto(s) asignado(s).` };

  const { error } = await supabase
    .from("category")
    .delete()
    .eq("category_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/categories");
}
