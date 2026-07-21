import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/admin/dashboard-sidebar";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { TruckStoreInit } from "@/components/admin/truck-store-init";

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

  const { data: trucks } = await supabase
    .from("food_truck")
    .select("food_truck_id, name")
    .order("name");

  return (
    <PermissionsProvider>
      <TruckStoreInit trucks={trucks ?? []} />
      <div className="flex h-screen overflow-hidden bg-background">
        <Suspense fallback={null}>
          <DashboardSidebar profile={profile} />
        </Suspense>
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 scrollbar-brand">{children}</main>
      </div>
    </PermissionsProvider>
  );
}
