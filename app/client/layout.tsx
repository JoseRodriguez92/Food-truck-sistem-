import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="flex min-h-screen bg-background">
      <ClientSidebar profile={profile} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
