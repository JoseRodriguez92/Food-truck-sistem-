"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOrderStatus(
  profileOrderId: string,
  statusOrderId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  // Actualiza el estado actual del pedido
  const { error } = await supabase
    .from("profile_has_order")
    .update({ status_order_id: statusOrderId })
    .eq("profile_order_id", profileOrderId);

  if (error) return { error: error.message };

  // Registra el cambio en el historial
  await supabase.from("order_has_status").insert({
    profile_order_id: profileOrderId,
    status_order_id: statusOrderId,
    changed_by: user.id,
  });

  revalidatePath("/admin");
}
