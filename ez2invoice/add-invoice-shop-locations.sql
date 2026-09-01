-- Shop-specific invoice location labels (manual assignment + filter options).
-- Run before update-invoice-balances-view-location.sql

CREATE TABLE IF NOT EXISTS public.shop_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT shop_locations_shop_name_unique UNIQUE (shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_shop_locations_shop_id ON public.shop_locations(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_locations_shop_active_sort
  ON public.shop_locations(shop_id, is_active, sort_order, name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.invoices
      ADD COLUMN location_id UUID REFERENCES public.shop_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_location_id ON public.invoices(location_id);

ALTER TABLE public.shop_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_locations_select" ON public.shop_locations;
DROP POLICY IF EXISTS "shop_locations_insert" ON public.shop_locations;
DROP POLICY IF EXISTS "shop_locations_update" ON public.shop_locations;
DROP POLICY IF EXISTS "shop_locations_delete" ON public.shop_locations;

CREATE POLICY "shop_locations_select" ON public.shop_locations FOR SELECT
  USING (user_has_shop_access(auth.uid(), shop_id));

CREATE POLICY "shop_locations_insert" ON public.shop_locations FOR INSERT
  WITH CHECK (user_has_shop_access(auth.uid(), shop_id));

CREATE POLICY "shop_locations_update" ON public.shop_locations FOR UPDATE
  USING (user_has_shop_access(auth.uid(), shop_id));

CREATE POLICY "shop_locations_delete" ON public.shop_locations FOR DELETE
  USING (user_has_shop_access(auth.uid(), shop_id));

COMMENT ON TABLE public.shop_locations IS 'Per-shop invoice location labels for the Invoice List (manual assignment and filters).';
COMMENT ON COLUMN public.invoices.location_id IS 'Manual invoice location when no active digital work-order bay applies.';
