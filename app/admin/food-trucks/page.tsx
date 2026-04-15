import { createClient } from "@/lib/supabase/server";
import { FoodTrucksView } from "@/components/admin/views/food-trucks-view";

export const metadata = { title: "Food Trucks — Admin" };

export default async function FoodTrucksPage() {
  const supabase = await createClient();

  const { data: trucks } = await supabase
    .from("food_truck")
    .select("food_truck_id, name, registration, color")
    .order("food_truck_id");

  return <FoodTrucksView trucks={trucks ?? []} />;
}
