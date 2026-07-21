import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

// admin/employ/socio entran al panel — el resto (o sin rol) va al menú del cliente.
function hasDashboardAccess(roleNames: string[]): boolean {
  return roleNames.some((r) => {
    const code = r.toLowerCase().trim();
    return code === "admin" || code === "employ" || code === "socio";
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    if (redirectTo?.startsWith("/")) redirect(redirectTo);

    // Un usuario puede tener varios roles — alcanza con que uno dé acceso al panel.
    const { data: roleRows } = await supabase
      .from("profile_has_role")
      .select("roles(name)")
      .eq("profile_id", session.user.id);

    const roleNames = (roleRows ?? []).map((r) => {
      const roles = r.roles as unknown as { name: string } | { name: string }[] | null;
      const role = Array.isArray(roles) ? roles[0] : roles;
      return role?.name ?? "";
    });

    redirect(hasDashboardAccess(roleNames) ? "/dashboard" : "/client");
  }

  return <LoginForm redirectTo={redirectTo} />;
}
