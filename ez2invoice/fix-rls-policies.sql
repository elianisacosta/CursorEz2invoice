-- Fix RLS Policies for Customers Tables
-- Run this in Supabase SQL editor if you're getting empty errors when creating customers

-- Drop existing policies if they exist (to ensure clean slate)
DROP POLICY IF EXISTS dev_customers_all ON public.customers;
DROP POLICY IF EXISTS dev_labor_all ON public.labor_items;
DROP POLICY IF EXISTS dev_trucks_all ON public.fleet_trucks;
DROP POLICY IF EXISTS dev_discounts_all ON public.fleet_discounts;
DROP POLICY IF EXISTS dev_parts_all ON public.parts;
DROP POLICY IF EXISTS dev_inventory_history_all ON public.inventory_history;
DROP POLICY IF EXISTS dev_timesheets_all ON public.timesheets;
DROP POLICY IF EXISTS dev_mechanics_all ON public.mechanics;

-- Create permissive policies for development
CREATE POLICY dev_customers_all ON public.customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_labor_all ON public.labor_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_trucks_all ON public.fleet_trucks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_discounts_all ON public.fleet_discounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_parts_all ON public.parts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_inventory_history_all ON public.inventory_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_timesheets_all ON public.timesheets
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY dev_mechanics_all ON public.mechanics
  FOR ALL
  USING (true)
  WITH CHECK (true);
