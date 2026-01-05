-- Fix Invoice Number Uniqueness: Make invoice_number unique per shop
-- Run this in Supabase SQL Editor

-- ============================================
-- Step 1: Drop the global unique constraint
-- ============================================
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- ============================================
-- Step 2: Create composite unique constraint (shop_id, invoice_number)
-- ============================================
-- This ensures invoice numbers are unique per shop, not globally
CREATE UNIQUE INDEX IF NOT EXISTS invoices_shop_id_invoice_number_key 
ON public.invoices(shop_id, invoice_number);

-- ============================================
-- Step 3: Create invoice_counters table for atomic number generation
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  shop_id UUID PRIMARY KEY REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  next_number BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists with INTEGER, alter the column to BIGINT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_counters' 
    AND column_name = 'next_number'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.invoice_counters 
    ALTER COLUMN next_number TYPE BIGINT;
  END IF;
END $$;

-- Enable RLS on invoice_counters
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view/update counters for their own shops
DROP POLICY IF EXISTS "Users can manage invoice counters for own shops" ON public.invoice_counters;
CREATE POLICY "Users can manage invoice counters for own shops" ON public.invoice_counters
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- ============================================
-- Step 4: Create function to generate invoice number atomically
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number BIGINT;
  v_formatted_number TEXT;
BEGIN
  -- Insert or update counter atomically
  INSERT INTO public.invoice_counters (shop_id, next_number, updated_at)
  VALUES (p_shop_id, 1, NOW())
  ON CONFLICT (shop_id) 
  DO UPDATE SET 
    next_number = invoice_counters.next_number + 1,
    updated_at = NOW()
  RETURNING next_number INTO v_next_number;
  
  -- Format as INV-000001, INV-000002, etc.
  v_formatted_number := 'INV-' || LPAD(v_next_number::TEXT, 6, '0');
  
  RETURN v_formatted_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_invoice_number(UUID) TO authenticated;

-- ============================================
-- Step 5: Create trigger to auto-generate invoice_number if missing
-- ============================================
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if invoice_number is not provided or is empty
  IF NEW.invoice_number IS NULL OR TRIM(NEW.invoice_number) = '' THEN
    NEW.invoice_number := generate_invoice_number(NEW.shop_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.invoices;

-- Create the trigger
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- ============================================
-- Step 6: Backfill invoice_counters for existing shops
-- ============================================
-- Initialize counters for shops that already have invoices
-- Only extract reasonable invoice numbers (less than 1 million) to avoid issues
INSERT INTO public.invoice_counters (shop_id, next_number)
SELECT 
  shop_id,
  COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ '^INV-(\d+)$' THEN
        LEAST((regexp_match(invoice_number, '^INV-(\d+)$'))[1]::BIGINT, 999999)
      WHEN invoice_number ~ '^\d+$' AND invoice_number::BIGINT < 1000000 THEN
        invoice_number::BIGINT
      ELSE 0
    END
  ), 0) + 1
FROM public.invoices
WHERE shop_id IS NOT NULL
GROUP BY shop_id
ON CONFLICT (shop_id) DO NOTHING;

-- For shops with no invoices, initialize to 1
INSERT INTO public.invoice_counters (shop_id, next_number)
SELECT id, 1
FROM public.truck_shops
WHERE id NOT IN (SELECT shop_id FROM public.invoice_counters)
ON CONFLICT (shop_id) DO NOTHING;

