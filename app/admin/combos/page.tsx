import { createClient } from "@/lib/supabase/server";
import { CombosView } from "@/components/admin/views/combos-view";

export const metadata = { title: "Combos — Admin" };

export default async function CombosPage() {
  const supabase = await createClient();

  const [{ data: combos }, { data: products }] = await Promise.all([
    supabase
      .from("combo")
      .select(`
        combo_id, name, description, price,
        combo_has_product(
          combo_product_id,
          product_id,
          product(product_id, name, price, product_has_image(product_image_id, image_url))
        )
      `)
      .order("combo_id"),
    supabase
      .from("product")
      .select("product_id, name, price")
      .order("name"),
  ]);

  return <CombosView combos={(combos ?? []) as never} allProducts={products ?? []} />;
}
