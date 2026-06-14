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

-- Existing installs may already have invoice_payments without this column.
ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS card_fee DECIMAL(10,2) DEFAULT 0;

-- Backfill card_fee from older alternate column names if they exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_payments'
      AND column_name = 'card_fee_amount'
  ) THEN
    EXECUTE 'UPDATE public.invoice_payments SET card_fee = COALESCE(card_fee, card_fee_amount, 0) WHERE COALESCE(card_fee, 0) = 0 AND COALESCE(card_fee_amount, 0) > 0';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_payments'
      AND column_name = 'processing_fee'
  ) THEN
    EXECUTE 'UPDATE public.invoice_payments SET card_fee = COALESCE(card_fee, processing_fee, 0) WHERE COALESCE(card_fee, 0) = 0 AND COALESCE(processing_fee, 0) > 0';
  END IF;
END $$;

-- One-time/idempotent legacy migration:
-- If an older invoice has invoice-level paid_amount but no payment rows, create
-- one real payment history row so future calculations use invoice_payments.
-- This never runs for invoices that already have payment history rows.
INSERT INTO public.invoice_payments (
  invoice_id,
  amount,
  payment_method,
  card_fee,
  notes,
  created_at,
  created_by
)
SELECT
  i.id,
  ROUND(COALESCE(i.paid_amount, 0)::numeric, 2) AS amount,
  'legacy' AS payment_method,
  0 AS card_fee,
  'Migrated from legacy invoice paid_amount' AS notes,
  COALESCE(i.paid_at, i.updated_at, i.created_at, NOW()) AS created_at,
  NULL AS created_by
FROM public.invoices i
WHERE COALESCE(i.paid_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.invoice_payments p
    WHERE p.invoice_id = i.id
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

-- Create policies that check shop access through the invoice.
-- If multi-user helpers are installed, team members use user_has_shop_access().
-- Otherwise, direct shop owners are still allowed through truck_shops.user_id.
DO $$
DECLARE
  access_condition text;
BEGIN
  IF to_regprocedure('public.user_has_shop_access(uuid,uuid)') IS NOT NULL THEN
    access_condition := '(ts.user_id::text = auth.uid()::text OR public.user_has_shop_access(auth.uid(), i.shop_id))';
  ELSE
    access_condition := 'ts.user_id::text = auth.uid()::text';
  END IF;

  EXECUTE 'CREATE POLICY invoice_payments_select ON public.invoice_payments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ' || access_condition || '
    )
  )';

  EXECUTE 'CREATE POLICY invoice_payments_insert ON public.invoice_payments FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ' || access_condition || '
    )
  )';

  EXECUTE 'CREATE POLICY invoice_payments_update ON public.invoice_payments FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ' || access_condition || '
    )
  )';

  EXECUTE 'CREATE POLICY invoice_payments_delete ON public.invoice_payments FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.truck_shops ts ON i.shop_id = ts.id
      WHERE i.id = invoice_payments.invoice_id
      AND ' || access_condition || '
    )
  )';
END $$;
