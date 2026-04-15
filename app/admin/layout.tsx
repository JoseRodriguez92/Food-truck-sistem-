import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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

  // Verificar rol
  const { data: roleData } = await supabase
    .from("profile_has_role")
    .select("roles(name)")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  const rolesRaw = roleData?.roles as unknown as { name: string } | { name: string }[] | null;
  const roleName = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw)?.name?.toLowerCase();
  if (roleName !== "admin" && roleName !== "staff") redirect("/menu");

  // Perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar profile={profile} />
      <main className="flex-1 overflow-auto lg:ml-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
