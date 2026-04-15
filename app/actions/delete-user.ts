"use server";

import { createClient } from "@supabase/supabase-js";

export type DeleteUserResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Elimina completamente un usuario del sistema respetando el orden
 * de las restricciones de clave foránea (FK).
 *
 * Orden de eliminación (de hijos a padres):
 *   psych_parent_meeting → psych_case
 *   → student/teacher/admin/parent enrolled
 *   → profiles_roles → profiles → auth.users
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY (solo servidor, nunca expuesto al cliente).
 */
export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── Paso 1: Resolver FKs en cadena (psych) ────────────────────────────
    // Obtener los IDs de psych_case relacionados con el usuario
    const { data: psychCases } = await supabase
      .from("psych_case")
      .select("id")
      .eq("user_id", userId);

    if (psychCases && psychCases.length > 0) {
      const caseIds = psychCases.map((c: any) => c.id);

      // Eliminar primero los hijos de psych_case
      const { error: pmError } = await supabase
        .from("psych_parent_meeting")
        .delete()
        .in("psych_case_id", caseIds);
      if (pmError) throw new Error(`psych_parent_meeting: ${pmError.message}`);

      // Luego eliminar psych_case
      const { error: pcError } = await supabase
        .from("psych_case")
        .delete()
        .eq("user_id", userId);
      if (pcError) throw new Error(`psych_case: ${pcError.message}`);
    }

    // ── Paso 2: Matrículas y asignaciones ────────────────────────────────
    const enrollmentTables = [
      "student_enrolled",
      "teacher_enrolled",
      "admin_enrolled",
      "parent_enrolled",
    ];

    for (const table of enrollmentTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId);
      // Ignorar error "no encontrado" (tabla puede no tener registro)
      if (error && !error.message.includes("no rows")) {
        console.warn(`[deleteUser] ${table}:`, error.message);
      }
    }

    // ── Paso 3: Roles del usuario ─────────────────────────────────────────
    const { error: rolesError } = await supabase
      .from("profiles_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesError) throw new Error(`profiles_roles: ${rolesError.message}`);

    // ── Paso 4: Perfil ────────────────────────────────────────────────────
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileError) throw new Error(`profiles: ${profileError.message}`);

    // ── Paso 5: Cuenta de Auth (Admin API) ───────────────────────────────
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`auth: ${authError.message}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[deleteUser]", message);
    return { success: false, error: message };
  }
}
