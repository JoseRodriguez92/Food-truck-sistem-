import { createClient } from "@/lib/supabase/server";
import { CategoriesView, type Category } from "@/components/admin/views/categories-view";

export const metadata = { title: "Categorías — Admin" };

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("category")
    .select("category_id, name, description, created_at")
    .order("name");

  return <CategoriesView categories={(categories ?? []) as Category[]} />;
}
