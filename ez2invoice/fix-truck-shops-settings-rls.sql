-- Allow authenticated shop owners and members to update their shop settings
-- Run in Supabase SQL Editor if organization settings fail to save

-- Ensure helper exists (from multi-user-team-members-schema.sql)
-- If user_has_shop_access is missing, owner-only policies below still apply

DROP POLICY IF EXISTS "truck_shops_update" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can update own shops" ON public.truck_shops;

-- Owner can always update own shop
CREATE POLICY "Users can update own shops" ON public.truck_shops
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Team members with shop access (when multi-user migration is applied)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'user_has_shop_access'
  ) THEN
    EXECUTE 'CREATE POLICY "truck_shops_update" ON public.truck_shops FOR UPDATE
      USING (user_has_shop_access(auth.uid(), id))
      WITH CHECK (user_has_shop_access(auth.uid(), id))';
  END IF;
END $$;
