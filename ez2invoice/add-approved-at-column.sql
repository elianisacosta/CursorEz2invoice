-- Add approved_at column to estimates table if it doesn't exist
-- Run this in your Supabase SQL Editor

-- Check if column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'estimates' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.estimates 
        ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Column approved_at added to estimates table';
    ELSE
        RAISE NOTICE 'Column approved_at already exists in estimates table';
    END IF;
END $$;

