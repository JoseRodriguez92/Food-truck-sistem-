"use client";

/**
 * useCocinaAnnouncer
 *
 * Lee en voz alta (Web Speech API, gratis, corre en el navegador) cada
 * pedido nuevo que entra mientras la vista Cocina está abierta. No
 * anuncia lo que ya había al entrar — solo lo que aparece después,
 * enganchado al refresh que ya dispara OrdersRealtimeInit.
 *
 * Sin acento colombiano garantizado — depende de qué voces "es" tenga
 * instaladas el navegador/SO. Si hace falta ese nivel de naturalidad,
 * el reemplazo natural es una API de nube (Azure es-CO-SalomeNeural).
 *
 * @module hooks/use-cocina-announcer
 */

import { useEffect, useRef } from "react";
import type { CocinaOrder } from "@/components/admin/views/cocina-view";

type Single<T> = T | T[] | null;

function one<T>(val: Single<T>): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function buildAnnouncement(order: CocinaOrder): string {
  const items = order.order_detail ?? [];
  const parts = items.map((item) => {
    const product = one(item.product);
    const combo = one(item.combo);
    const name = product?.name ?? combo?.name ?? "producto";
    return `${item.quantity} ${name}`;
  });
  const itemsText = parts.length > 0 ? parts.join(", ") : "sin items";
  return `Pedido nuevo, número ${order.order_number}. ${itemsText}.`;
}

export function useCocinaAnnouncer(orders: CocinaOrder[]) {
  // null = todavía no se sembró la primera foto. Set = ids ya vistos/anunciados.
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Primera pasada tras montar: memoriza lo que ya había, no anuncia
    // nada — si no, cada vez que abrís Cocina te lee todos los pedidos
    // del día de una.
    if (knownIds.current === null) {
      knownIds.current = new Set(orders.map((o) => o.profile_order_id));
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const fresh = orders.filter((o) => !knownIds.current!.has(o.profile_order_id));
    for (const order of fresh) {
      knownIds.current.add(order.profile_order_id);
      const utterance = new SpeechSynthesisUtterance(buildAnnouncement(order));
      utterance.lang = "es-CO";
      window.speechSynthesis.speak(utterance);
    }
  }, [orders]);
}
