-- Fix Fleet Customer Check Constraint
-- Run this in Supabase SQL editor if you're getting "customers_fleet_required_fields_chk" error

-- Drop the existing constraint if it exists
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_fleet_required_fields_chk;

-- Option 1: Remove the constraint entirely (if fleet customers don't need special requirements)
-- This is the simplest solution - just run the DROP command above

-- Option 2: Create a more lenient constraint (if you want to keep some validation)
-- This constraint only requires company name when is_fleet is true
ALTER TABLE public.customers 
ADD CONSTRAINT customers_fleet_required_fields_chk 
CHECK (
  -- If not a fleet customer, no special requirements
  (is_fleet = false) OR
  -- If fleet customer, company name must be provided
  (is_fleet = true AND company IS NOT NULL AND company != '')
);

