"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyAndConfirmPayment } from "../actions";

export function OrderStatusUpdater({
  profileOrderId,
  paymentId,
}: {
  profileOrderId: string;
  paymentId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    verifyAndConfirmPayment(profileOrderId, paymentId).then((result) => {
      if ("status" in result && result.status !== "pending") {
        // Recargar la página para mostrar el nuevo estado
        router.refresh();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
