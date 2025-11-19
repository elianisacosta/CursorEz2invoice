-- Add mechanic_id column to work_orders table
-- This allows work orders to be assigned to specific mechanics/employees

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'mechanic_id'
    ) THEN
        ALTER TABLE public.work_orders 
        ADD COLUMN mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE SET NULL;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_work_orders_mechanic_id ON public.work_orders(mechanic_id);
    END IF;
END $$;

