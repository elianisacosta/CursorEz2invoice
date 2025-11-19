-- EZ2Invoice Database Schema
-- Run these commands in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'starter',
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact messages table
CREATE TABLE public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Truck shops table
CREATE TABLE public.truck_shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  shop_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  service_bays INTEGER DEFAULT 3,
  plan_type VARCHAR(50) DEFAULT 'starter',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  is_fleet BOOLEAN DEFAULT false,
  fleet_manager_user_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trucks table
CREATE TABLE public.trucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  vin VARCHAR(50),
  license_plate VARCHAR(20),
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service bays table
CREATE TABLE public.service_bays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  bay_number INTEGER NOT NULL,
  bay_name VARCHAR(100),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work orders table
CREATE TABLE public.work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE,
  bay_id UUID REFERENCES public.service_bays(id),
  work_order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  description TEXT NOT NULL,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  labor_cost DECIMAL(10,2) DEFAULT 0,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Parts inventory table
CREATE TABLE public.parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  part_number VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  cost DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  supplier VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  item_type VARCHAR(50) DEFAULT 'service', -- 'service', 'part', 'labor'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimates table
CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  estimate_number VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
  valid_until DATE,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Estimate line items
CREATE TABLE IF NOT EXISTS public.estimate_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- labor | part | fee
  reference_id UUID, -- optional link to labor_items or parts
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimate signatures (digital)
CREATE TABLE IF NOT EXISTS public.estimate_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE,
  signer_name VARCHAR(255) NOT NULL,
  signature_data TEXT NOT NULL, -- base64 PNG
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for estimates
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_signatures ENABLE ROW LEVEL SECURITY;

-- Assuming shop ownership is enforced elsewhere, allow all authenticated users for now
CREATE POLICY estimates_select ON public.estimates FOR SELECT USING (true);
CREATE POLICY estimates_insert ON public.estimates FOR INSERT WITH CHECK (true);
CREATE POLICY estimates_update ON public.estimates FOR UPDATE USING (true);
CREATE POLICY estimates_delete ON public.estimates FOR DELETE USING (true);

CREATE POLICY estimate_items_select ON public.estimate_line_items FOR SELECT USING (true);
CREATE POLICY estimate_items_insert ON public.estimate_line_items FOR INSERT WITH CHECK (true);
CREATE POLICY estimate_items_update ON public.estimate_line_items FOR UPDATE USING (true);
CREATE POLICY estimate_items_delete ON public.estimate_line_items FOR DELETE USING (true);

CREATE POLICY estimate_sign_select ON public.estimate_signatures FOR SELECT USING (true);
CREATE POLICY estimate_sign_insert ON public.estimate_signatures FOR INSERT WITH CHECK (true);
CREATE POLICY estimate_sign_update ON public.estimate_signatures FOR UPDATE USING (true);
CREATE POLICY estimate_sign_delete ON public.estimate_signatures FOR DELETE USING (true);

-- Fleet tables
CREATE TABLE IF NOT EXISTS public.fleet_trucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  unit_no VARCHAR(50),
  vin VARCHAR(50),
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fleet_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  scope VARCHAR(20) CHECK (scope IN ('labor','labor_type')) NOT NULL,
  labor_item_id UUID,
  labor_type TEXT,
  percent_off NUMERIC(5,2) CHECK (percent_off >= 0 AND percent_off <= 100) NOT NULL,
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.fleet_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_discounts ENABLE ROW LEVEL SECURITY;

-- Simplified policies: allow all authenticated users to read; writes allowed for now (tighten later)
CREATE POLICY fleet_trucks_select ON public.fleet_trucks FOR SELECT USING (true);
CREATE POLICY fleet_trucks_ins ON public.fleet_trucks FOR INSERT WITH CHECK (true);
CREATE POLICY fleet_trucks_upd ON public.fleet_trucks FOR UPDATE USING (true);
CREATE POLICY fleet_trucks_del ON public.fleet_trucks FOR DELETE USING (true);

CREATE POLICY fleet_discounts_select ON public.fleet_discounts FOR SELECT USING (true);
CREATE POLICY fleet_discounts_ins ON public.fleet_discounts FOR INSERT WITH CHECK (true);
CREATE POLICY fleet_discounts_upd ON public.fleet_discounts FOR UPDATE USING (true);
CREATE POLICY fleet_discounts_del ON public.fleet_discounts FOR DELETE USING (true);

-- Mechanics table
CREATE TABLE public.mechanics (
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
CREATE TABLE public.timesheets (
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Contact messages: Anyone can insert (for contact form)
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- Users: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Truck shops: Users can manage their own shops
CREATE POLICY "Users can manage own shops" ON public.truck_shops
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Customers: Users can manage customers for their shops
CREATE POLICY "Users can manage customers for own shops" ON public.customers
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Trucks: Users can manage trucks for their shops
CREATE POLICY "Users can manage trucks for own shops" ON public.trucks
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Service bays: Users can manage bays for their shops
CREATE POLICY "Users can manage bays for own shops" ON public.service_bays
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Work orders: Users can manage work orders for their shops
CREATE POLICY "Users can manage work orders for own shops" ON public.work_orders
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Parts: Users can manage parts for their shops
CREATE POLICY "Users can manage parts for own shops" ON public.parts
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Invoices: Users can manage invoices for their shops
CREATE POLICY "Users can manage invoices for own shops" ON public.invoices
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Invoice line items: Users can manage line items for their invoices
CREATE POLICY "Users can manage invoice line items for own shops" ON public.invoice_line_items
  FOR ALL USING (
    invoice_id IN (
      SELECT i.id FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE ts.user_id::text = auth.uid()::text
    )
  );

-- Mechanics: Users can manage mechanics for their shops
CREATE POLICY "Users can manage mechanics for own shops" ON public.mechanics
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Timesheets: Users can manage timesheets for their mechanics
CREATE POLICY "Users can manage timesheets for own shops" ON public.timesheets
  FOR ALL USING (
    mechanic_id IN (
      SELECT m.id FROM public.mechanics m
      JOIN public.truck_shops ts ON m.shop_id = ts.id
      WHERE ts.user_id::text = auth.uid()::text
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_truck_shops_user_id ON public.truck_shops(user_id);
CREATE INDEX idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX idx_trucks_shop_id ON public.trucks(shop_id);
CREATE INDEX idx_trucks_customer_id ON public.trucks(customer_id);
CREATE INDEX idx_service_bays_shop_id ON public.service_bays(shop_id);
CREATE INDEX idx_work_orders_shop_id ON public.work_orders(shop_id);
CREATE INDEX idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX idx_work_orders_truck_id ON public.work_orders(truck_id);
CREATE INDEX idx_work_orders_bay_id ON public.work_orders(bay_id);
CREATE INDEX idx_parts_shop_id ON public.parts(shop_id);
CREATE INDEX idx_invoices_shop_id ON public.invoices(shop_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_work_order_id ON public.invoices(work_order_id);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_mechanics_shop_id ON public.mechanics(shop_id);
CREATE INDEX idx_mechanics_status ON public.mechanics(status);
CREATE INDEX idx_mechanics_is_active ON public.mechanics(is_active);
CREATE INDEX idx_timesheets_mechanic_id ON public.timesheets(mechanic_id);
CREATE INDEX idx_timesheets_work_date ON public.timesheets(work_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_truck_shops_updated_at BEFORE UPDATE ON public.truck_shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trucks_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mechanics_updated_at BEFORE UPDATE ON public.mechanics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
