import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/admin/dashboard-sidebar";
import { PermissionsProvider } from "@/contexts/PermissionsContext";

export const metadata = { title: "Panel — 3 Street Food" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verificar rol
  const { data: roleData } = await supabase
    .from("profile_has_role")
    .select("roles(name)")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  const rolesRaw = roleData?.roles as unknown as { name: string } | { name: string }[] | null;
  const roleName = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw)?.name?.toLowerCase();
  if (roleName !== "admin" && roleName !== "employ") redirect("/menu");

  // Perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <PermissionsProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Suspense fallback={null}>
          <DashboardSidebar profile={profile} />
        </Suspense>
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 scrollbar-brand">{children}</main>
      </div>
    </PermissionsProvider>
  );
}
