-- Fix Labor Items Table Columns
-- Run this in Supabase SQL editor if you're getting "Could not find the 'est_hours' column" error

-- Check and add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add est_hours if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'labor_items' 
        AND column_name = 'est_hours'
    ) THEN
        ALTER TABLE public.labor_items ADD COLUMN est_hours numeric;
    END IF;

    -- Add user_id if it doesn't exist (some schemas might need this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'labor_items' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.labor_items ADD COLUMN user_id uuid;
    END IF;

    -- Add rate if it doesn't exist (might be named differently)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'labor_items' 
        AND column_name = 'rate'
    ) THEN
        -- Check if fixed_rate or hourly_rate exists and use that as reference
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'labor_items' 
            AND column_name = 'fixed_rate'
        ) THEN
            -- If fixed_rate exists, we might not need rate column
            -- But add it anyway for compatibility
            ALTER TABLE public.labor_items ADD COLUMN rate numeric;
        ELSE
            ALTER TABLE public.labor_items ADD COLUMN rate numeric;
        END IF;
    END IF;
END $$;

-- Note: After running this script, you may need to wait a few seconds for Supabase 
-- to refresh its schema cache, or refresh your Supabase dashboard.

