-- Fix Fleet Discounts: Add fixed_amount support and improve schema
-- Run this in Supabase SQL Editor

-- Step 1: Add fixed_amount column to fleet_discounts table
ALTER TABLE public.fleet_discounts 
ADD COLUMN IF NOT EXISTS fixed_amount NUMERIC(10,2) DEFAULT 0 CHECK (fixed_amount >= 0);

-- Step 2: Make percent_off nullable (since we'll use either percent_off OR fixed_amount)
-- First, drop the NOT NULL constraint if it exists
DO $$
BEGIN
  -- Check if percent_off has a NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fleet_discounts' 
    AND column_name = 'percent_off'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.fleet_discounts 
    ALTER COLUMN percent_off DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Diagnostic query - Check for problematic rows BEFORE cleanup
-- This will show you which rows violate the constraint
DO $$
DECLARE
  problem_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO problem_count
  FROM public.fleet_discounts
  WHERE NOT (
    (percent_off IS NOT NULL AND percent_off > 0 AND (fixed_amount IS NULL OR fixed_amount = 0)) OR 
    (fixed_amount IS NOT NULL AND fixed_amount > 0 AND (percent_off IS NULL OR percent_off = 0))
  );
  
  IF problem_count > 0 THEN
    RAISE NOTICE 'Found % problematic rows. Cleaning them up...', problem_count;
  END IF;
END $$;

-- Step 3a: Clean up existing data to ensure it meets the constraint requirements
-- Strategy: For each row, ensure it has EITHER percent_off > 0 OR fixed_amount > 0, but not both

-- IMPORTANT: Since fixed_amount was added with DEFAULT 0, all existing rows have fixed_amount = 0
-- We need to handle rows where percent_off is also 0 or NULL

-- First, convert percent_off = 0 to NULL (so it doesn't interfere)
UPDATE public.fleet_discounts 
SET percent_off = NULL 
WHERE percent_off = 0;

-- Now delete rows with neither discount (both NULL or 0) - these are invalid
-- These are rows where percent_off is NULL/0 AND fixed_amount is 0
DELETE FROM public.fleet_discounts 
WHERE (percent_off IS NULL OR percent_off = 0) 
  AND (fixed_amount IS NULL OR fixed_amount = 0);

-- Case 1: Rows with percent_off > 0 - ensure fixed_amount is 0 (explicitly set, not NULL)
UPDATE public.fleet_discounts 
SET fixed_amount = 0 
WHERE percent_off IS NOT NULL AND percent_off > 0;

-- Case 2: Rows with fixed_amount > 0 - ensure percent_off is NULL (not 0)
UPDATE public.fleet_discounts 
SET percent_off = NULL 
WHERE fixed_amount IS NOT NULL AND fixed_amount > 0;

-- Case 3: Rows with both percent_off > 0 AND fixed_amount > 0 - prioritize percent_off
UPDATE public.fleet_discounts 
SET fixed_amount = 0 
WHERE percent_off IS NOT NULL AND percent_off > 0 
  AND fixed_amount IS NOT NULL AND fixed_amount > 0;

-- Final safety check: Ensure all remaining rows have at least one valid discount
-- If any row still has both NULL/0, delete it (shouldn't happen, but just in case)
DELETE FROM public.fleet_discounts 
WHERE NOT (
  (percent_off IS NOT NULL AND percent_off > 0) OR 
  (fixed_amount IS NOT NULL AND fixed_amount > 0)
);

-- Step 4: Final cleanup check - ensure no problematic rows remain
-- This is a safety check before adding the constraint
DO $$
DECLARE
  problem_count INTEGER;
BEGIN
  -- Count problematic rows
  SELECT COUNT(*) INTO problem_count
  FROM public.fleet_discounts
  WHERE NOT (
    (percent_off IS NOT NULL AND percent_off > 0 AND (fixed_amount IS NULL OR fixed_amount = 0)) OR 
    (fixed_amount IS NOT NULL AND fixed_amount > 0 AND (percent_off IS NULL OR percent_off = 0))
  );
  
  -- If there are still problems, try one more cleanup
  IF problem_count > 0 THEN
    -- Delete any remaining invalid rows
    DELETE FROM public.fleet_discounts 
    WHERE NOT (
      (percent_off IS NOT NULL AND percent_off > 0) OR 
      (fixed_amount IS NOT NULL AND fixed_amount > 0)
    );
    
    -- Re-check
    SELECT COUNT(*) INTO problem_count
    FROM public.fleet_discounts
    WHERE NOT (
      (percent_off IS NOT NULL AND percent_off > 0 AND (fixed_amount IS NULL OR fixed_amount = 0)) OR 
      (fixed_amount IS NOT NULL AND fixed_amount > 0 AND (percent_off IS NULL OR percent_off = 0))
    );
    
    IF problem_count > 0 THEN
      RAISE EXCEPTION 'Still have % problematic rows after cleanup. Please run diagnose-fleet-discounts.sql to see details.', problem_count;
    END IF;
  END IF;
END $$;

-- Step 4b: Add a check constraint: must have either percent_off OR fixed_amount (but not both)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'fleet_discounts' 
    AND constraint_name = 'fleet_discounts_discount_check'
  ) THEN
    ALTER TABLE public.fleet_discounts 
    DROP CONSTRAINT fleet_discounts_discount_check;
  END IF;
  
  -- Add new constraint
  ALTER TABLE public.fleet_discounts
  ADD CONSTRAINT fleet_discounts_discount_check 
  CHECK (
    (percent_off IS NOT NULL AND percent_off > 0 AND (fixed_amount IS NULL OR fixed_amount = 0)) OR 
    (fixed_amount IS NOT NULL AND fixed_amount > 0 AND (percent_off IS NULL OR percent_off = 0))
  );
END $$;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fleet_discounts_shop_id ON public.fleet_discounts(shop_id);

-- Step 6: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'fleet_discounts'
ORDER BY ordinal_position;

