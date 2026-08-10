-- Add optional per-line notes to invoice_line_items.
-- description remains the item/service name (e.g. "TAKE TIRE OUT").
-- notes stores the optional note/description under the line item.
-- Run this in your Supabase SQL editor if not already applied.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'invoice_line_items'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.invoice_line_items
        ADD COLUMN notes text;

        COMMENT ON COLUMN public.invoice_line_items.notes IS
        'Optional per-line note/description; separate from description (item/service name)';
    END IF;
END $$;
