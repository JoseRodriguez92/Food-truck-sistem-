"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getRedirectByRole(roleName: string): string {
  const normalized = roleName.toLowerCase().trim();
  if (normalized === "admin" || normalized === "staff") return "/admin";
  return "/client";
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Consultar el rol del usuario
  const { data: roleData } = await supabase
    .from("profile_has_role")
    .select("roles(name)")
    .eq("profile_id", authData.user.id)
    .limit(1)
    .single();

  const rolesRaw = roleData?.roles as unknown as { name: string } | { name: string }[] | null;
  const roleName = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw)?.name ?? "customer";
  const destination = getRedirectByRole(roleName);

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
