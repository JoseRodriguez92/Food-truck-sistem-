-- ══════════════════════════════════════════════════════════════════════
-- LOTES DE PRODUCCIÓN (INSUMO INTERMEDIO) - 3 STREET FOOD
-- ══════════════════════════════════════════════════════════════════════
-- Modelo: ingrediente (crudo) → SE PREPARA → lote (producido) → SE VENDE
-- → producto.
--
-- Un lote es un `ingredient` normal marcado con is_batch = true. Tiene
-- su propia receta (batch_recipe: qué ingredientes/lotes consume producir
-- 1 unidad) y su propio stock por truck (foodtruck_has_ingredient, sin
-- cambios). product_has_ingredient no se modifica: la receta de venta
-- puede apuntar a un ingrediente crudo o a un lote indistintamente.
--
-- Un lote compartido entre varios productos simplemente tiene varias
-- filas en product_has_ingredient apuntando a su ingredient_id — no
-- hace falta un campo de "finalidad" aparte, se deriva de la relación.
--
-- Ejecutar en Supabase SQL Editor. Requiere deduct_ingredient_stock.sql
-- ya corrido (usa create_notification). Idempotente.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. MARCA DE LOTE EN INGREDIENT
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.ingredient
  ADD COLUMN IF NOT EXISTS is_batch BOOLEAN NOT NULL DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────────────
