"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const roleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

export async function createRole(formData: FormData) {
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("roles").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/roles");
}

export async function updateRole(roleId: string, formData: FormData) {
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("roles")
    .update(parsed.data)
    .eq("role_id", roleId);
  if (error) return { error: error.message };
  revalidatePath("/admin/roles");
}

export async function deleteRole(roleId: string) {
  const supabase = await createClient();

  // Verificar que no haya usuarios con este rol
  const { count } = await supabase
    .from("profile_has_role")
    .select("*", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (count && count > 0)
    return { error: `No se puede eliminar: ${count} usuario(s) tienen este rol asignado.` };

  const { error } = await supabase.from("roles").delete().eq("role_id", roleId);
  if (error) return { error: error.message };
  revalidatePath("/admin/roles");
}
