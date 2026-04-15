import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientSidebar } from "@/components/client/client-sidebar";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  // Fetch ubicaciones con sus food trucks para el sidebar
  const { data: locations } = await supabase
    .from("location")
    .select(`
      location_id, name, city,
      food_truck(food_truck_id, name, color)
    `)
    .order("name");

  return (
    <div className="flex min-h-screen bg-background">
      <ClientSidebar profile={profile} locations={locations ?? []} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
