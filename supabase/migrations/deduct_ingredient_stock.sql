-- ══════════════════════════════════════════════════════════════════════
-- DESCUENTO AUTOMÁTICO DE STOCK POR RECETA - 3 STREET FOOD
-- ══════════════════════════════════════════════════════════════════════
-- Cuando un pedido pasa a estado "preparing" (En preparación), se
-- descuenta del stock del truck (foodtruck_has_ingredient) lo que la
-- receta de cada producto/combo pedido (product_has_ingredient /
-- combo_has_product) indica que se consume. Si el pedido se cancela
-- DESPUÉS de haber descontado, se devuelve exactamente lo que se
-- había descontado.
--
-- ⚠️ Comportamiento elegido si un ingrediente queda en 0 o negativo:
-- SE PERMITE (nunca bloquea el pedido) — se descuenta igual, el
-- movimiento queda registrado con stock_after negativo, y se dispara
-- una notificación de advertencia al staff del truck + a los admins
-- para que revisen y repongan. No se frena el flujo de pedidos por
-- un conteo de inventario desactualizado.
--
-- Ejecutar en Supabase SQL Editor. Requiere que ya esté corrido
-- notification_system.sql (usa public.create_notification).
-- Idempotente.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. COLUMNAS DE SOPORTE
-- ──────────────────────────────────────────────────────────────────────

-- Evita descontar dos veces el mismo pedido si pasa por "preparing" más
-- de una vez (o vuelve a pasar tras un ajuste manual de estado).
ALTER TABLE public.profile_has_order
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT FALSE;

