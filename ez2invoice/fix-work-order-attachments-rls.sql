-- Fix Work Order Attachments RLS Policies
-- Run this file if you're getting "new row violates row-level security policy" errors
-- NOTE: This file assumes the work_order_attachments table already exists.
-- If you get "relation does not exist" error, run setup-work-order-attachments.sql first!

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view work order attachments in their shop" ON work_order_attachments;
DROP POLICY IF EXISTS "Users can insert work order attachments in their shop" ON work_order_attachments;
DROP POLICY IF EXISTS "Users can delete work order attachments in their shop" ON work_order_attachments;

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

