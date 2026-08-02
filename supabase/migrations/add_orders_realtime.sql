-- ══════════════════════════════════════════════════════════════════════
-- REALTIME — PEDIDOS
-- ══════════════════════════════════════════════════════════════════════
-- Habilita eventos Realtime (INSERT/UPDATE/DELETE) sobre las tablas de
-- pedidos para que el panel (/dashboard — Dashboard, Pedidos, Cocina)
-- se refresque solo cuando entra un pedido nuevo o cambia de estado.
-- Sin esto, supabase.channel(...).on("postgres_changes", ...) no recibe
-- nada aunque el usuario tenga permiso de lectura (RLS) sobre la tabla.
--
-- Ejecutar en Supabase SQL Editor. Idempotente (seguro de re-correr).
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_has_order;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_detail;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_has_status;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
