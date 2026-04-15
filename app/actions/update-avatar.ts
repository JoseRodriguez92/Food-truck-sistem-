"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const BUCKET = "avatars";

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "No se recibió ningún archivo" };

  const maxSize = 3 * 1024 * 1024; // 3MB
  if (file.size > maxSize) return { error: "La imagen no puede pesar más de 3MB" };

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) return { error: "Formato no permitido. Usa JPG, PNG, WEBP o GIF" };

  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  // Usamos admin para evitar problemas de RLS en el bucket
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

  // Guardar URL con cache-buster para forzar recarga de imagen
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/admin", "layout");
  revalidatePath("/client", "layout");
  return { success: true, avatarUrl };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/admin", "layout");
  revalidatePath("/client", "layout");
  return { success: true };
}
