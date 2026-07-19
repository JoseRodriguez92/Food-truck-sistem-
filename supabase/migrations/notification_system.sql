-- ══════════════════════════════════════════════════════════════════════
-- SISTEMA DE NOTIFICACIONES - 3 STREET FOOD
-- ══════════════════════════════════════════════════════════════════════
-- Adaptado del sistema de notificaciones de CENDA App. La infraestructura
-- genérica (tabla, funciones, RLS, Realtime) es igual; los triggers se
-- reescribieron para el dominio de pedidos de food truck (no hay cuotas
-- ni pagos financiados acá).
--
-- Ejecutar en Supabase SQL Editor. Idempotente (seguro de re-correr).
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. TABLA PRINCIPAL: notification
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinatario
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Contenido
  title TEXT NOT NULL,
  message TEXT,

  -- Clasificación
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'system')),
  category TEXT CHECK (category IN ('order', 'system')),

  -- Metadata
  link_url TEXT,
  action_label TEXT,
  icon TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Estado
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Sistema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_profile ON public.notification(profile_id);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON public.notification(profile_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notification_created ON public.notification(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_category ON public.notification(category) WHERE category IS NOT NULL;

COMMENT ON TABLE public.notification IS 'Notificaciones del sistema para usuarios (clientes y staff)';
COMMENT ON COLUMN public.notification.type IS 'Tipo visual: info, success, warning, error, system';
COMMENT ON COLUMN public.notification.category IS 'Categoría funcional: order, system';

-- ──────────────────────────────────────────────────────────────────────
-- 2. FUNCIONES HELPER
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_notification(
  p_profile_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_category TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notification (
    profile_id, title, message, type, category, link_url, metadata, expires_at
  ) VALUES (
    p_profile_id, p_title, p_message, p_type, p_category, p_link_url, p_metadata, p_expires_at
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
  notification_id UUID,
  user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notification
  SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
  WHERE id = notification_id AND profile_id = user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.notification
  SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
  WHERE profile_id = user_id AND is_read = FALSE;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.archive_notification(
  notification_id UUID,
  user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notification
  SET is_archived = TRUE, updated_at = NOW()
  WHERE id = notification_id AND profile_id = user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notification
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. TRIGGERS - PEDIDOS
-- ──────────────────────────────────────────────────────────────────────

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ TRIGGER 1: Pedido nuevo → notifica al cliente (si tiene cuenta)  │
-- └──────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Pedidos de mostrador (walk-in, sin profile_id) no tienen a quién notificar
  IF NEW.profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    NEW.profile_id,
    format('Pedido #%s recibido', NEW.order_number),
    format('Tu pedido fue recibido y está pendiente de confirmación. Total: $%s',
      TO_CHAR(NEW.total, 'FM999,999,999')
    ),
    'info',
    'order',
    format('/client/order/%s', NEW.profile_order_id),
    jsonb_build_object(
      'profile_order_id', NEW.profile_order_id,
      'order_number', NEW.order_number,
      'total', NEW.total
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created ON public.profile_has_order;

CREATE TRIGGER on_order_created
  AFTER INSERT ON public.profile_has_order
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_created();

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ TRIGGER 2: Cambio de estado del pedido → notifica al cliente     │
-- └──────────────────────────────────────────────────────────────────┘
-- Nota: al crear un pedido se inserta también la fila 'pending' en
-- order_has_status (ver createManualOrder/checkout). Ese primer insert
-- se ignora acá para no duplicar el aviso de "pedido recibido" del
-- trigger 1 — solo se notifican cambios reales de estado.
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_order_number INTEGER;
  v_status_code TEXT;
  v_status_name TEXT;
  v_type TEXT;
BEGIN
  SELECT code, name INTO v_status_code, v_status_name
  FROM public.status_order
  WHERE status_order_id = NEW.status_order_id;

  IF v_status_code IS NULL OR v_status_code = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT profile_id, order_number INTO v_profile_id, v_order_number
  FROM public.profile_has_order
  WHERE profile_order_id = NEW.profile_order_id;

  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Códigos reales de status_order: pending, confirmed, preparing, ready,
  -- on_the_way, delivered, cancelled (ver order-status-badge.tsx)
  v_type := CASE v_status_code
    WHEN 'cancelled' THEN 'error'
    WHEN 'ready' THEN 'success'
    WHEN 'delivered' THEN 'success'
    WHEN 'confirmed' THEN 'info'
    WHEN 'preparing' THEN 'info'
    WHEN 'on_the_way' THEN 'info'
    ELSE 'info'
  END;

  PERFORM public.create_notification(
    v_profile_id,
    format('Pedido #%s: %s', v_order_number, v_status_name),
    format('Tu pedido cambió de estado a "%s".', v_status_name),
    v_type,
    'order',
    format('/client/order/%s', NEW.profile_order_id),
    jsonb_build_object(
      'profile_order_id', NEW.profile_order_id,
      'order_number', v_order_number,
      'status_code', v_status_code
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_changed ON public.order_has_status;

CREATE TRIGGER on_order_status_changed
  AFTER INSERT ON public.order_has_status
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_changed();

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ TRIGGER 3 (EXTRA): Pedido nuevo → notifica al staff del truck    │
-- └──────────────────────────────────────────────────────────────────┘
-- Opcional: si no lo querés, comentá el CREATE TRIGGER de abajo (la
-- función puede quedar creada sin uso, no hace daño).
-- Notifica a todo empleado asignado (profile_has_food_truck) al truck
-- dueño de la location del pedido. Requiere que el pedido tenga
-- location_id (los pedidos online sin ubicación elegida no notifican
-- a nadie del staff).
CREATE OR REPLACE FUNCTION public.notify_staff_new_order()
RETURNS TRIGGER AS $$
DECLARE
  v_truck_id BIGINT;
  v_truck_name TEXT;
  v_staff_profile_id UUID;
BEGIN
  IF NEW.location_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.food_truck_id, ft.name INTO v_truck_id, v_truck_name
  FROM public.location l
  JOIN public.food_truck ft ON ft.food_truck_id = l.food_truck_id
  WHERE l.location_id = NEW.location_id;

  IF v_truck_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_staff_profile_id IN
    SELECT pft.profile_id
    FROM public.profile_has_food_truck pft
    WHERE pft.food_truck_id = v_truck_id
  LOOP
    PERFORM public.create_notification(
      v_staff_profile_id,
      format('Nuevo pedido #%s', NEW.order_number),
      format('Entró un pedido nuevo en %s. Total: $%s',
        COALESCE(v_truck_name, 'tu truck'),
        TO_CHAR(NEW.total, 'FM999,999,999')
      ),
      'info',
      'order',
      '/dashboard?section=orders',
      jsonb_build_object('profile_order_id', NEW.profile_order_id, 'order_number', NEW.order_number)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created_notify_staff ON public.profile_has_order;

CREATE TRIGGER on_order_created_notify_staff
  AFTER INSERT ON public.profile_has_order
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_new_order();

-- ──────────────────────────────────────────────────────────────────────
-- 4. POLÍTICAS RLS
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notification;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification;

CREATE POLICY "Users can view their own notifications"
  ON public.notification FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notification FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "System can insert notifications"
  ON public.notification FOR INSERT
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- 5. VISTA: Notificaciones no leídas
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_unread_notifications AS
SELECT
  n.*,
  p.first_name,
  p.last_name,
  p.email
FROM public.notification n
JOIN public.profiles p ON n.profile_id = p.id
WHERE n.is_read = FALSE
  AND (n.expires_at IS NULL OR n.expires_at > NOW())
  AND n.is_archived = FALSE;

-- ──────────────────────────────────────────────────────────────────────
-- 6. REALTIME
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
--
-- PASOS SIGUIENTES:
-- 1. Correr este script en Supabase SQL Editor.
-- 2. npm run types (regenerar src/types/database.types.ts).
-- 3. Si NO querés el trigger 3 (aviso a staff), correr:
--    DROP TRIGGER IF EXISTS on_order_created_notify_staff ON public.profile_has_order;
-- ══════════════════════════════════════════════════════════════════════
