"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor a 0"),
  partnerPrice: z.coerce.number().min(0, "El precio socio debe ser mayor a 0").optional(),
});

export async function createProduct(formData: FormData) {
  const rawPartnerPrice = formData.get("partnerPrice");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    partnerPrice: rawPartnerPrice ? rawPartnerPrice : undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { partnerPrice, ...rest } = parsed.data;
  const { error } = await supabase.from("product").insert({ ...rest, partner_price: partnerPrice ?? null });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function updateProduct(id: number, formData: FormData) {
  const rawPartnerPrice = formData.get("partnerPrice");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    partnerPrice: rawPartnerPrice ? rawPartnerPrice : undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { partnerPrice, ...rest } = parsed.data;
  const { error } = await supabase
    .from("product")
    .update({ ...rest, partner_price: partnerPrice ?? null })
    .eq("product_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteProduct(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("product").delete().eq("product_id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function addProductImage(productId: number, imageUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_image")
    .insert({ product_id: productId, image_url: imageUrl });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteProductImage(productImageId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_image")
    .delete()
    .eq("product_image_id", productImageId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function addProductType(productId: number, type: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_type")
    .insert({ product_id: productId, type: type.trim() });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function deleteProductType(productTypeId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_type")
    .delete()
    .eq("product_type_id", productTypeId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function addProductIngredient(productId: number, ingredientId: number, quantity: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_ingredient")
    .insert({ product_id: productId, ingredient_id: ingredientId, quantity });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function setProductCategory(productId: number, categoryId: number | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product")
    .update({ category_id: categoryId })
    .eq("product_id", productId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

export async function removeProductIngredient(productIngredientId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_has_ingredient")
    .delete()
    .eq("product_ingredient_id", productIngredientId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}
