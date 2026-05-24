import { createClient } from "@/lib/supabase/server";
import { ProductsView } from "@/components/admin/views/products-view";

export const metadata = { title: "Productos — Admin" };

export default async function ProductsPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: ingredients }, { data: categories }] = await Promise.all([
    supabase
      .from("product")
      .select(`
        product_id, name, description, price, category_id,
        category(category_id, name),
        product_has_image(product_image_id, image_url),
        product_has_type(product_type_id, type),
        product_has_ingredient(
          product_ingredient_id, quantity,
          ingredient(ingredient_id, name, unit)
        )
      `)
      .order("product_id"),
    supabase.from("ingredient").select("ingredient_id, name, unit").order("name"),
    supabase.from("category").select("category_id, name").order("name"),
  ]);

  return (
    <ProductsView
      products={(products ?? []) as unknown as import("@/components/admin/views/products-view").Product[]}
      allIngredients={ingredients ?? []}
      allCategories={categories ?? []}
    />
  );
}
