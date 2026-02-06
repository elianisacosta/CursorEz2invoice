-- Vendor Bills Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Add fields to parts table if needed
-- ============================================
-- Add avg_cost and last_cost to parts table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'parts' AND column_name = 'avg_cost') THEN
    ALTER TABLE public.parts ADD COLUMN avg_cost NUMERIC(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'parts' AND column_name = 'last_cost') THEN
    ALTER TABLE public.parts ADD COLUMN last_cost NUMERIC(10,2);
  END IF;
END $$;

-- ============================================
-- PART 2: Create vendor tables
-- ============================================

-- Vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor bills table
CREATE TABLE IF NOT EXISTS public.vendor_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  invoice_number TEXT,
  invoice_date DATE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'posted')) DEFAULT 'draft',
  pdf_url TEXT,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor bill lines table
CREATE TABLE IF NOT EXISTS public.vendor_bill_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  vendor_sku TEXT,
  description TEXT,
  qty NUMERIC(10,2) DEFAULT 1,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  line_total NUMERIC(10,2) DEFAULT 0,
  inventory_item_id UUID REFERENCES public.parts(id),
  match_status TEXT CHECK (match_status IN ('matched', 'needs_review')) DEFAULT 'needs_review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor item mapping table (for auto-matching)
CREATE TABLE IF NOT EXISTS public.vendor_item_map (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  vendor_sku TEXT NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, vendor_id, vendor_sku)
);

-- Inventory movements table (tracks inventory changes from bills)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  qty_change NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_type, source_id, item_id, unit_cost, qty_change)
);

-- ============================================
-- PART 3: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vendors_shop_id ON public.vendors(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_shop_id ON public.vendor_bills(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor_id ON public.vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON public.vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bill_lines_bill_id ON public.vendor_bill_lines(bill_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bill_lines_shop_id ON public.vendor_bill_lines(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_item_map_shop_vendor_sku ON public.vendor_item_map(shop_id, vendor_id, vendor_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON public.inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_source ON public.inventory_movements(source_type, source_id);

-- ============================================
-- PART 4: Enable RLS
-- ============================================
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_item_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: RLS Policies
-- ============================================

-- Vendors policies
CREATE POLICY "Users can view vendors for own shops" ON public.vendors
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert vendors for own shops" ON public.vendors
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update vendors for own shops" ON public.vendors
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete vendors for own shops" ON public.vendors
  FOR DELETE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Vendor bills policies
CREATE POLICY "Users can view vendor bills for own shops" ON public.vendor_bills
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert vendor bills for own shops" ON public.vendor_bills
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update vendor bills for own shops" ON public.vendor_bills
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete vendor bills for own shops" ON public.vendor_bills
  FOR DELETE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Vendor bill lines policies
CREATE POLICY "Users can view vendor bill lines for own shops" ON public.vendor_bill_lines
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert vendor bill lines for own shops" ON public.vendor_bill_lines
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update vendor bill lines for own shops" ON public.vendor_bill_lines
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete vendor bill lines for own shops" ON public.vendor_bill_lines
  FOR DELETE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Vendor item map policies
CREATE POLICY "Users can view vendor item map for own shops" ON public.vendor_item_map
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert vendor item map for own shops" ON public.vendor_item_map
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update vendor item map for own shops" ON public.vendor_item_map
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete vendor item map for own shops" ON public.vendor_item_map
  FOR DELETE USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Inventory movements policies
CREATE POLICY "Users can view inventory movements for own shops" ON public.inventory_movements
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert inventory movements for own shops" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM public.truck_shops 
      WHERE user_id::text = auth.uid()::text
    )
  );
