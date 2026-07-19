"use client";

/**
 * useNotifications
 *
 * Hook cliente para el sistema de notificaciones (ver
 * supabase/migrations/notification_system.sql). Trae las notificaciones
 * del usuario logueado, se suscribe a Realtime para nuevas, y expone
 * mutaciones (marcar leída / marcar todas / archivar).
 *
 * @module hooks/use-notifications
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error" | "system";
export type NotificationCategory = "order" | "system";

export interface AppNotification {
  id: string;
  profile_id: string;
  title: string;
  message: string | null;
  type: NotificationType;
  category: NotificationCategory | null;
  link_url: string | null;
  action_label: string | null;
  icon: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_archived: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

const PAGE_SIZE = 20;

export type BrowserPermission = NotificationPermission | "unsupported";

// Aviso nativo del navegador/SO, además del panel in-app. Solo funciona
// mientras la pestaña sigue abierta (minimizada o en otra pestaña está
// bien) — si el navegador está cerrado no llega nada, eso ya sería push
// real (service worker + servidor de envío), no esto.
function showBrowserNotification(n: AppNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Si el usuario ya está mirando esta misma ventana, el panel in-app
  // alcanza — evita duplicar el aviso.
  if (document.hasFocus()) return;

  const browserNotif = new window.Notification(n.title, {
    body: n.message ?? undefined,
    icon: "/LogoTipo-3StreetFood.svg",
    tag: n.id,
  });

  browserNotif.onclick = () => {
    window.focus();
    if (n.link_url) window.location.href = n.link_url;
    browserNotif.close();
  };
}

// Chime de aviso — suena siempre que llega algo nuevo, tenga o no foco la
// pestaña (a diferencia del popup del navegador, este no se salta si ya
// estás mirando la app: el staff en cocina necesita el sonido igual).
function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const audio = new window.Audio("/sound/notification.mp3");
    audio.volume = 0.6;
    // Si el navegador bloquea el autoplay (todavía no hubo ninguna
    // interacción del usuario en la página), se ignora el rechazo.
    audio.play().catch(() => {});
  } catch {
    // noop
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<BrowserPermission>("default");
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }
    setBrowserPermission(Notification.permission);
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setBrowserPermission(result);
  }, []);

  // Instancia estable — createClient() nueva en cada render rompería los
  // useEffect/useCallback de abajo (refetch/resubscribe infinito).
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    userIdRef.current = user.id;

    const { data, error } = await supabase
      .from("notification")
      .select("*")
      .eq("profile_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data) {
      const rows = data as unknown as AppNotification[];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.is_read).length);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Suscripción Realtime — nuevas notificaciones y cambios (leída/archivada)
  //
  // Nota: en dev, React Strict Mode monta/desmonta este efecto dos veces.
  // Si el canal tuviera siempre el mismo nombre, la segunda ejecución
  // puede toparse con un canal que Supabase todavía no terminó de limpiar
  // de la primera (removeChannel es async) y reventar con "cannot add
  // postgres_changes callbacks ... after subscribe()". Por eso el nombre
  // lleva un sufijo random — cada montaje usa un canal 100% propio — y
  // además se ignora cualquier callback que llegue tras el cleanup.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const topic = `notifications-${user.id}-${Math.random().toString(36).slice(2)}`;

      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notification",
            filter: `profile_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as AppNotification;
            setNotifications((prev) => [row, ...prev].slice(0, PAGE_SIZE));
            setUnreadCount((prev) => prev + 1);
            showBrowserNotification(row);
            playNotificationSound();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notification",
            filter: `profile_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as AppNotification;
            setNotifications((prev) =>
              row.is_archived
                ? prev.filter((n) => n.id !== row.id)
                : prev.map((n) => (n.id === row.id ? row : n)),
            );
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener el contador sincronizado con la lista (evita drift del realtime)
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.is_read).length);
  }, [notifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      const userId = userIdRef.current;
      if (!userId) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
      );
      await supabase.rpc("mark_notification_as_read", { notification_id: id, user_id: userId });
    },
    [supabase],
  );

  const markAllAsRead = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    await supabase.rpc("mark_all_notifications_as_read", { user_id: userId });
  }, [supabase]);

  const archive = useCallback(
    async (id: string) => {
      const userId = userIdRef.current;
      if (!userId) return;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await supabase.rpc("archive_notification", { notification_id: id, user_id: userId });
    },
    [supabase],
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    archive,
    reload: load,
    browserPermission,
    requestBrowserPermission,
  };
}
