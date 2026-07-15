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

  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
}

export async function addUserRole(userId: string, roleId: string) {
  const supabase = await createServerClient();

  // Verifica si ya tiene ese rol
  const { data: existing } = await supabase
    .from("profile_has_role")
    .select("profile_role_id")
    .eq("profile_id", userId)
    .eq("role_id", roleId)
    .single();

  if (existing) return { error: "El usuario ya tiene ese rol" };

  const { error } = await supabase
    .from("profile_has_role")
    .insert({ profile_id: userId, role_id: roleId });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeUserRole(profileRoleId: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("profile_has_role")
    .delete()
    .eq("profile_role_id", profileRoleId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteUser(userId: string) {
  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

// ─── Asignación de trucks (para restringir acceso por RLS) ────────────────────

export async function addUserTruck(userId: string, foodTruckId: number) {
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from("profile_has_food_truck")
    .select("profile_food_truck_id")
    .eq("profile_id", userId)
    .eq("food_truck_id", foodTruckId)
    .single();

  if (existing) return { error: "El usuario ya está asignado a ese truck" };

  const { error } = await supabase
    .from("profile_has_food_truck")
    .insert({ profile_id: userId, food_truck_id: foodTruckId });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeUserTruck(profileFoodTruckId: number) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("profile_has_food_truck")
    .delete()
    .eq("profile_food_truck_id", profileFoodTruckId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}
