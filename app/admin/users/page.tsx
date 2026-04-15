import { createClient } from "@/lib/supabase/server";
import { UsersView } from "@/components/admin/views/users-view";

export const metadata = { title: "Usuarios — Admin" };

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, first_name, last_name, email,
        status, created_at,
        profile_has_role(
          profile_role_id, role_id,
          roles(role_id, name)
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("roles").select("role_id, name").order("name"),
  ]);

  return <UsersView users={users ?? []} roles={roles ?? []} />;
}
