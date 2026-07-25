-- Alias libre para pedidos "mostrador" (sin profile_id asociado).
-- Permite que el staff etiquete el pedido con un nombre ("Alee", "Mesa 3", etc.)
-- para saber a quién entregarlo, sin necesidad de que el cliente tenga cuenta.

ALTER TABLE profile_has_order
  ADD COLUMN IF NOT EXISTS customer_alias TEXT;

COMMENT ON COLUMN profile_has_order.customer_alias IS
  'Nombre/alias libre para pedidos mostrador (profile_id NULL) — identifica a quién entregar el pedido.';
