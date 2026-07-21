import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PermissionsProvider } from "@/contexts/PermissionsContext";

export const metadata = { title: "Admin — 3 Street Food" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verificar rol — un usuario puede tener varios roles, alcanza con que uno sea admin/employ/socio
  const { data: roleRows } = await supabase
    .from("profile_has_role")
    .select("roles(name)")
    .eq("profile_id", user.id);

  const hasAccess = (roleRows ?? []).some((r) => {
    const roles = r.roles as unknown as { name: string } | { name: string }[] | null;
    const role = Array.isArray(roles) ? roles[0] : roles;
    const code = role?.name?.toLowerCase();
    return code === "admin" || code === "employ" || code === "socio";
  });
  if (!hasAccess) redirect("/client");

  // Perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <PermissionsProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar profile={profile} />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </PermissionsProvider>
  );
}
