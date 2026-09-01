-- Extends invoice_balances_v with location display fields (no financial changes).
-- Run after add-invoice-shop-locations.sql

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
  COALESCE(i.apply_card_fee, false) AS apply_card_fee,
  COALESCE(i.card_fee_amount, 0)::numeric(10,2) AS card_fee_amount,
  (COALESCE(p.paid_sum, i.paid_amount, 0))::numeric(10,2) AS paid_amount,
  GREATEST(COALESCE(i.total_amount, 0) + COALESCE(i.card_fee_amount, 0) - (COALESCE(p.paid_sum, i.paid_amount, 0)), 0)::numeric(10,2) AS balance_due,
  CASE
    WHEN LOWER(TRIM(COALESCE(i.status, ''))) IN ('void', 'voided', 'cancelled', 'canceled') THEN COALESCE(i.status, 'cancelled')
    WHEN COALESCE(i.total_amount, 0) <= 0 THEN 'Draft'
    WHEN (COALESCE(i.total_amount, 0) + COALESCE(i.card_fee_amount, 0) - (COALESCE(p.paid_sum, i.paid_amount, 0))) <= 0.01 THEN 'Paid'
    WHEN (COALESCE(p.paid_sum, i.paid_amount, 0)) <= 0.01 THEN 'Unpaid'
    ELSE 'Partial'
  END AS computed_status,
  COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(i.invoice_number, ''), '[^0-9]', '', 'g'), '')::bigint, 0) AS invoice_number_numeric,
  i.location_id AS manual_location_id,
  CASE
    WHEN wo_bay.id IS NOT NULL THEN COALESCE(NULLIF(TRIM(wo_bay.bay_name), ''), 'Bay ' || wo_bay.bay_number::text)
    WHEN manual_loc.id IS NOT NULL AND manual_loc.is_active = true THEN manual_loc.name
    ELSE NULL
  END AS effective_location_name,
  CASE
    WHEN wo_bay.id IS NOT NULL THEN 'digital'
    WHEN manual_loc.id IS NOT NULL AND manual_loc.is_active = true THEN 'manual'
    ELSE NULL
  END AS effective_location_source
FROM public.invoices i
LEFT JOIN (
  SELECT
    invoice_id,
    SUM(GREATEST(COALESCE(amount, 0) - COALESCE(card_fee, 0), 0)) AS paid_sum
  FROM public.invoice_payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id
LEFT JOIN public.work_orders wo ON wo.id = i.work_order_id
LEFT JOIN public.service_bays wo_bay ON wo_bay.id = wo.bay_id
LEFT JOIN public.shop_locations manual_loc ON manual_loc.id = i.location_id;

GRANT SELECT ON public.invoice_balances_v TO authenticated;
GRANT SELECT ON public.invoice_balances_v TO service_role;

COMMENT ON VIEW public.invoice_balances_v IS 'Invoice list balances plus effective_location_name (digital bay overrides manual). Financial columns unchanged.';
