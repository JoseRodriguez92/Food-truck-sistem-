import { createClient } from "@/lib/supabase/server";
import { MenusView } from "@/components/admin/views/menus-view";

export const metadata = { title: "Menús — Admin" };

export default async function MenusPage() {
  const supabase = await createClient();

  const [{ data: menus }, { data: trucks }, { data: products }, { data: combos }] =
    await Promise.all([
      supabase
        .from("menu")
        .select(`
          menu_id, name, description, food_truck_id,
          food_truck(name, color),
          menu_has_product(
            menu_product_id, product_id,
            product(product_id, name, price,
              product_has_image(product_image_id, image_url)
            )
          ),
          menu_has_combo(
            menu_combo_id, combo_id,
            combo(combo_id, name, price,
              combo_has_product(
                product_id,
                product(product_has_image(image_url))
              )
            )
          )
        `)
        .order("menu_id"),
      supabase.from("food_truck").select("food_truck_id, name").order("name"),
      supabase.from("product").select("product_id, name, price").order("name"),
      supabase.from("combo").select("combo_id, name, price").order("name"),
    ]);

  return (
    <MenusView
      menus={(menus ?? []) as never}
      trucks={trucks ?? []}
      allProducts={products ?? []}
      allCombos={combos ?? []}
    />
  );
}
