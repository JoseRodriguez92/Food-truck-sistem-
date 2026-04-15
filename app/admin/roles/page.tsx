import { createClient } from "@/lib/supabase/server";
import { RolesView } from "@/components/admin/views/roles-view";

export const metadata = { title: "Roles — Admin" };

export default async function RolesPage() {
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from("roles")
    .select(`
      role_id, name, description, created_at,
      profile_has_role(count)
    `)
    .order("created_at");

  return <RolesView roles={roles ?? []} />;
}
