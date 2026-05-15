-- Add organization / invoice settings columns to truck_shops
-- Run in Supabase SQL Editor

ALTER TABLE public.truck_shops
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS labor_rate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5, 2) DEFAULT 6,
  ADD COLUMN IF NOT EXISTS card_processing_fee_percentage DECIMAL(5, 2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS invoice_terms TEXT DEFAULT 'Payment due within 30 days';
