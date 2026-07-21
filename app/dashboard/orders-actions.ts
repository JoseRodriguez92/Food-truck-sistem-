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
    .select("id, first_name, last_name, email, profile_has_role(roles(code))")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);

  return (data ?? []).map((p) => {
    const roleRows = p.profile_has_role as unknown as { roles: { code: string } | { code: string }[] | null }[];
    const isSocio = (roleRows ?? []).some((r) => {
      const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return role?.code === "socio";
    });
    return { id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email, isSocio };
  });
}

// ─── Catálogo de productos/combos para armar el pedido ────────────────────────

export async function getCatalogForOrder() {
  const supabase = await createClient();

  const [{ data: products }, { data: combos }] = await Promise.all([
    supabase.from("product").select("product_id, name, price, partner_price").order("name"),
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

  // Historial completo (activas e inactivas) — se usa para filtrar pedidos
  // viejos por truck, aunque la ubicación de ese pedido ya no esté activa hoy.
  if (admin) {
    const { data } = await supabase
      .from("location")
      .select("location_id, name, food_truck_id, estatus, food_truck(name)")
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
    .select("location_id, name, food_truck_id, estatus, food_truck(name)")
    .in("food_truck_id", truckIds)
    .order("name");
  return data ?? [];
}

// Para el picker del diálogo "Nuevo pedido" — un truck solo puede estar en
// una ubicación a la vez, así que acá sí filtramos a la activa (estatus = true).
export async function getLocationsForOrder() {
  const all = await getAccessibleLocations();
  return all.filter((l) => (l as { estatus?: boolean }).estatus !== false);
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
  isCourtesy: z.boolean().optional(),
  courtesyReason: z.string().optional(),
  items: z.array(itemSchema).min(1, "Agregá al menos un producto"),
});

export async function createManualOrder(input: {
  profileId: string | null;
  locationId: number | null;
  notes?: string;
  isCourtesy?: boolean;
  courtesyReason?: string;
  items: { type: "product" | "combo"; itemId: number; name: string; price: number; quantity: number }[];
}) {
  const parsed = createManualOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const isCourtesy = !!parsed.data.isCourtesy;
  const courtesyReason = parsed.data.courtesyReason?.trim() ?? "";
  if (isCourtesy && !courtesyReason) {
    return { error: "Debes indicar el motivo de la cortesía" };
  }

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
  const discountTotal = isCourtesy ? subtotal : 0;
  const total = isCourtesy ? 0 : subtotal;

  // 3. Crear profile_has_order
  const { data: order, error: orderErr } = await supabase
    .from("profile_has_order")
    .insert({
      profile_id: parsed.data.profileId,
      status_order_id: statusPending.status_order_id,
      location_id: parsed.data.locationId,
      subtotal,
      discount_total: discountTotal,
      total,
      is_courtesy: isCourtesy,
      courtesy_reason: isCourtesy ? courtesyReason : null,
      courtesy_by: isCourtesy ? user.id : null,
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

const updateManualOrderSchema = z.object({
  profileOrderId: z.string().uuid(),
  notes: z.string().optional(),
  isCourtesy: z.boolean().optional(),
  courtesyReason: z.string().optional(),
  items: z.array(itemSchema).min(1, "Agregá al menos un producto"),
});

export async function updateManualOrder(input: {
  profileOrderId: string;
  notes?: string;
  isCourtesy?: boolean;
  courtesyReason?: string;
  items: { type: "product" | "combo"; itemId: number; name: string; price: number; quantity: number }[];
}) {
  const parsed = updateManualOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const isCourtesy = !!parsed.data.isCourtesy;
  const courtesyReason = parsed.data.courtesyReason?.trim() ?? "";
  if (isCourtesy && !courtesyReason) {
    return { error: "Debes indicar el motivo de la cortesía" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: order, error: orderErr } = await supabase
    .from("profile_has_order")
    .select("profile_order_id, order_number")
    .eq("profile_order_id", parsed.data.profileOrderId)
    .single();
  if (orderErr || !order) return { error: "Pedido no encontrado" };

  const subtotal = parsed.data.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const discountTotal = isCourtesy ? subtotal : 0;
  const total = isCourtesy ? 0 : subtotal;

  const { error: deleteErr } = await supabase
    .from("order_detail")
    .delete()
    .eq("profile_order_id", parsed.data.profileOrderId);
  if (deleteErr) return { error: deleteErr.message };

  const details = parsed.data.items.map((item) => ({
    profile_order_id: parsed.data.profileOrderId,
    product_id: item.type === "product" ? item.itemId : null,
    combo_id: item.type === "combo" ? item.itemId : null,
    quantity: item.quantity,
    unit_price: item.price,
    line_total: item.price * item.quantity,
  }));

  const { error: detailErr } = await supabase.from("order_detail").insert(details);
  if (detailErr) return { error: detailErr.message };

  const { error: updateErr } = await supabase
    .from("profile_has_order")
    .update({
      subtotal,
      discount_total: discountTotal,
      total,
      is_courtesy: isCourtesy,
      courtesy_reason: isCourtesy ? courtesyReason : null,
      courtesy_by: isCourtesy ? user.id : null,
      notes: parsed.data.notes?.trim() || null,
    })
    .eq("profile_order_id", parsed.data.profileOrderId);
  if (updateErr) return { error: updateErr.message };

  revalidatePath("/dashboard");
  return { success: true, orderNumber: order.order_number };
}

// ─── Eliminar pedido ────────────────────────────────────────────────────────

export async function deleteOrder(profileOrderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = await isCurrentUserAdmin(supabase, user.id);
  if (!admin) return { error: "Solo un admin puede eliminar pedidos" };

  const { data: order } = await supabase
    .from("profile_has_order")
    .select("profile_order_id, stock_deducted")
    .eq("profile_order_id", profileOrderId)
    .single();
  if (!order) return { error: "Pedido no encontrado" };

  // Devolver stock si ya se había descontado, antes de borrar el pedido.
  if (order.stock_deducted) {
    const { error: restockErr } = await supabase.rpc("restock_order_stock", {
      p_profile_order_id: profileOrderId,
    });
    if (restockErr) return { error: restockErr.message };
  }

  // El histórico de movimientos de inventario queda, solo se desvincula del pedido
  // (ingredient_stock_movement.profile_order_id bloquea el delete si sigue apuntando).
  await supabase
    .from("ingredient_stock_movement")
    .update({ profile_order_id: null })
    .eq("profile_order_id", profileOrderId);

  const { error: deleteErr } = await supabase
    .from("profile_has_order")
    .delete()
    .eq("profile_order_id", profileOrderId);
  if (deleteErr) return { error: deleteErr.message };

  revalidatePath("/dashboard");
  return { success: true };
}
