import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

function redirectByRole(roleName: string): string {
  const r = roleName.toLowerCase().trim();
  if (r === "admin" || r === "staff") return "/admin";
  return "/client";
}

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const { data: roleData } = await supabase
      .from("profile_has_role")
      .select("roles(name)")
      .eq("profile_id", session.user.id)
      .limit(1)
      .single();

    const rolesRaw = roleData?.roles as unknown as { name: string } | { name: string }[] | null;
    const roleName = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw)?.name ?? "customer";
    redirect(redirectByRole(roleName));
  }

  return <LoginForm />;
}
