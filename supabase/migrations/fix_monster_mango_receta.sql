-- ══════════════════════════════════════════════════════════════════════
-- FIX: repone la receta que el cleanup se llevó de más
-- ══════════════════════════════════════════════════════════════════════
-- "Monster de mango" era el único caso real sin ingrediente previo (el
-- bootstrap se lo creó bien, pero el cleanup lo borró junto con los
-- duplicados sin distinguir). Esto crea el ingrediente + receta SOLO
-- para productos de Bebidas que hayan quedado sin ninguna receta.
-- Idempotente — no repite si ya tiene una.
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
  v_ingredient_id INT;
BEGIN
  FOR r IN
    SELECT p.product_id, p.name, trim(p.name) AS clean_name
    FROM public.product p
    JOIN public.category c ON c.category_id = p.category_id
    WHERE c.name ILIKE 'bebida%'
      AND NOT EXISTS (SELECT 1 FROM public.product_has_ingredient WHERE product_id = p.product_id)
  LOOP
    SELECT ingredient_id INTO v_ingredient_id FROM public.ingredient WHERE name = r.clean_name;

    IF v_ingredient_id IS NULL THEN
      INSERT INTO public.ingredient (name, unit)
      VALUES (r.clean_name, 'un')
      RETURNING ingredient_id INTO v_ingredient_id;
    END IF;

    INSERT INTO public.product_has_ingredient (product_id, ingredient_id, quantity)
    VALUES (r.product_id, v_ingredient_id, 1);

    RAISE NOTICE 'Receta repuesta para "%": ingrediente "%"', r.name, r.clean_name;
  END LOOP;
END $$;

-- Verificación final — todas las bebidas deberían tener exactamente 1 receta.
SELECT
  p.name AS producto,
  count(phi.product_ingredient_id) AS recetas,
  string_agg(i.name || ' (' || i.unit || ')', ', ') AS ingredientes
FROM public.product p
JOIN public.category c ON c.category_id = p.category_id
LEFT JOIN public.product_has_ingredient phi ON phi.product_id = p.product_id
LEFT JOIN public.ingredient i ON i.ingredient_id = phi.ingredient_id
WHERE c.name ILIKE 'bebida%'
GROUP BY p.product_id, p.name
ORDER BY p.name;
