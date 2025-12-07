-- Migration: Refactor Mechanics to Employees with Employee Types
-- Run this SQL in your Supabase SQL editor to migrate from mechanics to employees
-- This migration preserves all existing data and adds employee_type support

-- Check if mechanics table exists before proceeding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mechanics'
  ) THEN
    RAISE EXCEPTION 'Table "mechanics" does not exist. Please create the mechanics table first using the database-schema.sql file.';
  END IF;
END $$;

-- Step 0: Add shop_id column to mechanics table if it doesn't exist
-- This is needed for proper shop-based access control
ALTER TABLE public.mechanics 
ADD COLUMN IF NOT EXISTS shop_id UUID;

-- Step 0.5: Backfill shop_id from timesheets or work_orders
-- Prefer timesheets.shop_id, fallback to work_orders.shop_id
UPDATE public.mechanics m
SET shop_id = (
  SELECT COALESCE(
    (SELECT DISTINCT t.shop_id FROM public.timesheets t WHERE t.mechanic_id = m.id AND t.shop_id IS NOT NULL LIMIT 1),
    (SELECT DISTINCT wo.shop_id FROM public.work_orders wo WHERE wo.mechanic_id = m.id AND wo.shop_id IS NOT NULL LIMIT 1)
  )
)
WHERE m.shop_id IS NULL;

-- Add foreign key constraint for shop_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'mechanics' 
    AND constraint_name = 'mechanics_shop_id_fkey'
  ) THEN
    ALTER TABLE public.mechanics 
    ADD CONSTRAINT mechanics_shop_id_fkey 
    FOREIGN KEY (shop_id) 
    REFERENCES public.truck_shops(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Step 1: Add employee_type column to mechanics table (before rename)
ALTER TABLE public.mechanics 
ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50) DEFAULT 'Mechanic';

-- Step 2: Set all existing records to 'Mechanic' type
UPDATE public.mechanics 
SET employee_type = 'Mechanic' 
WHERE employee_type IS NULL;

-- Step 3: Add constraint for employee_type values
ALTER TABLE public.mechanics 
ADD CONSTRAINT check_employee_type 
CHECK (employee_type IN ('Mechanic', 'Office Staff', 'Manager', 'Parts Person', 'Receptionist', 'Other'));

-- Step 4: Rename timesheets.mechanic_id to employee_id
-- First, drop the foreign key constraint
ALTER TABLE public.timesheets 
DROP CONSTRAINT IF EXISTS timesheets_mechanic_id_fkey;

-- Rename the column
ALTER TABLE public.timesheets 
RENAME COLUMN mechanic_id TO employee_id;

-- Step 5: Rename mechanics table to employees
ALTER TABLE public.mechanics 
RENAME TO employees;

-- Step 6: Recreate foreign key with new table name
ALTER TABLE public.timesheets 
ADD CONSTRAINT timesheets_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES public.employees(id) 
ON DELETE CASCADE;

-- Step 7: Update indexes
DROP INDEX IF EXISTS idx_mechanics_shop_id;
DROP INDEX IF EXISTS idx_mechanics_status;
DROP INDEX IF EXISTS idx_mechanics_is_active;
DROP INDEX IF EXISTS idx_timesheets_mechanic_id;

-- Create indexes (shop_id should now exist after Step 0)
CREATE INDEX IF NOT EXISTS idx_employees_shop_id ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON public.employees(employee_type);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_id ON public.timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_date ON public.timesheets(work_date);

-- Step 8: Update RLS policies
-- Drop old policies
DROP POLICY IF EXISTS "Users can manage mechanics for own shops" ON public.employees;
DROP POLICY IF EXISTS "Users can manage timesheets for own shops" ON public.timesheets;

-- Create new policies with updated names (shop_id should now exist after Step 0)
CREATE POLICY "Users can manage employees for own shops" ON public.employees
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage timesheets for own shops" ON public.timesheets
  FOR ALL USING (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.truck_shops ts ON e.shop_id = ts.id
      WHERE ts.user_id::text = auth.uid()::text
    )
  );

-- Step 9: Update triggers (if they reference the old table name)
-- The trigger function name should remain the same, just update the table reference
DROP TRIGGER IF EXISTS update_mechanics_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON public.employees 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Update work_orders table if it has mechanic_id column
-- Check if mechanic_id column exists and rename it if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'work_orders' 
    AND column_name = 'mechanic_id'
  ) THEN
    ALTER TABLE public.work_orders 
    DROP CONSTRAINT IF EXISTS work_orders_mechanic_id_fkey;
    
    ALTER TABLE public.work_orders 
    RENAME COLUMN mechanic_id TO employee_id;
    
    ALTER TABLE public.work_orders 
    ADD CONSTRAINT work_orders_employee_id_fkey 
    FOREIGN KEY (employee_id) 
    REFERENCES public.employees(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Migration complete!
-- All existing mechanics are now employees with employee_type = 'Mechanic'
-- You can now add new employees with different types: 'Office Staff', 'Manager', 'Parts Person', etc.

