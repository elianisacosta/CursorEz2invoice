-- Inventory History Table
-- Run this in Supabase SQL editor to track inventory movements

-- Create inventory_history table
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID REFERENCES public.parts(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'adjustment', 'sale', 'return', 'received', 'damaged', etc.
  quantity_change INTEGER NOT NULL, -- positive for additions, negative for removals
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  created_by VARCHAR(255) DEFAULT 'System', -- user email or 'System'
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_history_part_id ON public.inventory_history(part_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON public.inventory_history(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_history_activity_type ON public.inventory_history(activity_type);

-- Enable Row Level Security
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view inventory history for their shop's parts
CREATE POLICY "Users can view inventory history for own shops" ON public.inventory_history
  FOR SELECT USING (
    part_id IN (
      SELECT p.id FROM public.parts p
      JOIN public.truck_shops ts ON p.shop_id = ts.id
      WHERE ts.user_id::text = auth.uid()::text
    )
  );

-- RLS Policy: Users can insert inventory history for their shop's parts
CREATE POLICY "Users can insert inventory history for own shops" ON public.inventory_history
  FOR INSERT WITH CHECK (
    part_id IN (
      SELECT p.id FROM public.parts p
      JOIN public.truck_shops ts ON p.shop_id = ts.id
      WHERE ts.user_id::text = auth.uid()::text
    )
  );

