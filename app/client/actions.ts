"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const directionSchema = z.object({
  label:           z.string().optional(),
  address_line:    z.string().min(1, "La dirección es requerida"),
  city:            z.string().optional(),
  state:           z.string().optional(),
  country:         z.string().optional(),
  postal_code:     z.string().optional(),
  additional_info: z.string().optional(),
});

export async function addDirection(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const parsed = directionSchema.safeParse({
    label:           formData.get("label")           || undefined,
    address_line:    formData.get("address_line"),
    city:            formData.get("city")            || undefined,
    state:           formData.get("state")           || undefined,
    country:         formData.get("country")         || undefined,
    postal_code:     formData.get("postal_code")     || undefined,
    additional_info: formData.get("additional_info") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // 1. Insertar la dirección
  const { data: dir, error: dirErr } = await supabase
    .from("direction")
    .insert(parsed.data)
    .select("direction_id")
    .single();
  if (dirErr) return { error: dirErr.message };

  // 2. Verificar si es la primera → marcar como default
  const { count } = await supabase
    .from("profile_has_direction")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  // 3. Vincular al perfil
  const { error: linkErr } = await supabase
    .from("profile_has_direction")
    .insert({ profile_id: user.id, direction_id: dir.direction_id, is_default: (count ?? 0) === 0 });
  if (linkErr) return { error: linkErr.message };

  revalidatePath("/client", "layout");
}

export async function updateDirection(profileDirectionId: number, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const parsed = directionSchema.safeParse({
    label:           formData.get("label")           || undefined,
    address_line:    formData.get("address_line"),
    city:            formData.get("city")            || undefined,
    state:           formData.get("state")           || undefined,
    country:         formData.get("country")         || undefined,
    postal_code:     formData.get("postal_code")     || undefined,
    additional_info: formData.get("additional_info") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Obtener direction_id del vínculo
  const { data: link } = await supabase
    .from("profile_has_direction")
    .select("direction_id")
    .eq("profile_direction_id", profileDirectionId)
    .eq("profile_id", user.id)
    .single();
  if (!link) return { error: "Dirección no encontrada" };

  const { error } = await supabase
    .from("direction")
    .update(parsed.data)
    .eq("direction_id", link.direction_id);
  if (error) return { error: error.message };

  revalidatePath("/client", "layout");
}

export async function deleteDirection(profileDirectionId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profile_has_direction")
    .delete()
    .eq("profile_direction_id", profileDirectionId)
    .eq("profile_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/client", "layout");
}

export async function setDefaultDirection(profileDirectionId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Quitar default de todas
  await supabase
    .from("profile_has_direction")
    .update({ is_default: false })
    .eq("profile_id", user.id);

  // Poner default en la seleccionada
  const { error } = await supabase
    .from("profile_has_direction")
    .update({ is_default: true })
    .eq("profile_direction_id", profileDirectionId)
    .eq("profile_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/client", "layout");
}
