-- Work Order Events Table
-- This table tracks events/history for work orders (created, moved, completed, etc.)
-- Run this SQL in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.work_order_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'started', 'moved', 'completed', 'mechanic_assigned', 'mechanic_changed')),
  from_bay_id UUID REFERENCES public.service_bays(id) ON DELETE SET NULL,
  to_bay_id UUID REFERENCES public.service_bays(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_order_events_work_order_id ON public.work_order_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_events_created_at ON public.work_order_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_order_events_event_type ON public.work_order_events(event_type);

-- Enable Row Level Security
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage work order events for their shops
CREATE POLICY "Users can manage work order events for own shops" ON public.work_order_events
  FOR ALL USING (
    work_order_id IN (
      SELECT id FROM public.work_orders 
      WHERE shop_id IN (
        SELECT id FROM public.truck_shops 
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- Note: If you're using mechanic_id instead of employee_id, you can add this column:
-- ALTER TABLE public.work_order_events ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

