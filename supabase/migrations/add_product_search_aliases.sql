-- ══════════════════════════════════════════════════════════════════════
-- ALIAS DE BÚSQUEDA — PRODUCTOS Y COMBOS
-- ══════════════════════════════════════════════════════════════════════
-- Permite registrar apodos/nombres coloquiales de un producto o combo
-- (ej. "parcerita" para una arepa puntual) que no se parecen al nombre
-- real, para que el "Pedido rápido" (texto libre → pedido) los reconozca.
-- Coexiste con el nombre real: la búsqueda revisa ambos.
-- Idempotente.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS search_aliases TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.combo
  ADD COLUMN IF NOT EXISTS search_aliases TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.product.search_aliases IS
  'Apodos/nombres coloquiales para que el Pedido Rápido (texto libre) reconozca el producto aunque no coincida con el nombre real.';
COMMENT ON COLUMN public.combo.search_aliases IS
  'Apodos/nombres coloquiales para que el Pedido Rápido (texto libre) reconozca el combo aunque no coincida con el nombre real.';

-- Ejemplo de uso manual (ajustar product_id real antes de correr):
-- UPDATE public.product SET search_aliases = ARRAY['parcerita'] WHERE product_id = 123;
