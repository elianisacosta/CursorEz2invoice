-- Add taxable column to invoice_line_items table
-- Used for "Include in tax" checkbox: cash customers can exclude labor or specific parts from tax.
-- Run this in your Supabase SQL editor.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'invoice_line_items'
        AND column_name = 'taxable'
    ) THEN
        ALTER TABLE public.invoice_line_items
        ADD COLUMN taxable BOOLEAN DEFAULT true;

        COMMENT ON COLUMN public.invoice_line_items.taxable IS
        'When true, line amount is included in taxable subtotal (e.g. for cash customers: parts taxable, labor optional)';
    END IF;
END $$;
