-- Diagnostic query to find problematic rows in fleet_discounts
-- Run this BEFORE Step 4 to see which rows are causing issues

SELECT 
  id, 
  customer_id,
  scope,
  labor_item_id,
  labor_type,
  percent_off,
  fixed_amount,
  CASE 
    WHEN percent_off IS NOT NULL AND percent_off > 0 AND (fixed_amount IS NULL OR fixed_amount = 0) THEN 'OK - percent discount'
    WHEN fixed_amount IS NOT NULL AND fixed_amount > 0 AND (percent_off IS NULL OR percent_off = 0) THEN 'OK - fixed discount'
    WHEN percent_off IS NOT NULL AND percent_off > 0 AND fixed_amount IS NOT NULL AND fixed_amount > 0 THEN 'PROBLEM - both set'
    WHEN (percent_off IS NULL OR percent_off = 0) AND (fixed_amount IS NULL OR fixed_amount = 0) THEN 'PROBLEM - neither set'
    ELSE 'PROBLEM - unknown'
  END as status
FROM public.fleet_discounts
ORDER BY status, id;

-- Count of problematic rows
SELECT 
  COUNT(*) as problematic_count
FROM public.fleet_discounts
WHERE NOT (
  (percent_off IS NOT NULL AND percent_off > 0 AND (fixed_amount IS NULL OR fixed_amount = 0)) OR 
  (fixed_amount IS NOT NULL AND fixed_amount > 0 AND (percent_off IS NULL OR percent_off = 0))
);

