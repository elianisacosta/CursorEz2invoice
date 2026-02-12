-- Add internal_notes column to invoices table
-- Run this in your Supabase SQL editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE public.invoices
      ADD COLUMN internal_notes TEXT;

    COMMENT ON COLUMN public.invoices.internal_notes IS
      'Private internal notes for the shop; never shown to customers or in print preview.';
  END IF;
END $$;

