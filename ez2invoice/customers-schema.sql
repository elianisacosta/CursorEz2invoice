-- Customers, Fleet Trucks, Fleet Discounts, and Labor Items schema for Supabase
-- Run this in Supabase SQL editor

-- Enable UUID (choose one extension available in your project)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  company text,
  is_fleet boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers((lower(coalesce(first_name,'')||' '||coalesce(last_name,''))));

-- Labor Items (minimal for discounts reference)
CREATE TABLE IF NOT EXISTS public.labor_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  description text,
  category text,
  rate_type text CHECK (rate_type IN ('fixed','hourly')) DEFAULT 'fixed',
  hourly_rate numeric,
  fixed_rate numeric,
  created_at timestamptz DEFAULT now()
);

-- Fleet Trucks
CREATE TABLE IF NOT EXISTS public.fleet_trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  unit_no text,
  vin text,
  year int,
  make text,
  model text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_trucks_customer ON public.fleet_trucks(customer_id);

-- Fleet Discounts
CREATE TABLE IF NOT EXISTS public.fleet_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('labor','labor_type')),
  labor_item_id uuid REFERENCES public.labor_items(id) ON DELETE SET NULL,
  labor_type text,
  percent_off int NOT NULL CHECK (percent_off >= 0 AND percent_off <= 100),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_discounts_customer ON public.fleet_discounts(customer_id);

-- RLS: enable and allow authenticated and anon for development
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_discounts ENABLE ROW LEVEL SECURITY;

-- Permissive dev policies (replace with stricter ones in production)
DO $$ BEGIN
  -- customers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customers' AND policyname='dev_customers_all'
  ) THEN
    CREATE POLICY dev_customers_all ON public.customers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- labor_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='labor_items' AND policyname='dev_labor_all'
  ) THEN
    CREATE POLICY dev_labor_all ON public.labor_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- fleet_trucks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fleet_trucks' AND policyname='dev_trucks_all'
  ) THEN
    CREATE POLICY dev_trucks_all ON public.fleet_trucks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- fleet_discounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fleet_discounts' AND policyname='dev_discounts_all'
  ) THEN
    CREATE POLICY dev_discounts_all ON public.fleet_discounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Optional seed labor items for testing
INSERT INTO public.labor_items (service_name, description, category, rate_type, fixed_rate)
VALUES
  ('Oil change & PM','Standard oil service','General','fixed', 79.00),
  ('Brake shoes labor','Brake service','Brakes','fixed', 150.00),
  ('Alignment per axle','Wheel alignment','General','fixed', 95.00)
ON CONFLICT DO NOTHING;

