-- ══════════════════════════════════════════════════════════════════════
-- CORRIDAS DE PRODUCCIÓN + VENTAS POR CORRIDA - 3 STREET FOOD
-- ══════════════════════════════════════════════════════════════════════
-- PROBLEMA QUE RESUELVE
--
-- Hasta hoy `deduct_order_stock` descontaba ingredientes de CUALQUIER
-- producto que tuviera receta (product_has_ingredient), sin distinguir
-- categorías. Eso está bien para lo que se vende tal cual viene (bebidas:
-- 1 coca vendida = 1 unidad menos), pero está MAL para lo que pasa por
-- cocina (arepas): ahí la materia prima ya se consumió al producir el
-- lote, y descontarla otra vez en la venta cuenta doble.
--
-- Además, en la preparación se pierde materia prima (parte de la cebolla,
-- el cartílago del pollo) que ninguna receta por unidad puede modelar
-- bien. Por eso lo que se produce se mide por LOTE, no por unidad.
--
-- MODELO NUEVO
--
--   Producto SIN lote  → categoría de venta directa (bebidas, etc.)
--                        Vender descuenta ingredientes (como hasta ahora).
--
--   Producto CON lote  → sale de producción (arepas)
--                        Vender NO toca ingredientes: suma una unidad a
--                        la corrida abierta de ese lote en ese truck.
--                        El gasto real de materia prima ya quedó
--                        registrado al producir el lote.
--
-- Así se puede responder "cuántas arepas se vendieron de esta producción"
-- y cruzarlo contra lo que costó producirla (production_batch_item).
--
-- Requiere: simplify_production_batches.sql, deduct_ingredient_stock.sql
-- y notification_system.sql ya corridos.
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. VÍNCULO PRODUCTO → LOTE
-- ──────────────────────────────────────────────────────────────────────
-- Es a nivel PRODUCTO (no categoría) para que la arepa de pollo pueda
-- salir del lote de pollo y la de chicharrón del suyo.

ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS production_batch_id BIGINT
    REFERENCES public.production_batch(production_batch_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_production_batch
  ON public.product(production_batch_id)
  WHERE production_batch_id IS NOT NULL;

COMMENT ON COLUMN public.product.production_batch_id IS
  'Si está seteado, el producto sale de producción: vender NO descuenta ingredientes, suma una unidad a la corrida abierta del lote. Si es NULL, se descuenta por receta (product_has_ingredient).';

-- ──────────────────────────────────────────────────────────────────────
-- 2. CORRIDA DE PRODUCCIÓN
-- ──────────────────────────────────────────────────────────────────────
-- Una corrida = "produje este lote en este truck y desde ahora las ventas
-- se cuentan acá". Se abre al producir y se cierra a mano al terminar el
-- turno.

CREATE TABLE IF NOT EXISTS public.production_run (
  production_run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  production_batch_id BIGINT NOT NULL
    REFERENCES public.production_batch(production_batch_id) ON DELETE CASCADE,
  food_truck_id BIGINT NOT NULL
    REFERENCES public.food_truck(food_truck_id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_production_run_batch_truck
  ON public.production_run(production_batch_id, food_truck_id);

-- Solo UNA corrida abierta por lote+truck a la vez. Si no, al vender no
-- sabríamos a cuál imputar la unidad.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_production_run_open
  ON public.production_run(production_batch_id, food_truck_id)
  WHERE closed_at IS NULL;

-- ──────────────────────────────────────────────────────────────────────
-- 3. SALIDA DE LA CORRIDA (unidades vendidas)
-- ──────────────────────────────────────────────────────────────────────
-- Una fila por línea de pedido. Se guarda el detalle (no un contador
-- suelto) para poder revertirlo exacto si el pedido se cancela, y para
-- poder auditar de qué pedido salió cada unidad.

CREATE TABLE IF NOT EXISTS public.production_run_output (
  production_run_output_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NULL = se vendió sin corrida abierta. No se pierde el dato: queda
  -- huérfano y se avisa, pero nunca se frena el pedido.
  production_run_id BIGINT
    REFERENCES public.production_run(production_run_id) ON DELETE SET NULL,
  production_batch_id BIGINT NOT NULL
    REFERENCES public.production_batch(production_batch_id) ON DELETE CASCADE,
  food_truck_id BIGINT NOT NULL
    REFERENCES public.food_truck(food_truck_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL
    REFERENCES public.product(product_id) ON DELETE CASCADE,
  profile_order_id UUID
    REFERENCES public.profile_has_order(profile_order_id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_run_output_run
  ON public.production_run_output(production_run_id);
CREATE INDEX IF NOT EXISTS idx_production_run_output_order
  ON public.production_run_output(profile_order_id);
CREATE INDEX IF NOT EXISTS idx_production_run_output_orphan
  ON public.production_run_output(production_batch_id, food_truck_id)
  WHERE production_run_id IS NULL;

-- ──────────────────────────────────────────────────────────────────────
-- 4. AVISO: se vendió algo de producción sin corrida abierta
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_missing_production_run(
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
  SELECT string_agg(format('%s x%s', x->>'product_name', x->>'quantity'), ', ')
  INTO v_names
  FROM jsonb_array_elements(p_items) x;

  FOR v_staff_id IN
    SELECT profile_id FROM public.profile_has_food_truck WHERE food_truck_id = p_food_truck_id
    UNION
    SELECT phr.profile_id
    FROM public.profile_has_role phr
    JOIN public.roles r ON r.role_id = phr.role_id
    WHERE r.code = 'admin'
  LOOP
    PERFORM public.create_notification(
      v_staff_id,
      format('Venta sin producción abierta en %s', COALESCE(p_truck_name, 'el truck')),
      format('El pedido #%s vendió %s pero no hay una producción abierta. Se registró igual, sin asociar a ninguna corrida.', p_order_number, v_names),
      'warning',
      'system',
      '/dashboard?section=catalog.lotes',
      jsonb_build_object('food_truck_id', p_food_truck_id, 'order_number', p_order_number, 'items', p_items)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 5. ABRIR / CERRAR CORRIDA
-- ──────────────────────────────────────────────────────────────────────
-- `producir_lote` (simplify_production_batches.sql) sigue haciendo lo
-- suyo: descontar los ingredientes del lote. Acá se le suma abrir la
-- corrida, que es lo que habilita el conteo de ventas.

CREATE OR REPLACE FUNCTION public.abrir_produccion(
  p_production_batch_id BIGINT,
  p_foodtruck_id BIGINT,
  p_profile_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_run_id BIGINT;
  v_existing BIGINT;
  v_deduct JSONB;
BEGIN
  SELECT production_run_id INTO v_existing
  FROM public.production_run
  WHERE production_batch_id = p_production_batch_id
    AND food_truck_id = p_foodtruck_id
    AND closed_at IS NULL;

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Ya hay una producción abierta de este lote en este truck. Cerrala antes de abrir otra.';
  END IF;

  -- 1. Consumir la materia prima del lote (y avisar si algo queda en <= 0)
  v_deduct := public.producir_lote(p_production_batch_id, p_foodtruck_id, p_profile_id, p_notes);

  -- 2. Abrir la corrida
  INSERT INTO public.production_run (production_batch_id, food_truck_id, opened_by, notes)
  VALUES (p_production_batch_id, p_foodtruck_id, p_profile_id, p_notes)
  RETURNING production_run_id INTO v_run_id;

  -- 3. Adoptar las ventas huérfanas de este lote+truck que hayan quedado
  --    sin corrida (ej. se vendió antes de acordarse de abrir producción).
  UPDATE public.production_run_output
  SET production_run_id = v_run_id
  WHERE production_run_id IS NULL
    AND production_batch_id = p_production_batch_id
    AND food_truck_id = p_foodtruck_id;

  RETURN jsonb_build_object(
    'production_run_id', v_run_id,
    'low_stock', COALESCE(v_deduct->'low_stock', '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cerrar_produccion(
  p_production_run_id BIGINT,
  p_profile_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_closed TIMESTAMPTZ;
  v_total NUMERIC;
BEGIN
  SELECT closed_at INTO v_closed
  FROM public.production_run WHERE production_run_id = p_production_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La producción % no existe', p_production_run_id;
  END IF;
  IF v_closed IS NOT NULL THEN
    RAISE EXCEPTION 'Esa producción ya estaba cerrada';
  END IF;

  UPDATE public.production_run
  SET closed_at = now(), closed_by = p_profile_id
  WHERE production_run_id = p_production_run_id;

  SELECT COALESCE(SUM(quantity), 0) INTO v_total
  FROM public.production_run_output
  WHERE production_run_id = p_production_run_id;

  RETURN jsonb_build_object('production_run_id', p_production_run_id, 'total_vendido', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 6. DESCUENTO EN LA VENTA — ahora separa inventario vs producción
-- ──────────────────────────────────────────────────────────────────────
-- Reemplaza la versión de deduct_ingredient_stock.sql.

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
  r RECORD;
BEGIN
  SELECT o.order_number, o.stock_deducted, l.food_truck_id
  INTO v_order_number, v_already, v_food_truck_id
  FROM public.profile_has_order o
  LEFT JOIN public.location l ON l.location_id = o.location_id
  WHERE o.profile_order_id = p_profile_order_id;

  -- Sin ubicación no sabemos de qué truck descontar. Si ya se descontó, no se repite.
  IF v_food_truck_id IS NULL OR v_already THEN
    RETURN;
  END IF;

  SELECT name INTO v_truck_name FROM public.food_truck WHERE food_truck_id = v_food_truck_id;

  -- ── 6a. PRODUCTOS DE PRODUCCIÓN (arepas) ────────────────────────────
  -- No tocan ingredientes: suman unidades a la corrida abierta del lote.
  FOR r IN
    SELECT p.product_id, p.name AS product_name, p.production_batch_id, SUM(qty) AS qty
    FROM (
      SELECT od.product_id, od.quantity AS qty
      FROM public.order_detail od
      WHERE od.profile_order_id = p_profile_order_id AND od.product_id IS NOT NULL

      UNION ALL

      -- combo_has_product no tiene cantidad propia: 1 unidad de cada producto
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

    -- Sin corrida abierta se registra igual (huérfano) y se avisa —
    -- mismo criterio que el stock negativo: nunca frenar el servicio.
    IF v_run_id IS NULL THEN
      v_orphans := v_orphans || jsonb_build_object(
        'product_id', r.product_id,
        'product_name', r.product_name,
        'quantity', r.qty
      );
    END IF;
  END LOOP;

  -- ── 6b. PRODUCTOS DE INVENTARIO (bebidas y demás) ───────────────────
  -- Igual que antes, pero excluyendo los que van por producción.
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

-- ──────────────────────────────────────────────────────────────────────
-- 7. DEVOLUCIÓN AL CANCELAR — ahora también revierte la producción
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

  IF v_already IS DISTINCT FROM TRUE THEN
    RETURN;
  END IF;

  -- Las unidades imputadas a una corrida se borran: el pedido no existió,
  -- esas arepas no se vendieron.
  DELETE FROM public.production_run_output WHERE profile_order_id = p_profile_order_id;

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
-- 8. GUARDA: un producto de producción no puede tener receta propia
-- ──────────────────────────────────────────────────────────────────────
-- Sin esto, alguien carga "cebolla" en una arepa desde el panel con toda
-- la buena intención y el sistema empieza a contar doble en silencio.

CREATE OR REPLACE FUNCTION public.check_product_recipe_not_batch()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.product
    WHERE product_id = NEW.product_id AND production_batch_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Este producto sale de un lote de producción: su materia prima se descuenta al producir el lote, no al venderlo. Quitale el lote si querés darle receta propia.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_recipe_not_batch ON public.product_has_ingredient;

CREATE TRIGGER trg_product_recipe_not_batch
  BEFORE INSERT OR UPDATE ON public.product_has_ingredient
  FOR EACH ROW
  EXECUTE FUNCTION public.check_product_recipe_not_batch();

-- Y al revés: no dejar asignar un lote a un producto que ya tiene receta.
CREATE OR REPLACE FUNCTION public.check_product_batch_no_recipe()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.production_batch_id IS NOT NULL
     AND OLD.production_batch_id IS DISTINCT FROM NEW.production_batch_id
     AND EXISTS (SELECT 1 FROM public.product_has_ingredient WHERE product_id = NEW.product_id)
  THEN
    RAISE EXCEPTION 'Este producto tiene receta propia (product_has_ingredient). Borrale la receta antes de asignarle un lote, si no se contaría doble.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_batch_no_recipe ON public.product;

CREATE TRIGGER trg_product_batch_no_recipe
  BEFORE UPDATE ON public.product
  FOR EACH ROW
  EXECUTE FUNCTION public.check_product_batch_no_recipe();

-- ──────────────────────────────────────────────────────────────────────
-- 9. RLS
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.production_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_run_output ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_run_read ON public.production_run;
CREATE POLICY production_run_read ON public.production_run
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS production_run_write ON public.production_run;
CREATE POLICY production_run_write ON public.production_run
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS production_run_output_read ON public.production_run_output;
CREATE POLICY production_run_output_read ON public.production_run_output
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS production_run_output_write ON public.production_run_output;
CREATE POLICY production_run_output_write ON public.production_run_output
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- 10. VISTA DE RENDIMIENTO POR CORRIDA
-- ──────────────────────────────────────────────────────────────────────
-- Cuántas unidades salieron de cada producción, y qué costó producirla.

CREATE OR REPLACE VIEW public.v_production_run_summary AS
SELECT
  pr.production_run_id,
  pr.production_batch_id,
  pb.name              AS batch_name,
  pr.food_truck_id,
  ft.name              AS truck_name,
  pr.opened_at,
  pr.closed_at,
  (pr.closed_at IS NULL) AS is_open,
  COALESCE(out.total_units, 0)  AS units_sold,
  COALESCE(out.distinct_orders, 0) AS orders_count
FROM public.production_run pr
JOIN public.production_batch pb ON pb.production_batch_id = pr.production_batch_id
LEFT JOIN public.food_truck ft ON ft.food_truck_id = pr.food_truck_id
LEFT JOIN LATERAL (
  SELECT SUM(quantity) AS total_units,
         COUNT(DISTINCT profile_order_id) AS distinct_orders
  FROM public.production_run_output o
  WHERE o.production_run_id = pr.production_run_id
) out ON TRUE;

-- ══════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
--
-- PASOS SIGUIENTES:
-- 1. Ejecutar en Supabase SQL Editor.
-- 2. Si las arepas hoy tienen receta propia, borrarla ANTES de asignarles
--    lote (el trigger del punto 8 lo va a exigir):
--      SELECT p.name, i.name FROM product p
--      JOIN product_has_ingredient phi ON phi.product_id = p.product_id
--      JOIN ingredient i ON i.ingredient_id = phi.ingredient_id
--      JOIN category c ON c.category_id = p.category_id
--      WHERE c.name ILIKE 'arepa%';
-- 3. Asignar el lote a cada arepa desde el panel de Productos.
-- 4. npm run types (regenerar src/types/database.types.ts).
-- ══════════════════════════════════════════════════════════════════════
