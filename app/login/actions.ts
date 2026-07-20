"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getRedirectByRole } from "@/lib/auth/get-redirect-by-role";

export type LoginResult = { error: string } | { redirect: string } | undefined;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function login(formData: FormData) {
  try {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = formData.get("redirect") as string | null;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // Si por alguna razon no viene usuario, devolvemos error controlado.
    if (!authData.user?.id) {
      return { error: "No se pudo iniciar sesion. Intenta nuevamente." };
    }

    // Consultar el rol del usuario sin lanzar error si no hay fila.
    const { data: roleData } = await supabase
      .from("profile_has_role")
      .select("roles(name)")
      .eq("profile_id", authData.user.id)
      .limit(1)
      .maybeSingle();

    const rolesRaw = roleData?.roles as unknown as { name: string } | { name: string }[] | null;
    const roleName = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw)?.name ?? "customer";

    // Si venia de un flujo con retorno explicito (ej. guest checkout), respetarlo.
    const destination =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : getRedirectByRole(roleName);

    revalidatePath("/", "layout");
    return { redirect: destination };
  } catch (err) {
    console.error("[login] unexpected error", err);
    return {
      error:
        "Error temporal del servidor al iniciar sesion. Intenta de nuevo en unos segundos.",
    };
  }
}

export async function register(
  formData: FormData
): Promise<{ error: string } | { redirect: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("first_name") as string;
  const redirectTo = formData.get("redirect") as string | null;

  if (!email || !password || !firstName) {
    return { error: "Completa todos los campos" };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  const admin = adminClient();

  // 1. Crear usuario ya confirmado — sin fricción de email para el registro rápido
  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });
  if (createError) {
    const msg = createError.message.includes("already been registered")
      ? "Ya existe una cuenta con este correo"
      : createError.message;
    return { error: msg };
  }

  // 2. Actualizar el perfil (el trigger handle_new_user ya lo creó)
  await admin
    .from("profiles")
    .update({ first_name: firstName, email, status: "active" })
    .eq("id", authData.user.id);

  // 3. Asignar rol "client"
  const { data: clientRole } = await admin
    .from("roles")
    .select("role_id")
    .eq("code", "client")
    .single();
  if (clientRole) {
    await admin
      .from("profile_has_role")
      .insert({ profile_id: authData.user.id, role_id: clientRole.role_id });
  }

  // 4. Loguear en el browser (setea las cookies de sesión vía el client normal)
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: signInError.message };

  revalidatePath("/", "layout");
  return { redirect: redirectTo && redirectTo.startsWith("/") ? redirectTo : "/client" };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
