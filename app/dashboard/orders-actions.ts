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
// Se limita al menú (o menús) asignado a la ubicación elegida — no todo el catálogo global.

function toSingleRel<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function getCatalogForOrder(locationId?: number) {
  const supabase = await createClient();

  if (!locationId) return { products: [], combos: [] };

  const { data: locationMenus } = await supabase
    .from("location_has_menu")
    .select("menu_id")
    .eq("location_id", locationId);
  const menuIds = (locationMenus ?? []).map((lm) => lm.menu_id);
  if (menuIds.length === 0) return { products: [], combos: [] };

  const [{ data: menuProducts }, { data: menuCombos }] = await Promise.all([
    supabase
      .from("menu_has_product")
      .select("product(product_id, name, price, partner_price)")
      .in("menu_id", menuIds),
    supabase
      .from("menu_has_combo")
      .select("combo(combo_id, name, price, active)")
      .in("menu_id", menuIds),
  ]);

  type ProductRow = { product_id: number; name: string; price: number; partner_price: number | null };
  type ComboRow = { combo_id: number; name: string; price: number; active: boolean };

  const productsById = new Map<number, ProductRow>();
  for (const mp of menuProducts ?? []) {
    const p = toSingleRel<ProductRow>(mp.product as ProductRow | ProductRow[] | null);
    if (p) productsById.set(p.product_id, p);
  }

  const combosById = new Map<number, { combo_id: number; name: string; price: number }>();
  for (const mc of menuCombos ?? []) {
    const c = toSingleRel<ComboRow>(mc.combo as ComboRow | ComboRow[] | null);
    if (c && c.active) combosById.set(c.combo_id, { combo_id: c.combo_id, name: c.name, price: c.price });
  }

  return {
    products: [...productsById.values()].sort((a, b) => a.name.localeCompare(b.name)),
    combos: [...combosById.values()].sort((a, b) => a.name.localeCompare(b.name)),
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

  // Delete + insert en una sola transacción (RPC) — si dos guardados del mismo
  // pedido se solapan, no queda hueco entre medio para que las líneas se dupliquen.
  const details = parsed.data.items.map((item) => ({
    product_id: item.type === "product" ? item.itemId : null,
    combo_id: item.type === "combo" ? item.itemId : null,
    quantity: item.quantity,
    unit_price: item.price,
    line_total: item.price * item.quantity,
  }));

  const { error: detailErr } = await supabase.rpc("replace_order_detail", {
    p_profile_order_id: parsed.data.profileOrderId,
    p_items: details,
  });
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

// ─── Reporte de ventas (según filtros activos en Pedidos) ─────────────────────
// Arma el ranking de productos/combos vendidos (excluye cancelados), detecta si
// algún "socio" consumió algo, y separa el valor regalado en cortesías.

export type OrdersReportFilters = { status: string; q: string; from: string; to: string };

export type OrdersReportItem = {
  key: string;
  type: "product" | "combo";
  name: string;
  quantity: number;
  revenue: number;
  regularQuantity: number;
  courtesyQuantity: number;
  socioQuantity: number;
};

export type OrdersReportCategoryItem = {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
  regularQuantity: number;
  courtesyQuantity: number;
  socioQuantity: number;
};

export type CourtesyOrderDetail = {
  orderNumber: number;
  value: number;
  reason: string | null;
};

export type OrdersReport = {
  totalOrders: number;
  totalRevenue: number;
  regularOrders: number;
  regularRevenue: number;
  categories: OrdersReportCategoryItem[];
  products: OrdersReportItem[];
  courtesy: { count: number; value: number; orders: CourtesyOrderDetail[] };
  socios: { count: number; value: number; products: OrdersReportItem[] };
};

export async function getOrdersReport(
  filters: OrdersReportFilters,
  truckId: number | null,
): Promise<OrdersReport> {
  const supabase = await createClient();

  let truckLocationIds: number[] | null = null;
  if (truckId) {
    const allLocations = await getAccessibleLocations();
    truckLocationIds = allLocations
      .filter((l) => l.food_truck_id === truckId)
      .map((l) => l.location_id);
  }

  let query = supabase
    .from("profile_has_order")
    .select(
      `
      profile_order_id, order_number, total, subtotal, is_courtesy, courtesy_reason, profile_id, created_at,
      status_order(code),
      order_detail(
        quantity, unit_price, line_total,
        product(product_id, name, category(name)),
        combo(combo_id, name)
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (filters.status !== "all") query = query.eq("status_order_id", filters.status);
  if (truckLocationIds) query = query.in("location_id", truckLocationIds);
  if (filters.from) query = query.gte("created_at", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) query = query.lte("created_at", new Date(`${filters.to}T23:59:59`).toISOString());

  if (filters.q) {
    const q = filters.q.trim().replace(/[,()]/g, " ").trim();
    const orderNumberMatch = /^\d+$/.test(q) ? Number(q) : null;
    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
    const matchingIds = (matchedProfiles ?? []).map((p) => p.id);

    const orConditions: string[] = [];
    if (matchingIds.length > 0) orConditions.push(`profile_id.in.(${matchingIds.join(",")})`);
    if (orderNumberMatch !== null) orConditions.push(`order_number.eq.${orderNumberMatch}`);

    query =
      orConditions.length > 0
        ? query.or(orConditions.join(","))
        : query.eq("profile_order_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: rows } = await query;
  const orders = (rows ?? []).filter((o) => {
    const status = o.status_order as unknown as { code: string } | { code: string }[] | null;
    const code = Array.isArray(status) ? status[0]?.code : status?.code;
    return code !== "cancelled";
  });

  // ¿Cuáles profile_id son "socio"?
  const profileIds = [...new Set(orders.map((o) => o.profile_id).filter((id): id is string => !!id))];
  const socioIds = new Set<string>();
  if (profileIds.length > 0) {
    const { data: roleRows } = await supabase
      .from("profile_has_role")
      .select("profile_id, roles(code)")
      .in("profile_id", profileIds);
    (roleRows ?? []).forEach((r) => {
      const role = r.roles as unknown as { code: string } | { code: string }[] | null;
      const code = Array.isArray(role) ? role[0]?.code : role?.code;
      if (code === "socio") socioIds.add(r.profile_id);
    });
  }

  function aggregate(source: typeof orders): OrdersReportItem[] {
    const map = new Map<string, OrdersReportItem>();
    for (const order of source) {
      const isSocioOrder = !!order.profile_id && socioIds.has(order.profile_id);
      for (const line of order.order_detail ?? []) {
        const product = Array.isArray(line.product) ? line.product[0] : line.product;
        const combo = Array.isArray(line.combo) ? line.combo[0] : line.combo;
        const type: "product" | "combo" = product ? "product" : "combo";
        const id = product?.product_id ?? combo?.combo_id;
        const name = product?.name ?? combo?.name ?? "Ítem eliminado";
        if (id == null) continue;
        const key = `${type}-${id}`;
        const existing =
          map.get(key) ??
          { key, type, name, quantity: 0, revenue: 0, regularQuantity: 0, courtesyQuantity: 0, socioQuantity: 0 };
        existing.quantity += line.quantity;
        // La cortesía no genera ingreso real (el pedido queda en total=0) — no sumar su
        // line_total (que guarda el valor previo al descuento) a los ingresos del reporte.
        if (!order.is_courtesy) existing.revenue += line.line_total;
        // Mutuamente excluyente: cortesía > socio > cliente regular (mismo criterio que regularOrders).
        if (order.is_courtesy) existing.courtesyQuantity += line.quantity;
        else if (isSocioOrder) existing.socioQuantity += line.quantity;
        else existing.regularQuantity += line.quantity;
        map.set(key, existing);
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }

  function aggregateByCategory(source: typeof orders): OrdersReportCategoryItem[] {
    const map = new Map<string, OrdersReportCategoryItem>();
    for (const order of source) {
      const isSocioOrder = !!order.profile_id && socioIds.has(order.profile_id);
      for (const line of order.order_detail ?? []) {
        const product = Array.isArray(line.product) ? line.product[0] : line.product;
        const combo = Array.isArray(line.combo) ? line.combo[0] : line.combo;
        const categoryRaw = product
          ? (product as unknown as { category: { name: string } | { name: string }[] | null }).category
          : null;
        const category = Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw;
        const name = product ? (category?.name ?? "Sin categoría") : combo ? "Combos" : "Sin categoría";
        const key = name;
        const existing =
          map.get(key) ??
          { key, name, quantity: 0, revenue: 0, regularQuantity: 0, courtesyQuantity: 0, socioQuantity: 0 };
        existing.quantity += line.quantity;
        if (!order.is_courtesy) existing.revenue += line.line_total;
        if (order.is_courtesy) existing.courtesyQuantity += line.quantity;
        else if (isSocioOrder) existing.socioQuantity += line.quantity;
        else existing.regularQuantity += line.quantity;
        map.set(key, existing);
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }

  const courtesyOrders = orders.filter((o) => o.is_courtesy);
  const socioOrders = orders.filter((o) => o.profile_id && socioIds.has(o.profile_id));
  const regularOrders = orders.filter((o) => !o.is_courtesy && !(o.profile_id && socioIds.has(o.profile_id)));

  return {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((acc, o) => acc + o.total, 0),
    regularOrders: regularOrders.length,
    regularRevenue: regularOrders.reduce((acc, o) => acc + o.total, 0),
    categories: aggregateByCategory(orders),
    products: aggregate(orders),
    courtesy: {
      count: courtesyOrders.length,
      value: courtesyOrders.reduce((acc, o) => acc + o.subtotal, 0),
      orders: courtesyOrders.map((o) => ({
        orderNumber: o.order_number,
        value: o.subtotal,
        reason: o.courtesy_reason,
      })),
    },
    socios: {
      count: socioOrders.length,
      value: socioOrders.reduce((acc, o) => acc + o.total, 0),
      products: aggregate(socioOrders),
    },
  };
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
