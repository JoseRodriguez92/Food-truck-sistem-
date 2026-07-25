import { createClient } from "@/lib/supabase/server";
import { hasDashboardAccess } from "@/lib/auth/get-redirect-by-role";
import { ClientSidebar } from "@/components/client/client-sidebar";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Guest browsing: el menú es público, el login solo se exige al confirmar el pedido (checkout).
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("first_name, last_name, email, avatar_url")
        .eq("id", user.id)
        .single()
    : { data: null };

  // Si el usuario también tiene rol admin/employ/socio, se le ofrece un atajo al panel.
  let canAccessDashboard = false;
  if (user) {
    const { data: roleRows } = await supabase
      .from("profile_has_role")
      .select("roles(name)")
      .eq("profile_id", user.id);
    const roleNames = (roleRows ?? []).map((r) => {
      const roles = r.roles as unknown as { name: string } | { name: string }[] | null;
      const role = Array.isArray(roles) ? roles[0] : roles;
      return role?.name ?? "";
    });
    canAccessDashboard = hasDashboardAccess(roleNames);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ClientSidebar profile={profile} canAccessDashboard={canAccessDashboard} />
      <main className="flex-1 min-w-0 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
