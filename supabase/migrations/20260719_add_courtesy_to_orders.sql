-- Add courtesy support to manual orders
ALTER TABLE public.profile_has_order
  ADD COLUMN IF NOT EXISTS is_courtesy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS courtesy_reason text,
  ADD COLUMN IF NOT EXISTS courtesy_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profile_has_order_courtesy_by_fkey'
  ) THEN
    ALTER TABLE public.profile_has_order
      ADD CONSTRAINT profile_has_order_courtesy_by_fkey
      FOREIGN KEY (courtesy_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profile_has_order_is_courtesy
  ON public.profile_has_order (is_courtesy);
