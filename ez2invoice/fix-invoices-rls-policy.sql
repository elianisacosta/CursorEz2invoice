-- Fix RLS Policies for Invoices and Truck Shops Tables
-- The current policies use FOR ALL USING which doesn't properly handle INSERT operations
-- We need to add WITH CHECK clause for INSERT operations

-- ============================================
-- PART 1: Fix truck_shops RLS Policy
-- ============================================
-- Drop ALL existing truck_shops policies (in case they were created before)
DROP POLICY IF EXISTS "Users can manage own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can view own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can insert own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can update own shops" ON public.truck_shops;
DROP POLICY IF EXISTS "Users can delete own shops" ON public.truck_shops;

-- Create separate policies for truck_shops
-- SELECT policy
CREATE POLICY "Users can view own shops" ON public.truck_shops
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- INSERT policy with WITH CHECK (allows users to create their own shop)
CREATE POLICY "Users can insert own shops" ON public.truck_shops
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- UPDATE policy
CREATE POLICY "Users can update own shops" ON public.truck_shops
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- DELETE policy
CREATE POLICY "Users can delete own shops" ON public.truck_shops
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ============================================
-- PART 2: Fix invoices RLS Policy
-- ============================================
-- Drop ALL existing invoice policies (in case they were created before)
DROP POLICY IF EXISTS "Users can manage invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices for own shops" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices for own shops" ON public.invoices;

-- Create separate policies for better control
-- SELECT, UPDATE, DELETE policy
CREATE POLICY "Users can view invoices for own shops" ON public.invoices
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- INSERT policy with WITH CHECK
CREATE POLICY "Users can insert invoices for own shops" ON public.invoices
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update invoices for own shops" ON public.invoices
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- DELETE policy
CREATE POLICY "Users can delete invoices for own shops" ON public.invoices
  FOR DELETE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

