-- Work Order Attachments Schema
-- This file creates the necessary database table and storage bucket for work order photo attachments

-- 1. Create the work_order_attachments table
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

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_order_attachments_work_order_id 
ON work_order_attachments(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_attachments_created_at 
ON work_order_attachments(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE work_order_attachments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view work order attachments in their shop" ON work_order_attachments;
DROP POLICY IF EXISTS "Users can insert work order attachments in their shop" ON work_order_attachments;
DROP POLICY IF EXISTS "Users can delete work order attachments in their shop" ON work_order_attachments;

-- Policy: Users can view attachments for work orders in their shop
-- This policy checks if the work order belongs to a shop owned by the current user
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
-- This policy allows authenticated users to insert attachments
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

-- 5. Storage Bucket Setup Instructions
-- After running this SQL, you need to:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Storage
-- 3. Click "Create a new bucket"
-- 4. Name it: "work-order-attachments"
-- 5. Make it PUBLIC (or configure policies as needed)
-- 6. Set up storage policies if you want more control

-- Optional: Create storage policies via SQL
-- Note: Storage policies are managed differently. You can set them up in the Supabase Dashboard
-- or use the Storage API. Here's an example policy:

-- Allow authenticated users to upload files
-- INSERT policy for storage.objects
-- This would need to be set up in the Supabase Dashboard under Storage > Policies

COMMENT ON TABLE work_order_attachments IS 'Stores references to photos and documents attached to work orders';
COMMENT ON COLUMN work_order_attachments.file_url IS 'Public URL of the file stored in Supabase Storage';
COMMENT ON COLUMN work_order_attachments.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN work_order_attachments.file_type IS 'MIME type of the file (e.g., image/jpeg)';

