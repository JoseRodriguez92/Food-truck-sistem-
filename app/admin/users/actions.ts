"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sendWelcomeEmail } from "@/app/actions/send-welcome-email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const createUserSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  first_name: z.string().min(1, "El nombre es requerido"),
  last_name: z.string().optional(),
  role_id: z.string().min(1, "Selecciona un rol"),
});

const updateUserSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido"),
  last_name: z.string().optional(),
  status: z.enum(["pending", "active", "inactive", "suspended"]),
});

export async function createUser(formData: FormData) {
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name") || undefined,
    role_id: formData.get("role_id"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const admin = adminClient();

  // 1. Crear usuario en Auth
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
  if (authError) return { error: authError.message };

  const userId = authData.user.id;

  // 2. Actualizar perfil
  await admin
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      email: parsed.data.email,
      status: "active",
    })
    .eq("id", userId);

  // 3. Asignar rol
  await admin.from("profile_has_role").insert({
    profile_id: userId,
    role_id: parsed.data.role_id,
  });

  // 4. Enviar correo de bienvenida con link para establecer contraseña
  await sendWelcomeEmail(parsed.data.email, parsed.data.first_name);

  revalidatePath("/admin/users");
}

export async function updateUser(userId: string, formData: FormData) {
  const parsed = updateUserSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      status: parsed.data.status,
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
}

export async function changeUserRole(userId: string, roleId: string) {
  const supabase = await createServerClient();

  // Reemplaza el rol actual (upsert por profile_id)
  const { error: delError } = await supabase
    .from("profile_has_role")
    .delete()
    .eq("profile_id", userId);

  if (delError) return { error: delError.message };

  const { error } = await supabase
    .from("profile_has_role")
    .insert({ profile_id: userId, role_id: roleId });

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
}
