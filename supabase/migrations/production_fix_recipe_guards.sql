-- ══════════════════════════════════════════════════════════════════════
-- FIX: sacar las guardas que prohibían receta + lote a la vez
-- ══════════════════════════════════════════════════════════════════════
-- `production_runs_and_sales.sql` agregó dos triggers que impedían que un
-- producto tuviera receta (product_has_ingredient) y lote al mismo tiempo,
-- para evitar el doble conteo.
--
-- Estaban de más y hacían daño: las recetas de las arepas ("La soberana" =
-- Queso, Maduro, Guacamole, Chicharrón) son la composición real del
-- producto — sirven para la cocina, la carta y el costeo — y esos triggers
-- obligaban a borrarlas para poder asignar el lote.
--
-- No hacen falta: `deduct_order_stock` YA ignora la receta de cualquier
-- producto que tenga production_batch_id. La receta simplemente queda como
-- documentación y no descuenta nada.
--
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_product_recipe_not_batch ON public.product_has_ingredient;
DROP FUNCTION IF EXISTS public.check_product_recipe_not_batch();

DROP TRIGGER IF EXISTS trg_product_batch_no_recipe ON public.product;
DROP FUNCTION IF EXISTS public.check_product_batch_no_recipe();

COMMENT ON COLUMN public.product.production_batch_id IS
  'Si está seteado, el producto sale de producción: vender NO descuenta ingredientes (su receta queda como documentación), suma una unidad a la corrida abierta del lote. Si es NULL, se descuenta por receta (product_has_ingredient).';

-- ══════════════════════════════════════════════════════════════════════
-- Silenciar el aviso mientras el lote todavía se está configurando
-- ══════════════════════════════════════════════════════════════════════
-- Asignar el lote a un producto es la forma de que DEJE de descontar
-- ingredientes, y eso suele hacerse antes de tener la receta del lote
-- cargada. En ese lapso, cada venta disparaba "venta sin producción
-- abierta" a todo el staff y a los admins — spam puro.
--
-- Ahora solo avisa si el lote YA tiene receta definida (o sea, si es un
-- lote de verdad en uso). Si está vacío, la venta se registra igual y en
-- silencio: el dato no se pierde y después se adopta al abrir la primera
-- producción.

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
  v_orphans JSONB := '[]'::jsonb;
  v_run_id BIGINT;
  v_batch_configured BOOLEAN;
  r RECORD;
BEGIN
  SELECT o.order_number, o.stock_deducted, l.food_truck_id
  INTO v_order_number, v_already, v_food_truck_id
  FROM public.profile_has_order o
  LEFT JOIN public.location l ON l.location_id = o.location_id
  WHERE o.profile_order_id = p_profile_order_id;

  IF v_food_truck_id IS NULL OR v_already THEN
    RETURN;
  END IF;

  SELECT name INTO v_truck_name FROM public.food_truck WHERE food_truck_id = v_food_truck_id;

  -- ── Productos de producción (arepas) ────────────────────────────────
  FOR r IN
    SELECT p.product_id, p.name AS product_name, p.production_batch_id, SUM(qty) AS qty
    FROM (
      SELECT od.product_id, od.quantity AS qty
      FROM public.order_detail od
      WHERE od.profile_order_id = p_profile_order_id AND od.product_id IS NOT NULL

      UNION ALL

      SELECT chp.product_id, od.quantity AS qty
      FROM public.order_detail od
      JOIN public.combo_has_product chp ON chp.combo_id = od.combo_id
      WHERE od.profile_order_id = p_profile_order_id AND od.combo_id IS NOT NULL
    ) lines
    JOIN public.product p ON p.product_id = lines.product_id
    WHERE p.production_batch_id IS NOT NULL
    GROUP BY p.product_id, p.name, p.production_batch_id
  LOOP
    SELECT production_run_id INTO v_run_id
    FROM public.production_run
    WHERE production_batch_id = r.production_batch_id
      AND food_truck_id = v_food_truck_id
      AND closed_at IS NULL;

    INSERT INTO public.production_run_output
      (production_run_id, production_batch_id, food_truck_id, product_id, profile_order_id, quantity)
    VALUES
      (v_run_id, r.production_batch_id, v_food_truck_id, r.product_id, p_profile_order_id, r.qty);

    IF v_run_id IS NULL THEN
      -- Solo molestar si el lote ya está configurado de verdad
      SELECT EXISTS (
        SELECT 1 FROM public.production_batch_item
        WHERE production_batch_id = r.production_batch_id
      ) INTO v_batch_configured;

      IF v_batch_configured THEN
        v_orphans := v_orphans || jsonb_build_object(
          'product_id', r.product_id,
          'product_name', r.product_name,
          'quantity', r.qty
        );
      END IF;
    END IF;
  END LOOP;

  -- ── Productos de inventario (bebidas y demás) ───────────────────────
  FOR r IN
    SELECT ingredient_id, SUM(needed) AS needed
    FROM (
      SELECT phi.ingredient_id, phi.quantity * od.quantity AS needed
      FROM public.order_detail od
      JOIN public.product p ON p.product_id = od.product_id
      JOIN public.product_has_ingredient phi ON phi.product_id = od.product_id
      WHERE od.profile_order_id = p_profile_order_id
        AND od.product_id IS NOT NULL
        AND p.production_batch_id IS NULL

      UNION ALL

      SELECT phi.ingredient_id, phi.quantity * od.quantity AS needed
      FROM public.order_detail od
      JOIN public.combo_has_product chp ON chp.combo_id = od.combo_id
      JOIN public.product p ON p.product_id = chp.product_id
      JOIN public.product_has_ingredient phi ON phi.product_id = chp.product_id
      WHERE od.profile_order_id = p_profile_order_id
        AND od.combo_id IS NOT NULL
        AND p.production_batch_id IS NULL
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

  IF jsonb_array_length(v_orphans) > 0 THEN
    PERFORM public.notify_missing_production_run(v_food_truck_id, v_truck_name, v_order_number, v_orphans);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
