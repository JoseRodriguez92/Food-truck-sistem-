-- ══════════════════════════════════════════════════════════════════════
-- SIMPLIFICAR LOTES DE PRODUCCIÓN - 3 STREET FOOD
-- ══════════════════════════════════════════════════════════════════════
-- Reemplaza el modelo de add_production_batches.sql (lote = ingrediente
-- compuesto con receta + acredita stock propio) por uno más simple:
-- un lote es solo un nombre + una lista de ingredientes existentes con
-- la cantidad fija a consumir. "Producir" SOLO descuenta esa cantidad
-- del stock del truck — no genera ni acredita ningún ingrediente nuevo.
-- La preparación real la hace la cocina, el sistema solo registra el
-- gasto de inventario.
--
-- Sin datos que migrar (batch_recipe / is_batch nunca se usaron en
-- producción). Ejecutar en Supabase SQL Editor. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. ELIMINAR MODELO VIEJO
-- ──────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.batch_recipe CASCADE;
DROP FUNCTION IF EXISTS public.producir_lote(INTEGER, BIGINT, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS public.check_batch_recipe_is_batch();
ALTER TABLE public.ingredient DROP COLUMN IF EXISTS is_batch;

-- ──────────────────────────────────────────────────────────────────────
-- 2. NUEVO MODELO — LOTE COMO ENTIDAD PROPIA
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.production_batch (
  production_batch_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_batch_item (
  production_batch_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  production_batch_id BIGINT NOT NULL
    REFERENCES public.production_batch(production_batch_id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL
    REFERENCES public.ingredient(ingredient_id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  CONSTRAINT production_batch_item_unique UNIQUE (production_batch_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_production_batch_item_batch
  ON public.production_batch_item(production_batch_id);

-- ──────────────────────────────────────────────────────────────────────
-- 3. PRODUCIR LOTE — solo descuenta, no acredita nada
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.producir_lote(
  p_production_batch_id BIGINT,
  p_foodtruck_id BIGINT,
  p_profile_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_batch_name TEXT;
  v_truck_name TEXT;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_low_stock JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  SELECT name INTO v_batch_name FROM public.production_batch WHERE production_batch_id = p_production_batch_id;

  IF v_batch_name IS NULL THEN
    RAISE EXCEPTION 'Lote % no existe', p_production_batch_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.production_batch_item WHERE production_batch_id = p_production_batch_id) THEN
    RAISE EXCEPTION 'El lote "%" no tiene ingredientes definidos', v_batch_name;
  END IF;

  SELECT name INTO v_truck_name FROM public.food_truck WHERE food_truck_id = p_foodtruck_id;

  FOR r IN
    SELECT pbi.ingredient_id, pbi.quantity AS needed, i.name, i.unit
    FROM public.production_batch_item pbi
    JOIN public.ingredient i ON i.ingredient_id = pbi.ingredient_id
    WHERE pbi.production_batch_id = p_production_batch_id
  LOOP
    SELECT stock INTO v_stock_before
    FROM public.foodtruck_has_ingredient
    WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = r.ingredient_id
    FOR UPDATE;

    v_stock_before := COALESCE(v_stock_before, 0);
    v_stock_after := v_stock_before - r.needed;

    IF EXISTS (
      SELECT 1 FROM public.foodtruck_has_ingredient
      WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = r.ingredient_id
    ) THEN
      UPDATE public.foodtruck_has_ingredient
      SET stock = v_stock_after
      WHERE foodtruck_id = p_foodtruck_id AND ingredient_id = r.ingredient_id;
    ELSE
      INSERT INTO public.foodtruck_has_ingredient (foodtruck_id, ingredient_id, stock)
      VALUES (p_foodtruck_id, r.ingredient_id, v_stock_after);
    END IF;

    INSERT INTO public.ingredient_stock_movement
      (foodtruck_id, ingredient_id, type, quantity, stock_before, stock_after, notes, profile_id)
    VALUES
      (p_foodtruck_id, r.ingredient_id, 'salida', r.needed, v_stock_before, v_stock_after,
       COALESCE(p_notes, format('Consumo para producir lote "%s"', v_batch_name)), p_profile_id);

    -- Mismo criterio que la venta: nunca bloquea, se permite negativo,
    -- se junta para avisar al final.
    IF v_stock_after <= 0 THEN
      v_low_stock := v_low_stock || jsonb_build_object(
        'ingredient_id', r.ingredient_id,
        'name', r.name,
        'unit', r.unit,
        'stock_after', v_stock_after
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_low_stock) > 0 THEN
    PERFORM public.notify_low_stock_batch(p_foodtruck_id, v_truck_name, v_batch_name, v_low_stock);
  END IF;

  RETURN jsonb_build_object(
    'production_batch_id', p_production_batch_id,
    'low_stock', v_low_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
--
-- PASOS SIGUIENTES:
-- 1. Ejecutar en Supabase SQL Editor.
-- 2. npm run types (regenerar src/types/database.types.ts).
-- ══════════════════════════════════════════════════════════════════════
