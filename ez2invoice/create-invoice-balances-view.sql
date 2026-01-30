-- Single source of truth for invoice balances: total_amount, paid_amount (from payments), balance_due, computed_status.
-- Use this view for Invoice List, AR tab, and Reports so calculations match everywhere.
-- RLS: view uses security_invoker (PG 15+) so RLS on invoices (and invoice_payments) applies to the caller.

DROP VIEW IF EXISTS public.invoice_balances_v;

CREATE VIEW public.invoice_balances_v
WITH (security_invoker = true)
AS
SELECT
  i.id,
  i.shop_id,
  i.customer_id,
  i.work_order_id,
  i.invoice_number,
  i.status,
  i.subtotal,
  i.tax_rate,
  i.tax_amount,
  i.total_amount,
  i.due_date,
  i.notes,
  i.created_at,
  i.updated_at,
  i.paid_at,
  -- Use sum of invoice_payments when present; fall back to invoices.paid_amount for legacy data (payments recorded before invoice_payments table or missing rows)
  (COALESCE(p.paid_sum, i.paid_amount, 0))::numeric(10,2) AS paid_amount,
  GREATEST(COALESCE(i.total_amount, 0) - (COALESCE(p.paid_sum, i.paid_amount, 0)), 0)::numeric(10,2) AS balance_due,
  CASE
    WHEN LOWER(TRIM(COALESCE(i.status, ''))) IN ('void', 'voided', 'cancelled', 'canceled') THEN COALESCE(i.status, 'cancelled')
    WHEN COALESCE(i.total_amount, 0) <= 0 THEN 'Draft'
    WHEN (COALESCE(i.total_amount, 0) - (COALESCE(p.paid_sum, i.paid_amount, 0))) <= 0.01 THEN 'Paid'
    WHEN (COALESCE(p.paid_sum, i.paid_amount, 0)) <= 0.01 THEN 'Unpaid'
    ELSE 'Partial'
  END AS computed_status
FROM public.invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS paid_sum
  FROM public.invoice_payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id;

-- Optional: include payment_terms if the column exists (run after add-payment-terms-column.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'payment_terms'
  ) THEN
    -- Recreate view with payment_terms (drop and create with extra column)
    DROP VIEW IF EXISTS public.invoice_balances_v;
    EXECUTE '
      CREATE VIEW public.invoice_balances_v WITH (security_invoker = true) AS
      SELECT
        i.id, i.shop_id, i.customer_id, i.work_order_id, i.invoice_number, i.status,
        i.subtotal, i.tax_rate, i.tax_amount, i.total_amount, i.due_date, i.notes,
        i.created_at, i.updated_at, i.paid_at, i.payment_terms,
        (COALESCE(p.paid_sum, i.paid_amount, 0))::numeric(10,2) AS paid_amount,
        GREATEST(COALESCE(i.total_amount, 0) - (COALESCE(p.paid_sum, i.paid_amount, 0)), 0)::numeric(10,2) AS balance_due,
        CASE
          WHEN LOWER(TRIM(COALESCE(i.status, ''''))) IN (''void'', ''voided'', ''cancelled'', ''canceled'') THEN COALESCE(i.status, ''cancelled'')
          WHEN COALESCE(i.total_amount, 0) <= 0 THEN ''Draft''
          WHEN (COALESCE(i.total_amount, 0) - (COALESCE(p.paid_sum, i.paid_amount, 0))) <= 0.01 THEN ''Paid''
          WHEN (COALESCE(p.paid_sum, i.paid_amount, 0)) <= 0.01 THEN ''Unpaid''
          ELSE ''Partial''
        END AS computed_status
      FROM public.invoices i
      LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid_sum FROM public.invoice_payments GROUP BY invoice_id) p ON p.invoice_id = i.id
    ';
  END IF;
END $$;

-- Grant SELECT to authenticated (same as invoices)
GRANT SELECT ON public.invoice_balances_v TO authenticated;
GRANT SELECT ON public.invoice_balances_v TO service_role;

COMMENT ON VIEW public.invoice_balances_v IS 'Invoice list with paid_amount=sum(payments) or invoices.paid_amount (legacy), balance_due, computed_status. Use for Invoice List, AR, and Reports.';
