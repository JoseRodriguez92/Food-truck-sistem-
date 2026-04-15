"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const foodTruckSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  registration: z.string().min(1, "La matrícula es requerida"),
  color: z.string().nullable().optional(),
});

export async function createFoodTruck(formData: FormData) {
  const parsed = foodTruckSchema.safeParse({
    name: formData.get("name"),
    registration: formData.get("registration"),
    color: formData.get("color") || null,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("food_truck").insert(parsed.data);

  if (error) return { error: error.message };
  revalidatePath("/admin/food-trucks");
}

export async function updateFoodTruck(id: number, formData: FormData) {
  const parsed = foodTruckSchema.safeParse({
    name: formData.get("name"),
    registration: formData.get("registration"),
    color: formData.get("color") || null,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_truck")
    .update(parsed.data)
    .eq("food_truck_id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/food-trucks");
}

export async function deleteFoodTruck(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("food_truck")
    .delete()
    .eq("food_truck_id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/food-trucks");
}
