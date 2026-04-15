"use server";

import { createClient } from "@supabase/supabase-js";

export type UpdateEmailResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Cambia el correo de un usuario usando el Admin API de Supabase.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en el .env.local
 * (nunca se expone al cliente — solo se ejecuta en el servidor).
 */
export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<UpdateEmailResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Actualizar email en Supabase Auth (Admin API)
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { email: newEmail, email_confirm: true } // aplica inmediato, sin correo de confirmación
    );

    if (authError) throw authError;

    // 2. Sincronizar email en la tabla profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", userId);

    if (profileError) throw profileError;

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[updateUserEmail]", message);
    return { success: false, error: message };
  }
}