-- 2. RECETA DEL LOTE (qué consume producir 1 unidad del lote)
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.batch_recipe (
  batch_recipe_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_ingredient_id INTEGER NOT NULL
    REFERENCES public.ingredient(ingredient_id) ON DELETE CASCADE,
  component_ingredient_id INTEGER NOT NULL
    REFERENCES public.ingredient(ingredient_id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT batch_recipe_no_self_reference
    CHECK (batch_ingredient_id <> component_ingredient_id),
  CONSTRAINT batch_recipe_unique
    UNIQUE (batch_ingredient_id, component_ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_recipe_batch
  ON public.batch_recipe(batch_ingredient_id);

-- Solo se puede usar como "batch_ingredient_id" un ingredient marcado
-- is_batch = true. El componente puede ser crudo o incluso otro lote
-- (permite anidar, ej. un lote de "guiso" adentro de un lote de "relleno").
CREATE OR REPLACE FUNCTION public.check_batch_recipe_is_batch()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ingredient
    WHERE ingredient_id = NEW.batch_ingredient_id AND is_batch = TRUE
  ) THEN
    RAISE EXCEPTION 'batch_ingredient_id % no está marcado como lote (is_batch = true)', NEW.batch_ingredient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batch_recipe_is_batch ON public.batch_recipe;

CREATE TRIGGER trg_batch_recipe_is_batch
  BEFORE INSERT OR UPDATE ON public.batch_recipe
  FOR EACH ROW
  EXECUTE FUNCTION public.check_batch_recipe_is_batch();

-- ──────────────────────────────────────────────────────────────────────
-- 3. NUEVO TIPO DE MOVIMIENTO: 'produccion'
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.ingredient_stock_movement
  DROP CONSTRAINT IF EXISTS ingredient_stock_movement_type_check;

ALTER TABLE public.ingredient_stock_movement
  ADD CONSTRAINT ingredient_stock_movement_type_check
  CHECK (type = ANY (ARRAY['entrada'::text, 'salida'::text, 'ajuste'::text, 'produccion'::text]));

-- ──────────────────────────────────────────────────────────────────────
-- 4. AVISO DE STOCK BAJO AL PRODUCIR (mismo criterio que las ventas:
--    nunca bloquea, se permite negativo, se avisa a staff + admins)
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_low_stock_batch(
  p_food_truck_id BIGINT,
  p_truck_name TEXT,
  p_batch_name TEXT,
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
      format('Stock bajo tras producir %s', p_batch_name),
      format('Al producir "%s" en %s quedaron en 0 o negativo: %s', p_batch_name, COALESCE(p_truck_name, 'tu truck'), v_names),
      'warning',
      'system',
      '/dashboard?section=catalog.ingredients',
      jsonb_build_object('food_truck_id', p_food_truck_id, 'batch_name', p_batch_name, 'items', p_items)
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
      format('Stock bajo tras producir %s', p_batch_name),
      format('Al producir "%s" en %s quedaron en 0 o negativo: %s', p_batch_name, COALESCE(p_truck_name, 'un truck'), v_names),
      'warning',
      'system',
      '/dashboard?section=catalog.ingredients',
      jsonb_build_object('food_truck_id', p_food_truck_id, 'batch_name', p_batch_name, 'items', p_items)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 5. PRODUCIR LOTE — gasta ingredientes de la receta, suma stock al lote
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.producir_lote(
  p_batch_ingredient_id INTEGER,
  p_foodtruck_id BIGINT,
  p_cantidad NUMERIC,
  p_profile_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_is_batch BOOLEAN;
  v_batch_name TEXT;
  v_truck_name TEXT;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_low_stock JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad a producir debe ser mayor a 0';
  END IF;

  SELECT is_batch, name INTO v_is_batch, v_batch_name
  FROM public.ingredient WHERE ingredient_id = p_batch_ingredient_id;

  IF v_is_batch IS NOT TRUE THEN
    RAISE EXCEPTION 'El ingrediente % no está marcado como lote', p_batch_ingredient_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.batch_recipe WHERE batch_ingredient_id = p_batch_ingredient_id) THEN
    RAISE EXCEPTION 'El lote "%" no tiene receta definida (batch_recipe vacío)', v_batch_name;
  END IF;

  SELECT name INTO v_truck_name FROM public.food_truck WHERE food_truck_id = p_foodtruck_id;

  -- 1. Descontar cada componente de la receta del lote
  FOR r IN
    SELECT br.component_ingredient_id, br.quantity * p_cantidad AS needed,
           i.name, i.unit
    FROM public.batch_recipe br
    JOIN public.ingredient i ON i.ingredient_id = br.component_ingredient_id
    WHERE br.batch_ingredient_id = p_batch_ingredient_id
  LOOP
    SELECT stock INTO v_stock_before
    FROM public.foodtruck_has_ingredient
    WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = r.component_ingredient_id
    FOR UPDATE;

    v_stock_before := COALESCE(v_stock_before, 0);
    v_stock_after := v_stock_before - r.needed;

    IF EXISTS (
      SELECT 1 FROM public.foodtruck_has_ingredient
      WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = r.component_ingredient_id
    ) THEN
      UPDATE public.foodtruck_has_ingredient
      SET stock = v_stock_after
      WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = r.component_ingredient_id;
    ELSE
      INSERT INTO public.foodtruck_has_ingredient (foodtruck_id, ingredient_id, stock)
      VALUES (p_foodtruck_id, r.component_ingredient_id, v_stock_after);
    END IF;

    INSERT INTO public.ingredient_stock_movement
      (foodtruck_id, ingredient_id, type, quantity, stock_before, stock_after, notes, profile_id)
    VALUES
      (p_foodtruck_id, r.component_ingredient_id, 'salida', r.needed, v_stock_before, v_stock_after,
       COALESCE(p_notes, format('Consumo para producir lote "%s"', v_batch_name)), p_profile_id);

    -- Mismo criterio que la venta: nunca bloquea, se permite negativo,
    -- se junta para avisar al final.
    IF v_stock_after <= 0 THEN
      v_low_stock := v_low_stock || jsonb_build_object(
        'ingredient_id', r.component_ingredient_id,
        'name', r.name,
        'unit', r.unit,
        'stock_after', v_stock_after
      );
    END IF;
  END LOOP;

  -- 2. Sumar la cantidad producida al stock del propio lote
  SELECT stock INTO v_stock_before
  FROM public.foodtruck_has_ingredient
  WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = p_batch_ingredient_id
  FOR UPDATE;

  v_stock_before := COALESCE(v_stock_before, 0);
  v_stock_after := v_stock_before + p_cantidad;

  IF EXISTS (
    SELECT 1 FROM public.foodtruck_has_ingredient
    WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = p_batch_ingredient_id
  ) THEN
    UPDATE public.foodtruck_has_ingredient
    SET stock = v_stock_after
    WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = p_batch_ingredient_id;
  ELSE
    INSERT INTO public.foodtruck_has_ingredient (foodtruck_id, ingredient_id, stock)
    VALUES (p_foodtruck_id, p_batch_ingredient_id, v_stock_after);
  END IF;

  INSERT INTO public.ingredient_stock_movement
    (foodtruck_id, ingredient_id, type, quantity, stock_before, stock_after, notes, profile_id)
  VALUES
    (p_foodtruck_id, p_batch_ingredient_id, 'produccion', p_cantidad, v_stock_before, v_stock_after,
     COALESCE(p_notes, 'Producción de lote'), p_profile_id);

  IF jsonb_array_length(v_low_stock) > 0 THEN
    PERFORM public.notify_low_stock_batch(p_foodtruck_id, v_truck_name, v_batch_name, v_low_stock);
  END IF;

  RETURN jsonb_build_object(
    'batch_ingredient_id', p_batch_ingredient_id,
    'produced', p_cantidad,
    'new_stock', v_stock_after,
    'low_stock', v_low_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
--
-- PASOS SIGUIENTES:
-- 1. Marcar ingredientes existentes que sean lotes:
--    UPDATE ingredient SET is_batch = true WHERE ingredient_id IN (...);
-- 2. Cargar la receta de cada lote en batch_recipe (qué ingredientes
--    crudos y cuánto consume producir 1 unidad del lote).
-- 3. Re-apuntar product_has_ingredient de los productos que usan lote
--    para que su ingredient_id sea el del lote (no el crudo directo).
-- 4. npm run types (regenerar src/types/database.types.ts).
-- ══════════════════════════════════════════════════════════════════════
