-- order_detail tiene RLS activado (assign_employees_to_trucks.sql) pero solo
-- con políticas de SELECT e INSERT. Sin política de DELETE, Postgres no tira
-- error al borrar — simplemente borra 0 filas en silencio. Por eso
-- updateManualOrder() (editar pedido) nunca lograba limpiar las líneas viejas
-- antes de insertar las nuevas: cada guardado apilaba otra copia encima.
DROP POLICY IF EXISTS "order_detail_delete_scoped" ON public.order_detail;
CREATE POLICY "order_detail_delete_scoped" ON public.order_detail
  FOR DELETE TO authenticated
  USING (public.can_access_order(profile_order_id));

-- Por si alguna vez se actualiza una línea en vez de borrar+insertar.
DROP POLICY IF EXISTS "order_detail_update_scoped" ON public.order_detail;
CREATE POLICY "order_detail_update_scoped" ON public.order_detail
  FOR UPDATE TO authenticated
  USING (public.can_access_order(profile_order_id))
  WITH CHECK (public.can_access_order(profile_order_id));