-- Permite saber qué movimientos de stock pertenecen a qué pedido, para
-- poder revertirlos con precisión si el pedido se cancela después.
ALTER TABLE public.ingredient_stock_movement
  ADD COLUMN IF NOT EXISTS profile_order_id UUID
    REFERENCES public.profile_has_order(profile_order_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ingredient_stock_movement_order
  ON public.ingredient_stock_movement(profile_order_id);

-- ──────────────────────────────────────────────────────────────────────
-- 2. AVISO DE STOCK BAJO/NEGATIVO
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_low_stock(
  p_food_truck_id BIGINT,
  p_truck_name TEXT,
  p_order_number INTEGER,
  p_items JSONB
)
RETURNS VOID AS $$
DECLARE
  v_names TEXT;
  v_staff_id UUID;
BEGIN
  SELECT string_agg(
    format('%s (%s%s)', x->>'name', x->>'stock_after', COALESCE(' ' || (x->>'unit'), '')),
    ', '
  )
  INTO v_names
  FROM jsonb_array_elements(p_items) x;

  -- Staff asignado a este truck específico
  FOR v_staff_id IN
    SELECT profile_id FROM public.profile_has_food_truck WHERE food_truck_id = p_food_truck_id
  LOOP
    PERFORM public.create_notification(
      v_staff_id,
      format('Stock bajo en %s', COALESCE(p_truck_name, 'tu truck')),
      format('Tras el pedido #%s quedaron en 0 o negativo: %s', p_order_number, v_names),
      'warning',
      'system',
      '/dashboard?section=catalog.ingredients',
      jsonb_build_object('food_truck_id', p_food_truck_id, 'order_number', p_order_number, 'items', p_items)
    );
  END LOOP;

  -- Admins que no estén ya asignados a ese truck (para no duplicar aviso)
  FOR v_staff_id IN
    SELECT phr.profile_id
    FROM public.profile_has_role phr
    JOIN public.roles r ON r.role_id = phr.role_id
    WHERE r.code = 'admin'
      AND phr.profile_id NOT IN (
        SELECT profile_id FROM public.profile_has_food_truck WHERE food_truck_id = p_food_truck_id
      )
  LOOP
    PERFORM public.create_notification(
      v_staff_id,
      format('Stock bajo en %s', COALESCE(p_truck_name, 'un truck')),
      format('Tras el pedido #%s quedaron en 0 o negativo: %s', p_order_number, v_names),
      'warning',
      'system',
      '/dashboard?section=catalog.ingredients',
      jsonb_build_object('food_truck_id', p_food_truck_id, 'order_number', p_order_number, 'items', p_items)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. DESCUENTO — pedido pasa a "preparing"
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_order_stock(p_profile_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_food_truck_id BIGINT;
  v_order_number INTEGER;
  v_already BOOLEAN;
  v_truck_name TEXT;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_ing_name TEXT;
  v_ing_unit TEXT;
  v_low_stock JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  SELECT o.order_number, o.stock_deducted, l.food_truck_id
  INTO v_order_number, v_already, v_food_truck_id
  FROM public.profile_has_order o
  LEFT JOIN public.location l ON l.location_id = o.location_id
  WHERE o.profile_order_id = p_profile_order_id;

  -- Sin ubicación asignada no sabemos de qué truck descontar — se omite.
  -- Si ya se había descontado antes, no se repite.
  IF v_food_truck_id IS NULL OR v_already THEN
    RETURN;
  END IF;

  SELECT name INTO v_truck_name FROM public.food_truck WHERE food_truck_id = v_food_truck_id;

  FOR r IN
    SELECT ingredient_id, SUM(needed) AS needed
    FROM (
      -- Productos pedidos directo
      SELECT phi.ingredient_id, phi.quantity * od.quantity AS needed
      FROM public.order_detail od
      JOIN public.product_has_ingredient phi ON phi.product_id = od.product_id
      WHERE od.profile_order_id = p_profile_order_id AND od.product_id IS NOT NULL

      UNION ALL

      -- Productos dentro de un combo pedido (combo_has_product no tiene
      -- cantidad propia — se asume 1 unidad de cada producto del combo)
      SELECT phi.ingredient_id, phi.quantity * od.quantity AS needed
      FROM public.order_detail od
      JOIN public.combo_has_product chp ON chp.combo_id = od.combo_id
      JOIN public.product_has_ingredient phi ON phi.product_id = chp.product_id
      WHERE od.profile_order_id = p_profile_order_id AND od.combo_id IS NOT NULL
    ) lines
    GROUP BY ingredient_id
  LOOP
    SELECT stock INTO v_stock_before
    FROM public.foodtruck_has_ingredient
    WHERE foodtruck_id = v_food_truck_id AND ingredient_id = r.ingredient_id
    FOR UPDATE;

    v_stock_before := COALESCE(v_stock_before, 0);
    v_stock_after := v_stock_before - r.needed;

    IF EXISTS (
      SELECT 1 FROM public.foodtruck_has_ingredient
      WHERE foodtruck_id = v_food_truck_id AND ingredient_id = r.ingredient_id
    ) THEN
      UPDATE public.foodtruck_has_ingredient
      SET stock = v_stock_after
      WHERE foodtruck_id = v_food_truck_id AND ingredient_id = r.ingredient_id;
    ELSE
      INSERT INTO public.foodtruck_has_ingredient (foodtruck_id, ingredient_id, stock)
      VALUES (v_food_truck_id, r.ingredient_id, v_stock_after);
    END IF;

    INSERT INTO public.ingredient_stock_movement
      (foodtruck_id, ingredient_id, type, quantity, stock_before, stock_after, notes, profile_order_id)
    VALUES
      (v_food_truck_id, r.ingredient_id, 'salida', r.needed, v_stock_before, v_stock_after,
       format('Consumo automático — Pedido #%s', v_order_number), p_profile_order_id);

    -- Caso hipotético del enunciado: queda en 0 o negativo → se permite,
    -- no se bloquea nada, solo se junta para avisar al final.
    IF v_stock_after <= 0 THEN
      SELECT name, unit INTO v_ing_name, v_ing_unit FROM public.ingredient WHERE ingredient_id = r.ingredient_id;
      v_low_stock := v_low_stock || jsonb_build_object(
        'ingredient_id', r.ingredient_id,
        'name', v_ing_name,
        'unit', v_ing_unit,
        'stock_after', v_stock_after
      );
    END IF;
  END LOOP;

  UPDATE public.profile_has_order SET stock_deducted = TRUE WHERE profile_order_id = p_profile_order_id;

  IF jsonb_array_length(v_low_stock) > 0 THEN
    PERFORM public.notify_low_stock(v_food_truck_id, v_truck_name, v_order_number, v_low_stock);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 4. DEVOLUCIÓN — pedido se cancela después de haber descontado
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.restock_order_stock(p_profile_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_already BOOLEAN;
  v_order_number INTEGER;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  r RECORD;
BEGIN
  SELECT stock_deducted, order_number INTO v_already, v_order_number
  FROM public.profile_has_order WHERE profile_order_id = p_profile_order_id;

  -- Si nunca se llegó a descontar (se canceló antes de "preparing"), no
  -- hay nada que devolver.
  IF v_already IS DISTINCT FROM TRUE THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT foodtruck_id, ingredient_id, SUM(quantity) AS qty
    FROM public.ingredient_stock_movement
    WHERE profile_order_id = p_profile_order_id AND type = 'salida'
    GROUP BY foodtruck_id, ingredient_id
  LOOP
    SELECT stock INTO v_stock_before
    FROM public.foodtruck_has_ingredient
    WHERE foodtruck_id = r.foodtruck_id AND ingredient_id = r.ingredient_id
    FOR UPDATE;

    v_stock_before := COALESCE(v_stock_before, 0);
    v_stock_after := v_stock_before + r.qty;

    IF EXISTS (
      SELECT 1 FROM public.foodtruck_has_ingredient
      WHERE foodtruck_id = r.foodtruck_id AND ingredient_id = r.ingredient_id
    ) THEN
      UPDATE public.foodtruck_has_ingredient
      SET stock = v_stock_after
      WHERE foodtruck_id = r.foodtruck_id AND ingredient_id = r.ingredient_id;
    ELSE
      INSERT INTO public.foodtruck_has_ingredient (foodtruck_id, ingredient_id, stock)
      VALUES (r.foodtruck_id, r.ingredient_id, v_stock_after);
    END IF;

    INSERT INTO public.ingredient_stock_movement
      (foodtruck_id, ingredient_id, type, quantity, stock_before, stock_after, notes, profile_order_id)
    VALUES
      (r.foodtruck_id, r.ingredient_id, 'entrada', r.qty, v_stock_before, v_stock_after,
       format('Devolución automática — Pedido #%s cancelado', v_order_number), p_profile_order_id);
  END LOOP;

  UPDATE public.profile_has_order SET stock_deducted = FALSE WHERE profile_order_id = p_profile_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 5. TRIGGER — enganchado a order_has_status
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_order_status_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_status_code TEXT;
BEGIN
  SELECT code INTO v_status_code FROM public.status_order WHERE status_order_id = NEW.status_order_id;

  IF v_status_code = 'preparing' THEN
    PERFORM public.deduct_order_stock(NEW.profile_order_id);
  ELSIF v_status_code = 'cancelled' THEN
    PERFORM public.restock_order_stock(NEW.profile_order_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_stock ON public.order_has_status;

CREATE TRIGGER on_order_status_stock
  AFTER INSERT ON public.order_has_status
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_stock();

-- ══════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
--
-- PASOS SIGUIENTES:
-- 1. Correr notification_system.sql primero si todavía no está corrido.
-- 2. Correr este script en Supabase SQL Editor.
-- 3. npm run types (regenerar src/types/database.types.ts).
-- ══════════════════════════════════════════════════════════════════════
