"use server";

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/lib/store/cart";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ─── Crear orden + preferencia MP ─────────────────────────────────────────────

export async function createOrder(
  items: CartItem[],
  locationId?: number | null
): Promise<{ initPoint: string; profileOrderId: string } | { error: string }> {
  if (!items.length) return { error: "El carrito está vacío" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // 1. Obtener status "pending"
  const { data: statusPending } = await supabase
    .from("status_order")
    .select("status_order_id")
    .eq("code", "pending")
    .single();
  if (!statusPending) return { error: "Estado 'pending' no encontrado" };

  // 2. Calcular totales
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  // 3. Crear profile_has_order
  const { data: order, error: orderErr } = await supabase
    .from("profile_has_order")
    .insert({
      profile_id:      user.id,
      status_order_id: statusPending.status_order_id,
      subtotal,
      total:           subtotal,
    })
    .select("profile_order_id, order_number")
    .single();
  if (orderErr || !order) return { error: orderErr?.message ?? "Error creando orden" };

  // 4. Crear order_detail por cada item
  const details = items.map((item) => ({
    profile_order_id: order.profile_order_id,
    product_id:       item.type === "product" ? item.itemId : null,
    combo_id:         item.type === "combo"   ? item.itemId : null,
    quantity:         item.quantity,
    unit_price:       item.price,
    line_total:       item.price * item.quantity,
  }));
  const { error: detailErr } = await supabase.from("order_detail").insert(details);
  if (detailErr) return { error: detailErr.message };

  // 5. Registrar en historial de estados
  await supabase.from("order_has_status").insert({
    profile_order_id: order.profile_order_id,
    status_order_id:  statusPending.status_order_id,
    changed_by:       user.id,
    notes:            "Orden creada, pendiente de pago",
  });

  // 6. Crear Preference en MercadoPago
  const preference = new Preference(mp);
  const mpItems = items.map((item) => ({
    id:          String(item.itemId),
    title:       item.name,
    quantity:    item.quantity,
    unit_price:  item.price,
    currency_id: "COP",
  }));

  try {
    const pref = await preference.create({
      body: {
        items:              mpItems,
        external_reference: order.profile_order_id,
        back_urls: {
          success: `${BASE_URL}/client/order/${order.profile_order_id}?status=approved`,
          failure: `${BASE_URL}/client/order/${order.profile_order_id}?status=rejected`,
          pending: `${BASE_URL}/client/order/${order.profile_order_id}?status=pending`,
        },
        auto_return:       "approved",
        notification_url:  `${BASE_URL}/api/mp-webhook`,
        statement_descriptor: "3 STREET FOOD",
        metadata: {
          order_number: order.order_number,
          location_id:  locationId ?? null,
        },
      },
    });

    if (!pref.init_point) return { error: "MercadoPago no devolvió init_point" };
    return { initPoint: pref.init_point, profileOrderId: order.profile_order_id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error en MercadoPago";
    return { error: msg };
  }
}

// ─── Verificar pago y actualizar estado ───────────────────────────────────────
// Llamado desde la página de confirmación con el payment_id que MP pone en la URL

export async function verifyAndConfirmPayment(
  profileOrderId: string,
  paymentId: string
): Promise<{ status: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verificar que la orden pertenece al usuario
  const { data: order } = await supabase
    .from("profile_has_order")
    .select("profile_order_id, status_order_id, status_order(code)")
    .eq("profile_order_id", profileOrderId)
    .eq("profile_id", user.id)
    .single();
  if (!order) return { error: "Orden no encontrada" };

  // Si ya está confirmada no hacer nada
  const statusRaw   = order.status_order as unknown as { code: string } | { code: string }[] | null;
  const currentCode = (Array.isArray(statusRaw) ? statusRaw[0] : statusRaw)?.code;
  if (currentCode && currentCode !== "pending") return { status: currentCode };

  // Consultar estado real en MercadoPago
  const payment = new Payment(mp);
  let mpStatus: string;
  try {
    const mpPayment = await payment.get({ id: Number(paymentId) });
    mpStatus = mpPayment.status ?? "unknown";
  } catch {
    return { error: "No se pudo verificar el pago en MercadoPago" };
  }

  // Mapear estado MP → código local
  const codeMap: Record<string, string> = {
    approved:    "confirmed",
    rejected:    "cancelled",
    cancelled:   "cancelled",
    in_process:  "pending",
    pending:     "pending",
  };
  const newCode = codeMap[mpStatus] ?? "pending";
  if (newCode === currentCode) return { status: newCode };

  // Obtener status_order_id del nuevo estado
  const { data: statusRow } = await supabase
    .from("status_order")
    .select("status_order_id")
    .eq("code", newCode)
    .single();
  if (!statusRow) return { status: newCode };

  // Actualizar orden
  await supabase
    .from("profile_has_order")
    .update({ status_order_id: statusRow.status_order_id })
    .eq("profile_order_id", profileOrderId);

  // Registrar en historial
  await supabase.from("order_has_status").insert({
    profile_order_id: profileOrderId,
    status_order_id:  statusRow.status_order_id,
    notes:            `Pago ${mpStatus} (payment_id: ${paymentId})`,
  });

  return { status: newCode };
}
