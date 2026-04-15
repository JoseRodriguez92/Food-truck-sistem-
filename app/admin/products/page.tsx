import { createClient } from "@/lib/supabase/server";
import { ProductsView } from "@/components/admin/views/products-view";

export const metadata = { title: "Productos — Admin" };

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("product")
    .select(`
      product_id, name, description, price,
      product_has_image(product_image_id, image_url),
      product_has_type(product_type_id, type)
    `)
    .order("product_id");

  return <ProductsView products={products ?? []} />;
}
