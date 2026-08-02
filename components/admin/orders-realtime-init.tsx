"use client";

/**
 * OrdersRealtimeInit
 *
 * Se suscribe a cambios Realtime en pedidos (profile_has_order, order_detail,
 * order_has_status) y refresca los Server Components de la página actual
 * (router.refresh()) cuando algo cambia. Montado en el layout de /dashboard
 * → aplica a cualquier sección abierta (Dashboard, Pedidos, Cocina, etc.),
 * sin importar cuál esté activa.
 *
 * Requiere supabase/migrations/add_orders_realtime.sql (agrega las tablas
 * a la publicación `supabase_realtime`) — sin eso no llega ningún evento.
 *
 * @module components/admin/orders-realtime-init
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["profile_has_order", "order_detail", "order_has_status"] as const;

export function OrdersRealtimeInit() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  // Instancia estable — createClient() nueva en cada render rompería el efecto.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Varios cambios llegan juntos (ej: 1 pedido + N líneas de order_detail)
    // — se agrupan en un solo refresh en vez de uno por evento.
    const scheduleRefresh = () => {
      if (cancelled) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) routerRef.current.refresh();
      }, 400);
    };

    // Nombre de canal único por montaje — evita choques con React Strict
    // Mode (doble montaje en dev) igual que en use-notifications.ts.
    const topic = `orders-realtime-${Math.random().toString(36).slice(2)}`;
    let channel = supabase.channel(topic);
    for (const table of TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }
    channel.subscribe();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
