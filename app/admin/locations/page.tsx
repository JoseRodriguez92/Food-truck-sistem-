import { createClient } from "@/lib/supabase/server";
import { LocationsView } from "@/components/admin/views/locations-view";

export const metadata = { title: "Ubicaciones — Admin" };

export default async function LocationsPage() {
  const supabase = await createClient();

  const [{ data: locations }, { data: trucks }, { data: menus }] = await Promise.all([
    supabase
      .from("location")
      .select(`
        location_id, name, address, city, country,
        food_truck_id,
        food_truck(food_truck_id, name, color),
        location_has_menu(
          location_menu_id, menu_id,
          menu(menu_id, name)
        )
      `)
      .order("food_truck_id")
      .order("name"),
    supabase.from("food_truck").select("food_truck_id, name, color").order("name"),
    supabase.from("menu").select("menu_id, name").order("name"),
  ]);

  return (
    <LocationsView
      locations={locations ?? []}
      trucks={trucks ?? []}
      menus={menus ?? []}
    />
  );
}
