import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@/lib/supabase/server";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envía tipo "payment" con id en data
    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const paymentId = Number(body.data.id);

    // Consultar el pago en MercadoPago
    const payment    = new Payment(mp);
    const mpPayment  = await payment.get({ id: paymentId });
    const mpStatus   = mpPayment.status;
    const profileOrderId = mpPayment.external_reference;

    if (!profileOrderId) return NextResponse.json({ ok: true });

    // Mapear estado MP → código local
    const codeMap: Record<string, string> = {
      approved:   "confirmed",
      rejected:   "cancelled",
      cancelled:  "cancelled",
      in_process: "pending",
      pending:    "pending",
    };
    const newCode = codeMap[mpStatus ?? ""] ?? "pending";

    const supabase = await createClient();

    // Obtener status_order_id
    const { data: statusRow } = await supabase
      .from("status_order")
      .select("status_order_id")
      .eq("code", newCode)
      .single();
    if (!statusRow) return NextResponse.json({ ok: true });

    // Verificar que la orden existe y aún está en pending
    const { data: order } = await supabase
      .from("profile_has_order")
      .select("status_order_id, status_order(code)")
      .eq("profile_order_id", profileOrderId)
      .single();

    const statusRaw   = order?.status_order as unknown as { code: string } | { code: string }[] | null;
    const currentCode = (Array.isArray(statusRaw) ? statusRaw[0] : statusRaw)?.code;
    if (!order || currentCode === newCode) return NextResponse.json({ ok: true });

    // Actualizar estado de la orden
    await supabase
      .from("profile_has_order")
      .update({ status_order_id: statusRow.status_order_id })
      .eq("profile_order_id", profileOrderId);

    // Registrar en historial
    await supabase.from("order_has_status").insert({
      profile_order_id: profileOrderId,
      status_order_id:  statusRow.status_order_id,
      notes:            `Webhook MP: pago ${mpStatus} (payment_id: ${paymentId})`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mp-webhook]", e);
    return NextResponse.json({ ok: true }, { status: 200 }); // Siempre 200 para que MP no reintente
  }
}
