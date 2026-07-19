import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NearestLocationRedirect } from "@/components/client/nearest-location";

export default async function ClientPage() {
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from("location")
    .select("location_id, name, latitude, longitude")
    .eq("estatus", true)
    .order("name");

  if (!locations || locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground px-4">
        <p className="text-sm text-center">No hay ubicaciones disponibles por el momento.</p>
      </div>
    );
  }

  // Una sola ubicación activa: directo, sin pedir permiso de geolocalización.
  if (locations.length === 1) {
    redirect(`/client/menu?location=${locations[0].location_id}`);
  }

  // Varias ubicaciones: pedir geolocalización y elegir la más cercana.
  return <NearestLocationRedirect locations={locations} />;
}
