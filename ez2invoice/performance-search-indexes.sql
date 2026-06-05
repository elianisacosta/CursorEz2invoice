-- Performance indexes for customer, part, labor, and invoice line item lookups.
-- Run this in Supabase SQL Editor. These statements are safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_customers_first_name_trgm
  ON public.customers USING gin (lower(coalesce(first_name, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_last_name_trgm
  ON public.customers USING gin (lower(coalesce(last_name, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_company_trgm
  ON public.customers USING gin (lower(coalesce(company, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
  ON public.customers USING gin (regexp_replace(coalesce(phone, ''), '\D', '', 'g') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_parts_part_name_trgm
  ON public.parts USING gin (lower(coalesce(part_name, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_parts_part_number_trgm
  ON public.parts USING gin (lower(coalesce(part_number, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_labor_items_service_name_trgm
  ON public.labor_items USING gin (lower(coalesce(service_name, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
  ON public.invoice_line_items(invoice_id);
