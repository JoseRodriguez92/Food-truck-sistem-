"use server";

import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/lib/store/cart";

// NOTA: la pasarela de MercadoPago quedó DESACTIVADA (no eliminada) porque no
// se puede costear la comisión. El pago pasa a ser manual: el pedido se crea
// directo en estado "pending" y el staff lo confirma desde el panel (Pedidos)
// cuando recibe el pago en persona (efectivo / datáfono).
// Si en algún momento se reactiva la pasarela, `verifyAndConfirmPayment` más
// abajo ya queda listo para usarse de nuevo.

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN ?? "" });

// ─── Crear orden (pago manual, sin pasarela) ──────────────────────────────────

export async function createOrder(
  items: CartItem[],
  locationId?: number | null,
): Promise<{ profileOrderId: string; orderNumber: number } | { error: string }> {
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
      location_id:     locationId ?? null,
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
    notes:            "Pedido creado, pago pendiente en persona",
  });

  return { profileOrderId: order.profile_order_id, orderNumber: order.order_number };
}

// ─── (Desactivado) Verificar pago con MercadoPago ─────────────────────────────
// Ya no se llama desde ningún lado — se deja el código intacto por si se
// reactiva la pasarela más adelante.

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
