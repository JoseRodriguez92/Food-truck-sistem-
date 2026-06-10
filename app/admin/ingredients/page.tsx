import { createClient } from "@/lib/supabase/server";
import { IngredientsView } from "@/components/admin/views/ingredients-view";

export const metadata = { title: "Ingredientes — Admin" };

export default async function IngredientsPage() {
  const supabase = await createClient();

  // Fetch food trucks
  const { data: trucks } = await supabase
    .from("food_truck")
    .select("food_truck_id, name")
    .order("name");

  // Fetch ingredientes
  const { data: ingredients } = await supabase
    .from("ingredient")
    .select("ingredient_id, name, unit, description, created_at")
    .order("name");

  return (
    <IngredientsView ingredients={ingredients ?? []} trucks={trucks ?? []} />
  );
}
