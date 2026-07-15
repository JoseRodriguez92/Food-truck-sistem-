-- ============================================================
-- Asociar pedidos a una ubicación (llave foránea faltante)
-- ============================================================
-- Hoy un pedido no queda ligado a ningún food truck / ubicación,
-- aunque el cliente sí elige una al navegar el menú (?location=X)
-- y el panel también necesita saberlo para pedidos de mostrador.
-- location_id es nullable para no romper pedidos históricos.

ALTER TABLE public.profile_has_order
  ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.location(location_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profile_has_order_location ON public.profile_has_order(location_id);

COMMENT ON COLUMN public.profile_has_order.location_id IS
  'Ubicación/food truck donde se hizo o debe prepararse el pedido.';
