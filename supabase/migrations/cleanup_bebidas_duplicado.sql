-- ══════════════════════════════════════════════════════════════════════
-- LIMPIEZA: deshace lo que creó bootstrap_bebidas_stock_por_unidad.sql
-- ══════════════════════════════════════════════════════════════════════
-- Resultó que TODAS las bebidas ya tenían su ingrediente real armado de
-- antes (unit = 'un'), solo que con un nombre distinto al del producto
-- (tildes, mayúsculas, singular/plural, espacios). El bootstrap comparaba
-- nombre EXACTO, no los encontró, y creó un ingrediente duplicado
-- (unit = 'unidad', mismo nombre que el producto) para cada bebida.
--
-- Esto borra SOLO esos duplicados (los que quedaron con unit = 'unidad'
-- y nombre igual al producto), dejando intacta la receta real que ya
-- tenían con unit = 'un'.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Borrar la receta duplicada (product_has_ingredient) que apunta al
--    ingrediente "unidad" con nombre igual al producto.
DELETE FROM public.product_has_ingredient phi
USING public.product p, public.ingredient i, public.category c
WHERE phi.product_id = p.product_id
  AND phi.ingredient_id = i.ingredient_id
  AND p.category_id = c.category_id
  AND c.name ILIKE 'bebida%'
  AND i.unit = 'unidad'
  AND i.name = p.name;

-- 2. Borrar el ingrediente duplicado, solo si ya quedó huérfano (sin
--    ninguna receta, stock de truck, o movimiento apuntándole).
DELETE FROM public.ingredient i
WHERE i.unit = 'unidad'
  AND EXISTS (
    SELECT 1 FROM public.product p
    JOIN public.category c ON c.category_id = p.category_id
    WHERE c.name ILIKE 'bebida%' AND p.name = i.name
  )
  AND NOT EXISTS (SELECT 1 FROM public.product_has_ingredient WHERE ingredient_id = i.ingredient_id)
  AND NOT EXISTS (SELECT 1 FROM public.foodtruck_has_ingredient WHERE ingredient_id = i.ingredient_id)
  AND NOT EXISTS (SELECT 1 FROM public.ingredient_stock_movement WHERE ingredient_id = i.ingredient_id);

COMMIT;

-- Verificación: cada bebida debería quedar con exactamente 1 fila (la
-- original, unit = 'un'). Si alguna sale con 0 filas, esa bebida SÍ era
-- nueva de verdad (no tenía ingrediente antes) y hay que armarle receta
-- a mano en el panel.
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
