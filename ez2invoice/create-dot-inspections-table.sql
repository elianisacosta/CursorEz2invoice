-- Create dot_inspections table for Annual Vehicle Inspection Reports
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.dot_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  
  -- Basic inspection information
  date DATE NOT NULL,
  vehicle VARCHAR(255),
  vin VARCHAR(100),
  driver VARCHAR(255),
  inspection_type VARCHAR(100),
  location VARCHAR(255),
  inspector VARCHAR(255),
  result VARCHAR(20) NOT NULL CHECK (result IN ('Pass', 'Fail')),
  violations INTEGER DEFAULT 0,
  
  -- Comprehensive form data stored as JSON
  form_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dot_inspections_shop_id ON public.dot_inspections(shop_id);
CREATE INDEX IF NOT EXISTS idx_dot_inspections_date ON public.dot_inspections(date DESC);
CREATE INDEX IF NOT EXISTS idx_dot_inspections_result ON public.dot_inspections(result);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dot_inspections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own shop's inspections
CREATE POLICY "Users can view their own shop's DOT inspections"
  ON public.dot_inspections
  FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert inspections for their own shop
CREATE POLICY "Users can insert DOT inspections for their own shop"
  ON public.dot_inspections
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own shop's inspections
CREATE POLICY "Users can update their own shop's DOT inspections"
  ON public.dot_inspections
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own shop's inspections
CREATE POLICY "Users can delete their own shop's DOT inspections"
  ON public.dot_inspections
  FOR DELETE
  USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id = auth.uid()
    )
  );

-- Add comment to table
COMMENT ON TABLE public.dot_inspections IS 'Stores DOT Annual Vehicle Inspection Reports (FMCSA Compliance - 49 CFR §396.17 & Appendix G)';

