"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const locationSchema = z.object({
  name:          z.string().min(1, "El nombre es requerido"),
  address:       z.string().optional(),
  city:          z.string().optional(),
  country:       z.string().optional(),
  food_truck_id: z.coerce.number({ invalid_type_error: "Selecciona un food truck" }).min(1, "Selecciona un food truck"),
  estatus:       z.enum(["true", "false"]).transform((v) => v === "true").default("true"),
  latitude:      z.coerce.number().optional(),
  longitude:     z.coerce.number().optional(),
});

export async function createLocation(formData: FormData) {
  const parsed = locationSchema.safeParse({
    name:          formData.get("name"),
    address:       formData.get("address")   || undefined,
    city:          formData.get("city")      || undefined,
    country:       formData.get("country")   || undefined,
    food_truck_id: formData.get("food_truck_id"),
    estatus:       formData.get("estatus") ?? "true",
    latitude:      formData.get("latitude")  || undefined,
    longitude:     formData.get("longitude") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { latitude, longitude, ...base } = parsed.data;
  const payload = {
    ...base,
    ...(latitude  != null ? { latitude }  : {}),
    ...(longitude != null ? { longitude } : {}),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("location").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
}

export async function updateLocation(locationId: number, formData: FormData) {
  const parsed = locationSchema.safeParse({
    name:          formData.get("name"),
    address:       formData.get("address")   || undefined,
    city:          formData.get("city")      || undefined,
    country:       formData.get("country")   || undefined,
    food_truck_id: formData.get("food_truck_id"),
    estatus:       formData.get("estatus") ?? "true",
    latitude:      formData.get("latitude")  || undefined,
    longitude:     formData.get("longitude") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { latitude, longitude, ...base } = parsed.data;
  const payload = {
    ...base,
    ...(latitude  != null ? { latitude }  : {}),
    ...(longitude != null ? { longitude } : {}),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("location")
    .update(payload)
    .eq("location_id", locationId);
  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
}

export async function deleteLocation(locationId: number) {
  const supabase = await createClient();

  // Verificar que no tenga menús asignados
  const { count } = await supabase
    .from("location_has_menu")
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId);

  if (count && count > 0)
    return { error: `No se puede eliminar: tiene ${count} menú(s) asignado(s).` };

  const { error } = await supabase
    .from("location")
    .delete()
    .eq("location_id", locationId);
  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
}

export async function assignMenuToLocation(locationId: number, menuId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("location_has_menu")
    .insert({ location_id: locationId, menu_id: menuId });
  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
}

export async function removeMenuFromLocation(locationMenuId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("location_has_menu")
    .delete()
    .eq("location_menu_id", locationMenuId);
  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
}

export async function getMenuDetail(menuId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu")
    .select(`
      menu_id, name,
      menu_has_product(
        menu_product_id, product_id,
        product(
          product_id, name, price,
          product_has_type(product_type_id, type),
          product_has_image(product_image_id, image_url)
        )
      ),
      menu_has_combo(
        menu_combo_id, combo_id,
        combo(
          combo_id, name, price,
          combo_has_product(
            combo_product_id,
            product(product_id, name, product_has_image(product_image_id, image_url))
          )
        )
      )
    `)
    .eq("menu_id", menuId)
    .single();

  if (error) return { error: error.message };
  return { data };
}
