import { createClient } from "@/lib/supabase/server";
import { IngredientsView, type Ingredient } from "@/components/admin/views/ingredients-view";

export const metadata = { title: "Ingredientes — Admin" };

export default async function IngredientsPage() {
  const supabase = await createClient();

  const { data: ingredients } = await supabase
    .from("ingredient")
    .select("ingredient_id, name, unit, stock, description, created_at")
    .order("name");

  return <IngredientsView ingredients={(ingredients ?? []) as Ingredient[]} />;
}
