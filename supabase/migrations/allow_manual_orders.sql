-- ============================================================
-- Permitir pedidos de mostrador (sin cliente registrado)
-- ============================================================
-- El panel admin ahora puede crear pedidos manualmente (staff toma
-- el pedido en persona). Un cliente de mostrador puede no tener
-- cuenta, así que profile_id deja de ser obligatorio.
--
-- No afecta pedidos existentes ni el flujo de checkout online
-- (ese sigue mandando profile_id siempre, porque requiere login).

ALTER TABLE public.profile_has_order ALTER COLUMN profile_id DROP NOT NULL;

COMMENT ON COLUMN public.profile_has_order.profile_id IS
  'Cliente dueño del pedido. NULL = pedido de mostrador creado por staff sin cuenta asociada.';
