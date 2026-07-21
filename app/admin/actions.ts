"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHODS } from "@/lib/payment-method";

export async function updateOrderStatus(
  profileOrderId: string,
  statusOrderId: string,
  paymentMethod?: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  // El pago es manual (MercadoPago desactivado) — al confirmar un pedido
  // (=pagado) el staff tiene que decir con qué medio se pagó.
  const { data: newStatus } = await supabase
    .from("status_order")
    .select("code")
    .eq("status_order_id", statusOrderId)
    .single();

  if (newStatus?.code === "confirmed") {
    if (!paymentMethod || !PAYMENT_METHODS.some((m) => m.value === paymentMethod)) {
      return { error: "Elegí el medio de pago" };
    }
  }

  // Actualiza el estado actual del pedido
  const { error } = await supabase
    .from("profile_has_order")
    .update({
      status_order_id: statusOrderId,
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
    })
    .eq("profile_order_id", profileOrderId);

  if (error) return { error: error.message };

  // Registra el cambio en el historial
  await supabase.from("order_has_status").insert({
    profile_order_id: profileOrderId,
    status_order_id: statusOrderId,
    changed_by: user.id,
  });

  revalidatePath("/dashboard");
}
