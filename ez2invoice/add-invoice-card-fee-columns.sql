-- Add card fee toggle and derived amount to invoices so fee is never doubled.
-- total_amount = subtotal + tax only; card_fee_amount = one-time 2.5% when apply_card_fee = true.
-- balance_due = total_amount + card_fee_amount - sum(payments).

-- Add columns if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'apply_card_fee') THEN
    ALTER TABLE public.invoices ADD COLUMN apply_card_fee BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'card_fee_amount') THEN
    ALTER TABLE public.invoices ADD COLUMN card_fee_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Backfill: invoices that currently have total_amount > subtotal+tax had fee baked in; move it to card_fee_amount and set total_amount = base
UPDATE public.invoices
SET
  apply_card_fee = true,
  card_fee_amount = ROUND((total_amount - (subtotal + COALESCE(tax_amount, 0)))::numeric, 2),
  total_amount = subtotal + COALESCE(tax_amount, 0)
WHERE (subtotal + COALESCE(tax_amount, 0)) < total_amount - 0.01;

-- Ensure card_fee_amount is non-negative
UPDATE public.invoices SET card_fee_amount = 0 WHERE card_fee_amount < 0;

-- Next: run create-invoice-balances-view.sql so the view uses apply_card_fee and card_fee_amount
-- and balance_due = total_amount + card_fee_amount - paid_sum.
