-- Create payments table to track individual payments per invoice
-- Run this SQL in your Supabase SQL editor to create the required table

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  card_fee DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_created_at ON public.invoice_payments(created_at);

-- Enable RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS invoice_payments_select ON public.invoice_payments;
DROP POLICY IF EXISTS invoice_payments_insert ON public.invoice_payments;
DROP POLICY IF EXISTS invoice_payments_update ON public.invoice_payments;
DROP POLICY IF EXISTS invoice_payments_delete ON public.invoice_payments;

-- Create policies that check shop ownership through the invoice
-- Users can only access payments for invoices in their own shops
CREATE POLICY invoice_payments_select ON public.invoice_payments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ts.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY invoice_payments_insert ON public.invoice_payments 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ts.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY invoice_payments_update ON public.invoice_payments 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ts.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY invoice_payments_delete ON public.invoice_payments 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ts.user_id::text = auth.uid()::text
    )
  );
