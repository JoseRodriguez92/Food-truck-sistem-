import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClientPage() {
  const supabase = await createClient();

  // Redirigir a la primera ubicación disponible
  const { data: locations } = await supabase
    .from("location")
    .select("location_id")
    .order("name")
    .limit(1);

  if (locations && locations.length > 0) {
    redirect(`/client/menu?location=${locations[0].location_id}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground px-4">
      <p className="text-sm text-center">No hay ubicaciones disponibles por el momento.</p>
    </div>
  );
}
