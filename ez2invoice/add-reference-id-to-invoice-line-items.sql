-- Add reference_id column to invoice_line_items table
-- This allows linking line items to labor_items or parts tables
-- Run this in your Supabase SQL editor

-- Add reference_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_line_items' 
        AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE public.invoice_line_items 
        ADD COLUMN reference_id UUID;
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.invoice_line_items.reference_id IS 
        'Optional reference to labor_items.id or parts.id';
    END IF;
END $$;

