"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ─── Buscar clientes (para el picker del pedido manual) ───────────────────────

export async function searchCustomers(query: string) {
  const q = query.trim().replace(/[,()]/g, " ").trim();
  if (!q) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);

  return data ?? [];
}

// ─── Catálogo de productos/combos para armar el pedido ────────────────────────

export async function getCatalogForOrder() {
  const supabase = await createClient();

  const [{ data: products }, { data: combos }] = await Promise.all([
    supabase.from("product").select("product_id, name, price").order("name"),
    supabase.from("combo").select("combo_id, name, price").eq("active", true).order("name"),
  ]);

  return {
    products: products ?? [],
    combos: combos ?? [],
  };
}

// ─── Ubicaciones accesibles por el usuario actual ─────────────────────────────
// Admin ve todas. Staff (Employ) solo las ubicaciones de los trucks a los que
// esté asignado en profile_has_food_truck (ver assign_employees_to_trucks.sql).
// Se usa tanto para el picker de "Nuevo pedido" como para el filtro de Pedidos.

async function isCurrentUserAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profile_has_role")
    .select("roles(code)")
    .eq("profile_id", userId);

  return (data ?? []).some((r) => {
    const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
    return role?.code === "admin";
  });
}

export async function getAccessibleLocations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = await isCurrentUserAdmin(supabase, user.id);

  if (admin) {
    const { data } = await supabase
      .from("location")
      .select("location_id, name, food_truck(name)")
      .order("name");
    return data ?? [];
  }

  const { data: assigned } = await supabase
    .from("profile_has_food_truck")
    .select("food_truck_id")
    .eq("profile_id", user.id);
  const truckIds = (assigned ?? []).map((a) => a.food_truck_id);
  if (truckIds.length === 0) return [];

  const { data } = await supabase
    .from("location")
    .select("location_id, name, food_truck(name)")
    .in("food_truck_id", truckIds)
    .order("name");
  return data ?? [];
}

// Alias con nombre más explícito para el picker del diálogo "Nuevo pedido"
export async function getLocationsForOrder() {
  return getAccessibleLocations();
}

// ─── Crear pedido manual (mostrador) ───────────────────────────────────────────

const itemSchema = z.object({
  type: z.enum(["product", "combo"]),
  itemId: z.number(),
  name: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
});

const createManualOrderSchema = z.object({
  profileId: z.string().uuid().nullable(),
  locationId: z.number({ required_error: "Elegí una ubicación", invalid_type_error: "Elegí una ubicación" }),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Agregá al menos un producto"),
});

export async function createManualOrder(input: {
  profileId: string | null;
  locationId: number | null;
  notes?: string;
  items: { type: "product" | "combo"; itemId: number; name: string; price: number; quantity: number }[];
}) {
  const parsed = createManualOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // 1. Estado "pending"
  const { data: statusPending } = await supabase
    .from("status_order")
    .select("status_order_id")
    .eq("code", "pending")
    .single();
  if (!statusPending) return { error: "Estado 'pending' no encontrado" };

  // 2. Totales
  const subtotal = parsed.data.items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  // 3. Crear profile_has_order
  const { data: order, error: orderErr } = await supabase
    .from("profile_has_order")
    .insert({
      profile_id: parsed.data.profileId,
      status_order_id: statusPending.status_order_id,
      location_id: parsed.data.locationId,
      subtotal,
      total: subtotal,
      notes: parsed.data.notes?.trim() || null,
    })
    .select("profile_order_id, order_number")
    .single();
  if (orderErr || !order) return { error: orderErr?.message ?? "Error creando el pedido" };

  // 4. Líneas del pedido
  const details = parsed.data.items.map((item) => ({
    profile_order_id: order.profile_order_id,
    product_id: item.type === "product" ? item.itemId : null,
    combo_id: item.type === "combo" ? item.itemId : null,
    quantity: item.quantity,
    unit_price: item.price,
    line_total: item.price * item.quantity,
  }));
  const { error: detailErr } = await supabase.from("order_detail").insert(details);
  if (detailErr) return { error: detailErr.message };

  // 5. Historial de estado
  await supabase.from("order_has_status").insert({
    profile_order_id: order.profile_order_id,
    status_order_id: statusPending.status_order_id,
    changed_by: user.id,
    notes: "Pedido creado manualmente desde el panel",
  });

  revalidatePath("/dashboard");
  return { success: true, orderNumber: order.order_number };
}
