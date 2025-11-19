-- Fix Timesheets Table Columns
-- Run this in Supabase SQL editor if you're getting "Could not find the 'end_time' column" error

-- Check and add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add end_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN end_time TIME NOT NULL DEFAULT '17:00';
    END IF;

    -- Add start_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'start_time'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN start_time TIME NOT NULL DEFAULT '08:00';
    END IF;

    -- Add work_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'work_date'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN work_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Add total_hours if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'total_hours'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN total_hours DECIMAL(5,2);
    END IF;

    -- Add payment_amount if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'payment_amount'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN payment_amount DECIMAL(10,2);
    END IF;

    -- Add notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN notes TEXT;
    END IF;

    -- Add mechanic_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'timesheets' 
        AND column_name = 'mechanic_id'
    ) THEN
        ALTER TABLE public.timesheets ADD COLUMN mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Remove default values from required columns (they were only for migration)
ALTER TABLE public.timesheets ALTER COLUMN end_time DROP DEFAULT;
ALTER TABLE public.timesheets ALTER COLUMN start_time DROP DEFAULT;
ALTER TABLE public.timesheets ALTER COLUMN work_date DROP DEFAULT;

-- Note: After running this script, you may need to wait a few seconds for Supabase 
-- to refresh its schema cache, or refresh your Supabase dashboard.

