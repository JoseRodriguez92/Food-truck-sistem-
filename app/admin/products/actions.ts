"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor a 0"),
});

export async function createProduct(formData: FormData) {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("product").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("product")
    .update(parsed.data)
    .eq("product_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}

export async function deleteProduct(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("product").delete().eq("product_id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}

export async function addProductImage(productId: number, imageUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_image")
    .insert({ product_id: productId, image_url: imageUrl });
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}

export async function deleteProductImage(productImageId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_image")
    .delete()
    .eq("product_image_id", productImageId);
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}

export async function addProductType(productId: number, type: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_type")
    .insert({ product_id: productId, type: type.trim() });
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}

export async function deleteProductType(productTypeId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_type")
    .delete()
    .eq("product_type_id", productTypeId);
  if (error) return { error: error.message };
  revalidatePath("/admin/products");
}
