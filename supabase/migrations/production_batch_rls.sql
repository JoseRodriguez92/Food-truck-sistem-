-- ══════════════════════════════════════════════════════════════════════
-- RLS — PRODUCTION_BATCH / PRODUCTION_BATCH_ITEM
-- ══════════════════════════════════════════════════════════════════════
-- Las tablas quedaron sin políticas tras crearlas (bloquean todo por
-- default). Cualquier usuario autenticado (staff del panel admin) puede
-- gestionar lotes, igual que ya pueden con ingredientes/productos.
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.production_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batch_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.production_batch;
CREATE POLICY "Authenticated full access" ON public.production_batch
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.production_batch_item;
CREATE POLICY "Authenticated full access" ON public.production_batch_item
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
