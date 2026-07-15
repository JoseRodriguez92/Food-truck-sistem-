"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const moduleSchema = z.object({
  code: z
    .string()
    .min(1, "El código es requerido")
    .regex(/^[a-z0-9_.]+$/, "Solo minúsculas, números, punto y guión bajo (ej: catalog.products)"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  icon: z.string().optional(),
  route: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
});

export async function createModule(formData: FormData) {
  const parsed = moduleSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    route: formData.get("route") || undefined,
    parentId: formData.get("parentId") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("modules")
    .select("id")
    .eq("code", parsed.data.code)
    .maybeSingle();
  if (existing) return { error: "Ya existe un módulo con ese código" };

  const { error } = await supabase.from("modules").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description || null,
    icon: parsed.data.icon || null,
    route: parsed.data.route || null,
    parent_id: parsed.data.parentId || null,
    display_order: parsed.data.displayOrder ?? 0,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
}

export async function updateModule(moduleId: string, formData: FormData) {
  const parsed = moduleSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    route: formData.get("route") || undefined,
    parentId: formData.get("parentId") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  if (parsed.data.parentId === moduleId) {
    return { error: "Un módulo no puede ser padre de sí mismo" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("modules")
    .select("id")
    .eq("code", parsed.data.code)
    .neq("id", moduleId)
    .maybeSingle();
  if (existing) return { error: "Ya existe otro módulo con ese código" };

  const { error } = await supabase
    .from("modules")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      route: parsed.data.route || null,
      parent_id: parsed.data.parentId || null,
      display_order: parsed.data.displayOrder ?? 0,
    })
    .eq("id", moduleId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
}

export async function deleteModule(moduleId: string) {
  const supabase = await createClient();

  const { count: childCount } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", moduleId);

  if (childCount && childCount > 0) {
    return {
      error: `No se puede eliminar: tiene ${childCount} submódulo(s). Eliminalos o reasignalos primero.`,
    };
  }

  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
}
