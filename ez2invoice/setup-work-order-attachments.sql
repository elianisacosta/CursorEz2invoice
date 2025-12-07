-- Complete Setup for Work Order Attachments
-- Run this file to create the table and set up RLS policies in one go

-- 1. Create the work_order_attachments table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS work_order_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_work_order_attachments_work_order_id 
ON work_order_attachments(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_attachments_created_at 
ON work_order_attachments(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE work_order_attachments ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view work order attachments in their shop" ON work_order_attachments;
DROP POLICY IF EXISTS "Users can insert work order attachments in their shop" ON work_order_attachments;
DROP POLICY IF EXISTS "Users can delete work order attachments in their shop" ON work_order_attachments;

-- 5. Create RLS policies

-- Policy: Users can view attachments for work orders in their shop
CREATE POLICY "Users can view work order attachments in their shop"
ON work_order_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    LEFT JOIN truck_shops ts ON wo.shop_id = ts.id
    WHERE wo.id = work_order_attachments.work_order_id
    AND (
      -- User owns the shop
      (ts.user_id = auth.uid())
      OR
      -- Work order has no shop_id but user is authenticated (fallback)
      (wo.shop_id IS NULL AND auth.uid() IS NOT NULL)
    )
  )
);

-- Policy: Users can insert attachments for work orders in their shop
-- More permissive: allows any authenticated user to insert if work order exists
CREATE POLICY "Users can insert work order attachments in their shop"
ON work_order_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM work_orders wo
      LEFT JOIN truck_shops ts ON wo.shop_id = ts.id
      WHERE wo.id = work_order_attachments.work_order_id
      AND (
        -- User owns the shop
        (ts.user_id = auth.uid())
        OR
        -- Work order has no shop_id but user is authenticated (fallback)
        (wo.shop_id IS NULL AND auth.uid() IS NOT NULL)
      )
    )
    OR
    -- Allow if work order exists and user is authenticated (more permissive)
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_attachments.work_order_id
    )
  )
);

-- Policy: Users can delete attachments for work orders in their shop
CREATE POLICY "Users can delete work order attachments in their shop"
ON work_order_attachments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    LEFT JOIN truck_shops ts ON wo.shop_id = ts.id
    WHERE wo.id = work_order_attachments.work_order_id
    AND (
      -- User owns the shop
      (ts.user_id = auth.uid())
      OR
      -- Work order has no shop_id but user is authenticated (fallback)
      (wo.shop_id IS NULL AND auth.uid() IS NOT NULL)
    )
  )
);

-- 6. Add table comments
COMMENT ON TABLE work_order_attachments IS 'Stores references to photos and documents attached to work orders';
COMMENT ON COLUMN work_order_attachments.file_url IS 'Public URL of the file stored in Supabase Storage';
COMMENT ON COLUMN work_order_attachments.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN work_order_attachments.file_type IS 'MIME type of the file (e.g., image/jpeg)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Work order attachments table and policies created successfully!';
  RAISE NOTICE 'Next step: Create the storage bucket "work-order-attachments" in your Supabase Dashboard > Storage';
END $$;

