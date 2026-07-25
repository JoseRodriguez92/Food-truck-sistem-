-- ══════════════════════════════════════════════════════════════════════
-- BOOTSTRAP: DESCUENTO POR UNIDAD — CATEGORÍA BEBIDAS
-- ══════════════════════════════════════════════════════════════════════
-- El descuento automático (deduct_ingredient_stock.sql) ya funciona por
-- receta de producto (product_has_ingredient), sin importar categoría ni
-- unidad — solo hace falta que cada producto tenga su receta armada.
--
-- Este script arranca eso SOLO para "Bebidas", tratando cada bebida como
-- 1 ingrediente propio contado en UNIDADES (no gramaje):
--
--   1. Por cada producto de la categoría "Bebidas" sin un ingrediente
--      con el mismo nombre, lo crea (unit = 'unidad').
--   2. Lo vincula a sí mismo en product_has_ingredient, quantity = 1
--      (1 bebida vendida = 1 unidad descontada del stock del truck).
--
-- NO toca arepas / chicharrón / relleno de carne — eso queda para
-- después, cuando armemos el modelo de lotes (production_batch), que es
-- distinto porque ahí sí hay preparación extra de por medio.
--
-- Ejecutar en Supabase SQL Editor. Idempotente — se puede correr de
-- nuevo si se agregan bebidas nuevas, no duplica nada.
--
-- ⚠️ Después de correrlo: entrar a Ingredientes en el panel y cargar el
-- stock inicial real de cada bebida nueva (el script NO inventa
-- cantidades — arranca en 0 hasta que lo cuenten y lo carguen).
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_category_id INT;
  v_created_ingredients INT := 0;
  v_linked_recipes INT := 0;
  r RECORD;
  v_ingredient_id INT;
BEGIN
  -- Ajustá este ILIKE si tu categoría no arranca con "Bebida".
  SELECT category_id INTO v_category_id
  FROM public.category
  WHERE name ILIKE 'bebida%'
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'No encontré categoría que empiece con "Bebida". Revisá el nombre exacto en la tabla category y ajustá el WHERE de este script.';
  END IF;

  FOR r IN
    SELECT product_id, name FROM public.product WHERE category_id = v_category_id
  LOOP
    -- 1. Ingrediente 1:1 con el producto (match por nombre)
    SELECT ingredient_id INTO v_ingredient_id
    FROM public.ingredient
    WHERE name = r.name;

    IF v_ingredient_id IS NULL THEN
      INSERT INTO public.ingredient (name, unit)
      VALUES (r.name, 'unidad')
      RETURNING ingredient_id INTO v_ingredient_id;
      v_created_ingredients := v_created_ingredients + 1;
    END IF;

    -- 2. Receta: 1 bebida vendida = 1 unidad descontada
    IF NOT EXISTS (
      SELECT 1 FROM public.product_has_ingredient
      WHERE product_id = r.product_id AND ingredient_id = v_ingredient_id
    ) THEN
      INSERT INTO public.product_has_ingredient (product_id, ingredient_id, quantity)
      VALUES (r.product_id, v_ingredient_id, 1);
      v_linked_recipes := v_linked_recipes + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Ingredientes creados: %, recetas nuevas vinculadas: %', v_created_ingredients, v_linked_recipes;
END $$;

-- Verificación — qué quedó armado para Bebidas
SELECT
  p.name AS producto,
  i.name AS ingrediente,
  i.unit,
  phi.quantity AS cantidad_por_venta
FROM public.product p
JOIN public.category c ON c.category_id = p.category_id
JOIN public.product_has_ingredient phi ON phi.product_id = p.product_id
JOIN public.ingredient i ON i.ingredient_id = phi.ingredient_id
WHERE c.name ILIKE 'bebida%'
ORDER BY p.name;
