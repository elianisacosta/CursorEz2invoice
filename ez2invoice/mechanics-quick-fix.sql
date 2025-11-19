-- Quick Fix: Add Mechanics and Timesheets Tables
-- Run this SQL in your Supabase SQL editor if you already have the main database schema
-- but are missing the mechanics and timesheets tables

-- Mechanics table
CREATE TABLE IF NOT EXISTS public.mechanics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255),
  duties_description TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  hire_date DATE,
  status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'Busy', 'Vacation', 'Off')),
  vacation_weeks_per_year INTEGER DEFAULT 2,
  vacation_weeks_used INTEGER DEFAULT 0,
  default_start_time TIME DEFAULT '08:30',
  default_end_time TIME DEFAULT '17:30',
  skills TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets table
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(5,2),
  payment_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mechanics
CREATE POLICY "Users can manage mechanics for own shops" ON public.mechanics
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- RLS Policies for timesheets
CREATE POLICY "Users can manage timesheets for own shops" ON public.timesheets
  FOR ALL USING (
    mechanic_id IN (
      SELECT m.id FROM public.mechanics m
      JOIN public.truck_shops ts ON m.shop_id = ts.id
      WHERE ts.user_id::text = auth.uid()::text
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mechanics_shop_id ON public.mechanics(shop_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_status ON public.mechanics(status);
CREATE INDEX IF NOT EXISTS idx_mechanics_is_active ON public.mechanics(is_active);
CREATE INDEX IF NOT EXISTS idx_timesheets_mechanic_id ON public.timesheets(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_date ON public.timesheets(work_date);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_mechanics_updated_at BEFORE UPDATE ON public.mechanics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
